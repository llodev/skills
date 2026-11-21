# pm-tasks-clickup — ClickUp adapter for the pm-tasks family

Date: 2026-11-20. Status: approved by the maintainer on 2026-11-20 and implemented in `@llodev/pm-tasks-clickup` v1.0.0 (nine verbs; `task.sprint.set` deferred, §2); D1 resolved as D1-b (§12). The spike results are in §14 and the outcome in §15. Planning amendments A1–A4 (implementation plan) are folded into §4 and §9.

Calls the author made without asking are tagged **(call)**. Everything else is either a verified fact (§3) or something the maintainer stated.

## 1. Intent

Complete the `pm-tasks-*` family with ClickUp, implemented on the shared core (`@llodev/pm-tasks-core`) and the same pattern as the Linear/Jira adapters: typed transport, `init`, `doctor`, manifest, `SKILL.md`, references, i18n, tests.

The adapter must work for **any** operating model, because the family serves all of them:

- a manager publishing plans as tasks;
- a team member publishing tasks, or executing them in autonomous mode with an AI agent;
- an agent running on its own dedicated account (the maintainer's preference, not a requirement).

Therefore the adapter never assumes who the authenticated MCP user is. `"me"` means whoever is authenticated. Nothing in config, docs or code may branch on "human vs agent account".

## 2. Goals, non-goals, anti-goals

**Goals**

- G1. Implement nine canonical verbs (the base seven plus `task.parent.set` and `task.estimate.set`, §4) on ClickUp's native model: per-list statuses with types, native `time_estimate`, tags, priority, multi-assignee, nested subtasks.
- G2. Efficient: no discovery calls at runtime (statuses and list ids are pinned in config at `init`); dedicated tools for single-task verbs; the bulk operator only where it removes N round trips (§6).
- G3. Conformance before promotion (roadmap §4 gate): request-key guard in the test transport **and** response fixtures captured from the live MCP **and** a documented live smoke.
- G4. Family parity: same package layout, three locales (en-US, pt-BR, es-ES), localized READMEs, autonomous overlay, doctor checks, marketplace + meta-package wiring.

**Non-goals (v1.0.0)**

- Writing custom fields, task types, docs, chat, views, forms, status administration.
- Time tracking (`task.time.log`, roadmap F5) and dependencies (`task.blocks.add`, F6): both need a core minor release and are bundled with a later pull, not this one.
- Native ClickUp checklists: the MCP can read them (`clickup_get_task include: ["checklists"]`) but exposes **no tool or operator that creates or toggles them**.
- A REST/token path for the **runtime verbs**: the transport is MCP-only in every adapter. `init`/`doctor` additionally get a read-only standalone token path (decision D1-b, §12).
- Publishing to more than one workspace per run.
- Detaching a subtask from its parent (the MCP refuses; §4 `task.parent.set`).
- **Deferred: `task.sprint.set`.** A sprint would be a second list, and `clickup_add_task_to_list` failed live with a plan-limit error (§14 U4), so the verb could not be demonstrated and is not in the v1.0.0 manifest (§10 rule). It can ship in a later minor once an account with _Tasks in Multiple Lists_ verifies adding and removing list membership.

**Anti-goals (a technically working adapter that is still a failure)**

- A Trello clone with renamed calls: hard-coding status names, ignoring per-list status sets, or requiring English status names.
- A write that lands but is reported `ok: false` (the Trello v1.10.1 bug class), leaving orphan tasks and a wrong audit trail.
- Weakening the family's autonomous contract: the adapter documents and validates `allow` / `scope` exactly like the others (runtime enforcement is the core-level gap C2, not solved here).
- Any deletion/archive/rename path in the adapter (forbidden verbs in autonomous mode).

## 3. Verified facts about the ClickUp MCP

Source: tool schemas and one read-only session against a real workspace (2026-11-20). Response shapes of **write** calls were captured later in spike U2 (§14): writes return an envelope, not a task.

**Hierarchy.** Workspace → Space → Folder (optional) → List → Task → Subtask (nested, multi-level). `clickup_get_workspace_hierarchy` returns spaces/folders/lists (`max_depth` 0–2). Work happens in Lists; the "columns" of a board are **statuses defined per list** (inherited from folder/space).

**Statuses carry a type.** `clickup_get_list` returns `statuses[]` with `type` ∈ `open | custom | done | closed` (exactly one `open` and one `closed` per set; `done` is optional). Observed set: `to do` (open), `planning`, `in progress`, `at risk`, `update required`, `on hold` (custom), `complete` (done), `cancelled` (closed). Consequences: `open` and `done` resolve by type, but there is **no type for "in progress"** — several custom statuses compete — and the `closed` type may be a cancellation state, not a success state.

**Dedicated tools used by this design** (parameter names to be copied verbatim):

| Tool                                                                                                                                                                              | Relevant params                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clickup_create_task`                                                                                                                                                             | `name`, `list_id` (required); `markdown_description`, `assignees[]`, `tags[]` (auto-created, lowercased), `priority` (`urgent\|high\|normal\|low`), `due_date`/`start_date` (`YYYY-MM-DD[ HH:MM]`), `time_estimate` (minutes, string), `parent`, `status`, `workspace_id` |
| `clickup_update_task`                                                                                                                                                             | `task_id`; same fields; `due_date`/`start_date`/`priority` accept `'none'` to clear; `parent`; `status` (must exist in the task's list); `watchers {add, rem}`                                                                                                            |
| `clickup_move_task`                                                                                                                                                               | `task_id`, `list_id`; **root tasks only**; the current status must exist in the destination list                                                                                                                                                                          |
| `clickup_add_task_to_list` / `clickup_remove_task_from_list`                                                                                                                      | additional-list membership; needs the _Tasks in Multiple Lists_ ClickApp; not used in v1.0.0 (§14 U4)                                                                                                                                                                     |
| `clickup_create_comment`                                                                                                                                                          | `entity_type` (`task`), `entity_id`, `comment_text` (markdown, ≤40000), `reply_to_id`. `clickup_create_task_comment` is **deprecated** — do not use                                                                                                                       |
| `clickup_get_task_comments`                                                                                                                                                       | `task_id`, pagination `start`/`start_id`                                                                                                                                                                                                                                  |
| `clickup_add_tag_to_task` / `clickup_remove_tag_from_task`                                                                                                                        | tag must already exist in the space (`clickup_create_space_tag` first)                                                                                                                                                                                                    |
| `clickup_get_task`                                                                                                                                                                | compact by default; `include` ∈ attachments, checklists, custom_fields, dependencies, description, git_links, linked_tasks, subtasks, watchers; `expand_statuses`                                                                                                         |
| `clickup_get_list`, `clickup_get_workspace_hierarchy`, `clickup_get_workspace_members`, `clickup_get_user`, `clickup_resolve_assignees`, `clickup_filter_tasks`, `clickup_search` | discovery / lookup                                                                                                                                                                                                                                                        |

**Operators** (via `clickup_execute_operator`; always call `clickup_get_operators` first): `task.create_many` (single `list_id`; each task takes `parent`, `status`, numeric `assignee_ids`, `description` as **plain text/Quill — not markdown**, `time_estimate` in **milliseconds**; response is `tasks[]` in request order where an element **may be `null`**), `task.update_many` (`assignee_changes {add, rem}` is additive by default; `time_estimate` requires `time_estimate_string`), `task.get_many`. Operators take numeric ids only and do not resolve names/emails.

**Identity resolution is server-side.** Dedicated tools accept `"me"`, emails, usernames, display names and ids for assignees/watchers; ambiguous names fail closed and write nothing. Relative dates must be computed from `clickup_get_user.current_time` (account timezone). The adapter receives ISO dates from the plan, so only agent-side relative phrasing is affected.

## 4. Verb mapping

Every verb returns the core result envelope. `ref.url` is the ClickUp task URL, `https://app.clickup.com/t/<task_id>` (§14 U6). Writes return an envelope, not a task: `{success, task_id, custom_id, task_url}`, and `move_task` returns `new_list_id` instead of a URL (§14 U2). The transport takes ids and URLs from the envelope and reads a task's state only through a compact `clickup_get_task`. A thrown error and a resolved `{"error": "<text>"}` are handled alike.

| Verb                | ClickUp calls                                                                          | Decisions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | `clickup_create_task`                                                                  | `boardOrProjectId` = list id; `listOrSectionId` = initial status **name** (omitted → list default; role words are not resolved here). `labels`→`tags` (stored lowercased), `priority`→native priority (`medium`→`normal`, an unknown value is dropped), `dueDate`→`due_date` (`YYYY-MM-DD`), `description`→`markdown_description`. `clientToken` embedded as a `[ct:<token>]` footer in the description. One call: no estimate at create time (it goes through `task.estimate.set`), and the duplicate lookup is SKILL-level (Idempotency below, A4).                                                                                                                                                                                                                                                                  |
| `task.move`         | `clickup_get_task` → `clickup_update_task {status}` or `clickup_move_task`             | **(call)** `open`/`wip`/`done` → status name pinned in `config.lists[].statuses` for the task's home list. A numeric id string (`^\d{6,}$`) is a destination **list id** → `clickup_move_task` (root tasks only; a subtask returns `INVALID_REQUEST {reason: "subtask_cannot_move"}`); the new list id is returned as `newListOrSectionId`. No-op (`ALREADY_IN_STATE`) when the current status or list already matches.                                                                                                                                                                                                                                                                                                                                                                                                |
| `checklist.check`   | `clickup_get_task` → `clickup_update_task {status}`                                    | **(call)** Checklist items are **subtasks** (the MCP cannot write native checklists). `checklistId` = parent task id, `itemId` = subtask id (`not_a_checklist_item` when its parent differs); `complete` → the list's pinned `done` status, `incomplete` → `open`. Same model as Linear sub-issues.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `task.close`        | `clickup_get_task` → `clickup_update_task {status}`                                    | **(call)** Target = the pinned `done` role (`init` pins the `done`-type status, else the `closed`-type one). Never by name. A task already at the pinned `done` **or** the pinned `closed` status → `{closed: true}` with no write, so a cancelled task is not turned into a done one. Closing a parent with open subtasks succeeds and leaves them open (§14 U5).                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `task.due-date.set` | `clickup_get_task` (+ `clickup_get_user`) → `clickup_update_task {due_date}`           | `YYYY-MM-DD` only; clearing is not supported (`invalid_due_date`). A date-only value is stored at 04:00 local time of the account (§14 U7), so the no-op check converts the stored instant to a local date with the `utc_offset` of `clickup_get_user`, read only when a due date is stored and cached on success; without a readable offset the transport writes. The plan due date is never overwritten on close (Lifecycle below).                                                                                                                                                                                                                                                                                                                                                                                  |
| `task.assignee.add` | (`clickup_resolve_assignees`) → `clickup_get_task` → `clickup_update_task {assignees}` | v1 never removes. `assignees` **replaces** the set (§14 U1), so the transport writes the union of the current assignees and the new id. A non-numeric `userId` (`"me"`, an email, a username) is first resolved to exactly one id, else `INVALID_REQUEST {reason: "assignee_unresolved"}`. Already assigned → `{added: false}` with no write.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `task.comment.add`  | (`clickup_get_task_comments`) → `clickup_create_comment`                               | `[ct:<token>]` prefix. With a token, the first comments page is scanned and a comment already carrying the marker is returned instead of posting again (comments keep the marker verbatim, §14 U2). The attribution prefix is added by the agent from core `getAttribution()`; the transport sends the text verbatim.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `task.parent.set`   | `clickup_get_task` → `clickup_update_task {parent}`                                    | The server moves the task into the parent's list; the response type has no field for that list, so `references/operations.md` documents it instead (A1). **Detach (empty or missing `parentId`) is not possible** through this MCP → `NOT_APPLICABLE {reason: "detach_unsupported"}`; a task as its own parent → `self_parent`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `task.estimate.set` | `clickup_get_task` → `clickup_update_task {time_estimate}` + tag tools                 | **(call)** Adapter-local config `estimation.clickupTarget: "time" \| "none"` (Linear precedent: its own `linearTarget`, cast to `Transport`; core's `jiraTarget` naming is not refactored here). Time-based strategies (`ideal_hours`, `ideal_days`) → native `time_estimate` in minutes (`ideal_days` × `hoursPerDay`, default 6 to match the core's focused day), written **only on a leaf task** (`subtasks_count === 0`, §14 U3). Point-based strategies → `est:<slug>` tag only. The `est:<slug>` tag is always set (human-readable original), as replace-set: remove the other `est:*` tags, ensure the tag in the space, add it; what the task already holds is not written again. `NOT_APPLICABLE` when the `estimation` block is absent or `enabled` is false. A failure after a write is partial (A3, §9.4). |

**Status verbs and unconfigured lists.** **(call)** `task.move`, `task.close` and `checklist.check` receive only a task id. They read the task's home list (compact `get_task`) and look it up in `config.lists`. A list that is not configured (a hand-made task elsewhere, a move to another list, a `task.parent.set` that relocated the task) fails closed with `INVALID_REQUEST {reason: "list_not_configured", listId}` and a hint to register the list via `init`; a role with no pinned status fails with `role_not_configured`. A pinned status that ClickUp rejects (renamed or removed after `init`) fails with `status_rejected` (§14 U12), and the doctor's C-CLK-8 names the list and role. No live status lookup in v1.0.0 (keeps G2); a type-based live fallback for `open`/`done` is a possible later enhancement. **(A1)** `task.move` to a list id reports the new list in `newListOrSectionId`; `task.parent.set` cannot report the list it relocates the task to, because `TaskParentSetResponse` has no such field and core is unchanged.

**Modes.** **(call)** The same four as Linear: paste-ready (no MCP), MCP publish, autonomous, plan-execution (Phase 7). Paste-ready renders checklist items as a markdown task list in the description (it round-trips verbatim, §14 U10); MCP publish creates one subtask per item. The plan-execution lister is an agent procedure in `SKILL.md`: it scans `autonomous.scope.lists` when set, otherwise all `config.lists`, via `clickup_filter_tasks {list_ids, subtasks: false, statuses: [<every open- and custom-type status name of those lists>]}`, following `next_page` while `has_more` is true. The names are read at the start of each discovery with one `clickup_get_list` per list; a `done`- or `closed`-type name is never passed. `include_closed: false` does **not** drop `done`-type tasks (§14 U10), so the status filter carries every status whose type is not `done` or `closed`. Filtering on the pinned open and wip names alone would miss tasks parked in another custom status (`on hold`, `planning`, `at risk`): `discoverPlanTasks` would report them `missing` and the agent would create them twice. Subtasks are checklist items, not top-level work.

**Lifecycle fidelity** (core `lifecycle-fidelity.md`). **(call)** Start: the transport's `taskMove` writes only the status. Stamping `start_date` = today after a move to `wip` is SKILL-level guidance for the agent, as in Asana and Linear, because core calls it interpretive (A2); writing `start_date` alone leaves `due_date` unchanged (§14 U7). Close: `due_date` stays = plan. ClickUp leaves `date_closed` null for a `done`-type status (§14 U5), so completion is read from the status. No plan-stashing footer.

**Idempotency.** `task.create` and `task.comment.add` use `[ct:<token>]`. The create lookup is SKILL-level, as in Linear (A4): `clickup_search {keywords: "ct:<token>"}` finds the marker (descriptions store the brackets escaped, `\[ct:…\]`), confirmed with the `text_content` of `clickup_get_task`; the transport only embeds the marker. The comment lookup is in the transport (first page of `clickup_get_task_comments`). Both are documented in `references/operations.md` and `SKILL.md`.

**Autonomous mode.** Same contract as the other adapters. `autonomous.scope.lists` restricts writes to listed list ids; `allow ⊆ manifest.verbs` (doctor C-CFG-2); **(call)** the transport does not enforce scope: it cannot know whether autonomous mode is active, and a per-write `get_task` read would break G2. `allow`/`scope` are validated by doctor (shape; scope ids declared in `lists`, C-CLK-6) and enforced by the SKILL contract, as in the other adapters; the runtime gap (roadmap C2) stays a core-level issue. The §9.5 test therefore targets doctor + the overlay contract, not transport rejection. `defaults.escalateToAlias` is applied with `task.assignee.add` (union write), as core's autonomous contract does; the transport has no watcher path.

## 5. Config (`.clickup.json`)

```jsonc
{
  "version": "1",
  "locale": "pt-BR",
  "workspace": { "id": "9013...", "name": "Workspace" },
  "lists": [
    {
      "id": "9013...",
      "name": "Backlog",
      "space": "Space 1",
      "statuses": {
        "open": "to do",
        "wip": "in progress",
        "done": "complete",
        "closed": "cancelled",
      },
    },
  ],
  "defaultListId": "9013...",
  "members": [{ "id": "302...", "name": "…", "email": "…", "alias": "…" }], // optional cache
  "estimation": {
    "enabled": true,
    "strategy": "ideal_hours",
    "clickupTarget": "time",
    "hoursPerDay": 6,
  },
  "defaults": { "assigneeAlias": "me", "escalateToAlias": "…" },
  "autonomous": {
    "enabled": false,
    "allow": [],
    "scope": { "lists": [] },
    "rateLimit": {},
    "auditLog": "…",
  },
  "attribution": { "enabled": false },
}
```

**(call)** Statuses are pinned **per list** because status sets differ per list. `init` maps `open` (lowest `open`-type), `done` (lowest `done`-type, else `closed`-type) and `closed` (the `closed`-type when it is not the `done` one) automatically, by type and `orderindex`, and **asks the user to pick `wip`** among the custom statuses (or leave it unset). A list with no `open` or no `done`/`closed` status is skipped. `lists[]` entries may also carry `folder`. `members` is an optional cache (`init` writes a unique alias per member): the transport resolves ids, `"me"`, emails and usernames through `clickup_resolve_assignees` and fails closed; it does not resolve aliases, so the agent maps an alias to `members[].id` first. `defaults.assigneeAlias` / `escalateToAlias` must be `"me"` or a member alias (core C-CFG-4, C-CLK-6). Schema facts: `version`, `workspace` and `lists` are required; `init` writes `autonomous.enabled: false`; `attribution` is the core block, off unless enabled; `estimation` is optional, and without it `task.estimate.set` is `NOT_APPLICABLE`. The token is never stored in the config.

**Doctor** (`pm-tasks-clickup init --doctor`): core's shared checks C-FS/C-CFG/C-LANG-1, then the adapter checks. C-CLK-5 is not used (it was the sprint-list check).

| Check   | Severity | What it checks                                                                              |
| ------- | -------- | ------------------------------------------------------------------------------------------- |
| C-CLK-1 | error    | Config present and parseable                                                                |
| C-CLK-2 | error    | `workspace.id` present                                                                      |
| C-CLK-3 | error    | Every list pins `open` and `done`                                                           |
| C-CLK-4 | warn     | Estimation coherent (`hoursPerDay` 1–24; a `time` target on a point strategy)               |
| C-CLK-6 | warn     | `autonomous.scope.lists` ids are in `lists[]`; default aliases are `"me"` or a member alias |
| C-CLK-7 | warn     | Live: the configured workspace is among the token's workspaces (`GET /team`)                |
| C-CLK-8 | error    | Live: every pinned status still exists in its list (`GET /list/{id}`, drift detection)      |

The live checks need `CLICKUP_API_TOKEN`: with it, the doctor runs them through the read-only REST path; without it they are skipped with an advisory message, like C-TRL/C-ASN. The shipped CLI has no MCP probe path (the probe seam of `runDoctor` is for tests and is not exported), so an agent in a session without the token compares each list's pinned statuses with `clickup_get_list` itself (`SKILL.md`, Init step 5). C-CLK-8 probes each distinct list once and skips itself when C-CLK-7 failed. ClickUp answers 401, not 404, for any list id the token cannot read, including ids that do not exist (§14 U11). Because C-CLK-7 passed in the same run, the token and workspace are proven good, so a 401/403 on a list is reported for that list only (`doctorListInaccessible`: deleted, moved, or access lost; remove it from `lists[]` or re-run `init`) and the loop goes on, so drift in later lists is still reported. Only a RATE_LIMIT answer stops the loop and reports how many lists were not checked; any other error is reported for its list and the loop goes on.

## 6. Efficiency design

- Zero discovery at runtime: list ids and status names come from config. The only other runtime lookups are `clickup_get_user` (the account's `utc_offset`, only when a due date is stored, cached per transport) and `clickup_resolve_assignees` (only for a non-numeric assignee).
- Single-task verbs use dedicated tools (server-side resolution, markdown, status validation).
- Reads are minimal: one compact `clickup_get_task` for idempotency/state; no `include` unless needed.
- v1.0.0 creates checklist items one subtask per `clickup_create_task` call, an agent procedure in `SKILL.md` (no transport code). A later release may add the batch verb in §8, which turns a phase card plus N items into **2 calls** instead of N+1.

## 7. Approaches considered

- **A — dedicated tools only (Linear-shaped).** Lowest risk, but N+1 calls per phase card for checklists.
- **B — operators only (`execute_operator` for everything).** Fewest calls, but operators are numeric-id-only, plain-text descriptions, "legacy monolith" endpoints with larger/unstable responses; no name/email resolution; weakest conformance story.
- **C — hybrid, staged (picked).** Dedicated tools for the canonical verbs; `task.create_many` only for checklist-as-subtasks, shipped as a separate release so the conformance evidence (null elements, plain-text descriptions) is gathered before it is depended on. v1.0.0 shipped the dedicated-tool half. U9 then showed the operator is sequential and stops at the first failure without a usable partial result (§14), which the batch verb must handle.

## 8. Release and repository wiring

**v1.0.0** (branch `pmt-clickup-v1.0.0`, one changeset, one PR; title `feat(release): clickup v1.0.0 — ClickUp adapter`):

- Replace the scaffold in `skills/pm-tasks-clickup`: drop `private` and `status: scaffold`, rewrite `SKILL.md`/`README.md`, version 0.0.0 → 1.0.0 set directly in `package.json` (Linear precedent); the only changeset is the meta package's minor.
- Package files mirror `pm-tasks-linear`: `manifest.json`, `schemas/config.json`, `src/{adapter,transport-clickup,init-flow,init-api,doctor-cli,env,envelope,errors,estimation,status,status-map,index,bin/init}.ts`, `tests/`, `i18n/{en-US,pt-BR,es-ES}.json`, `references/{operations,estimation,autonomous}.md`, `anti-patterns/clickup.md`, `docs/i18n/README.*`, `CHANGELOG.md` (generated by the first changeset that targets the package; absent at 1.0.0).
- Repo wiring: `.claude-plugin/marketplace.json`, `packages/pm-tasks` (add dependency; meta minor bump), root `README.md` (+ i18n) scaffold counts, `docs/roadmap.md` (remove S3, update counts per its own rule), `Makefile` (`init-clickup`), `package.json` size-limit entry (26 kB: measured 23.71 kB plus about 10%), `scripts/checks/validate-locale-parity.mjs`, `scripts/checks/tarball-snapshot.test.mjs`, `scripts/snapshots/{skill-judge-baseline,skill-judge-golden,tarball-snapshot}.json`, `scripts/checks/canary-version.test.mjs` (one `includes` assertion). `.github/CODEOWNERS` needs no change: its per-adapter lines are commented placeholders.
- **No `pm-tasks-core` change expected.** No contract edit, so no core release.
- **First-publish gate (repo rule).** `npm view @llodev/pm-tasks-clickup` is E404. The maintainer must publish once locally and configure the trusted publisher (and the canary trusted publisher, because a non-private `pm-tasks-*` package joins the canary list automatically) **before merge**; the agent prints the commands and does not run `npm publish`.

**Follow-up (separate PR/release, not scheduled; roadmap F13c):** custom verb `clickup.task.batch-create-with-subtasks` (namespaced with the manifest `tool`; must appear literally in `SKILL.md`) built on `task.create_many`.

**Later, needs a core minor (not scheduled):** `task.time.log` (F5), `task.blocks.add` (F6).

## 9. Pre-mortem: behaviors that must have tests

1. **State transitions.** Estimation enable → disable → re-enable and editing after the toggle (`est:*` replace-set leaves exactly one tag); `autonomous.enabled` toggled mid-session.
2. **Status resolution.** List with no `done` type (falls back to `closed`); list whose pinned status was renamed/removed (doctor drift + runtime `INVALID_REQUEST {reason: "status_rejected"}`, never a silent skip); localized status names; `wip` not configured (`role_not_configured`).
3. **Concurrency.** As built, ClickUp offers no conditional update, so read-then-write races (two parallel `task.comment.add` with the same token, concurrent estimate replace-sets, concurrent union writes of assignees) are not guarded; `SKILL.md` lists this as a known limitation. Subtask creation is an agent procedure, with no transport code to test. The tested concurrency case is the shared in-flight `clickup_get_user` read.
4. **Side effects before vs after commit (A3).** `task.create` is a single call, so only `task.estimate.set` can fail after a write: it returns `ok: false`, `code: "MCP_ERROR"`, `details: {partial: true, applied: [...], failedStep}` (an auth or rate-limit failure keeps its own code), never a silent success; response types have no warnings field. Response unwrapping accepts both the write envelope and the bare task (Trello v1.10.1), and a partial task read fails closed as a shape error.
5. **Permission combinations.** `allow` ⊄ `manifest.verbs`; verb allowed but list outside `scope`; read-only/limited accounts (write returns an MCP error → `MCP_ERROR`/`AUTH_ERROR`, not a crash); `"me"` resolving to a human or an agent account identically.
6. **Config defaults and flags.** Check the real default of every flag in `schemas/config.json` (not the one assumed here).
7. **What the change removes.** The scaffold markers (`private`, `status: scaffold`, "DO NOT ACTIVATE"), the scaffold count in READMEs, the S3 roadmap row — each with a check that nothing still points at the scaffold.
8. **Request guard.** The test transport rejects unknown MCP keys (`additionalProperties: false` is real on these tools), including the deprecated `clickup_create_task_comment` name.

## 10. Live verification spikes (gate before promotion)

Writes require a **dedicated sandbox list** the maintainer designates; created tasks are deleted afterwards with explicit confirmation per action.

**Order and failure rules (call).** Spikes run **first** (plan Task 0), with the maintainer present to name the sandbox list. A verb whose spike cannot demonstrate it live is **removed from the v1.0.0 manifest** and shipped in a later minor — never shipped unverified. Fallbacks: U1 has both branches specified above. U2: if no reliable `[ct:]` lookup exists, `task.create` idempotency falls back to the audit-log token match and the limitation is documented (not a release blocker). U4: if memberships are not exposed, sprint becomes add-only (documented); if `add_task_to_list` cannot be demonstrated, the verb is dropped (9 verbs).

**Status: all spikes ran on 2026-11-20** (plan Tasks 0a and 0b, U11 first); results and fixtures are in §14. The U4 drop rule fired: `task.sprint.set` is deferred (§2).

- **U1** `update_task.assignees`: add or replace? Decides the `task.assignee.add` implementation. **Done:** replaces; the transport writes the union (§14 U1).
- **U2** Capture the verbatim response of every write call used (create/update/move/comment/tag/add-to-list/remove-from-list and `create_many`) as test fixtures; confirm whether the envelope is wrapped (Trello bug class) and the exact idempotency lookup that works. **Done:** writes return an envelope, `[ct:]` lookup via `clickup_search`; add/remove-to-list could not be demonstrated, only the plan-limit error (§14 U2, U4).
- **U3** Does a parent's `time_estimate` roll up with its subtasks' (double counting, the Asana v1.11 lesson)? Decides whether the estimate is leaf-only. **Done:** the field does not roll up but views do; leaf-only (§14 U3).
- **U4** Does `get_task` expose all list memberships (needed for sprint "last write wins")? Behavior when _Tasks in Multiple Lists_ is off. **Done:** home list only, and `add_task_to_list` hit a plan limit; verb deferred (§14 U4).
- **U5** Close behavior with open subtasks and with required custom fields (`check_required_custom_fields`). **Done** for open subtasks: the close succeeds and leaves them open (§14 U5); required custom fields were not exercised.
- **U6** Task URL shape and custom-id (`DEV-1234`) handling in `ref`. **Done:** `https://app.clickup.com/t/<task_id>`; custom ids were null, so they are not supported (§14 U6).
- **U7** Date-only `due_date` round trip in the account timezone; whether `start_date` writes require re-sending `due_date`; whether the completion timestamp is auto-stamped on a `done`/`closed` status. **Done:** stored at 04:00 local; `start_date` alone keeps `due_date`; `date_closed` stays null for a `done`-type status (§14 U5, U7).
- **U8** `clickup_create_space_tag` when the tag already exists; tag-case behavior on `est:<slug>`. **Done:** lowercased, `created: false` on repeat, removal ignores case (§14 U8).
- **U9** `task.create_many`: null elements, ordering, partial failure (input for the batch verb). **Done:** sequential, stops at the first failure without a usable partial result (§14 U9).
- **U11** REST discovery (read-only, needs `CLICKUP_API_TOKEN`; no sandbox needed): the `Authorization` header form for a personal token, and the verbatim response shapes of the workspace, space, folder, folderless-list, folder-list, list (statuses with `type`) and member endpoints. They become the `init` test fixtures and the doctor probe fixtures. This is the first spike to run: it is read-only. **Done:** raw token header, shapes and fixtures in §14 U11.
- **U10** A markdown task list in `markdown_description` renders as checkable items (paste-ready format); `clickup_filter_tasks` pagination and exclusion of done/closed statuses (plan-execution lister). **Done:** the task list round-trips; `include_closed: false` keeps done-type tasks, so the lister filters by status; pagination was never exercised (§14 U10).
- **U12** (added during execution) `update_task` with a status the list lacks. **Done:** `Status does not exist` → `status_rejected` (§14 U12).

## 11. Gates

`make validate`; package tests + type-check + lint; `size-limit` budget for the new package; published-content lint (no repo-internal links in shipped files); i18n parity (three locales); `contract-check` (manifest verbs literally present in `SKILL.md`); skill-judge baseline updated for the new `SKILL.md`; doctor passes against a real config; live smoke (§10): the spike record in §14 with its fixtures, plus the token-gated read-only `tests/init.smoke.test.ts`. The published references state the resulting behavior; they cannot link this repo-internal record.

## 12. Decision D1 (maintainer)

**Resolved: D1-b.** The maintainer generated a ClickUp API token to test `init` (their words: "eu já gerei um token de api para podermos testar o init"). The author read this as choosing family parity; the maintainer confirmed it by approving this document, and v1.0.0 implements it. The token is read from `CLICKUP_API_TOKEN`, is never stored in config, never logged, never committed, and never pasted into a chat or an issue. The standalone path is **read-only discovery** (workspaces, spaces, folders, lists, list statuses, members); runtime verbs stay MCP-only. REST shapes are captured in spike U11.

**D1 — how do `init` and `doctor` reach ClickUp?** A Node CLI cannot call the agent's MCP tools. Linear and Jira ship `init` with two paths: an MCP path used only when a caller injects an `mcp` dispatcher (the CLI shim never does) and a standalone token path (`LINEAR_API_KEY`, `ATLASSIAN_API_TOKEN`). Their doctor live probes degrade to a skip when no probe is injected.

- **D1-a — MCP-driven (recommended).** `init-flow` takes an injected `mcp` dispatcher, driven from the agent session (`get_workspace_hierarchy`, `get_list`, `get_workspace_members`). No token path. Everything is verifiable live now; one credential (the MCP's OAuth) to manage. Cost: `make init-clickup` / a bare terminal cannot run `init`, and the live drift check in doctor only runs inside a session (same degradation as Linear's C-LIN-7).
- **D1-b — family parity.** D1-a plus a read-only REST discovery path with `CLICKUP_API_TOKEN` for terminal use. Cost: a second credential, a second set of endpoints that cannot be live-verified through the MCP, more tests and docs.

Both paths ship: `init` uses an injected `mcp` dispatcher in-session (D1-a) and the token path in a terminal (D1-b), as `init-flow.ts` in Linear does.

## 13. Left to the builder

Exact file/module split inside `src/`; test layout; i18n key names; the concurrency cap for subtask creation; wording of `SKILL.md`/references (follow the Linear adapter's structure); the `anti-patterns/clickup.md` content, derived from what the spikes reveal.

## 14. Spike results

### U11

REST discovery, read-only, run 2026-11-20 against the maintainer's workspace (one space, one folderless list, no folders). Sanitized fixtures: `skills/pm-tasks-clickup/tests/fixtures/rest/{workspaces,spaces,folders,folderless-lists,list}.json` (`workspaces.json` is the `/team` response). `folders.populated.json` and `folder-lists.json` were captured later (Task 0b) from a sandbox folder with two lists: `GET /space/{id}/folder` then lists `folders[]` with an inline `lists[]` plus `hidden`, `override_statuses`, `permission_level`, `task_count`, `space`; `GET /folder/{id}/list` returns `{lists: [...]}` with the same list fields as folderless lists and a non-hidden `folder` object (`hidden: false`).

**Base URL and auth.** Base URL `https://api.clickup.com/api/v2`. A personal token is sent as `Authorization: <token>`: the raw token value, with no `Bearer` prefix. It worked on the first call, so the `Bearer` form was not tried. An invalid token on `GET /team` returns HTTP 401 with body `{"err": "Oauth token not found", "ECODE": "OAUTH_019"}`.

| Call                                          | HTTP | Result                                                                              |
| --------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| `GET /team`                                   | 200  | `{teams: [...]}`, members inline                                                    |
| `GET /team/{team_id}/space`                   | 200  | `{spaces: [...]}`                                                                   |
| `GET /space/{space_id}/folder`                | 200  | `{folders: []}` (no folder in this workspace)                                       |
| `GET /space/{space_id}/list`                  | 200  | `{lists: [...]}` (folderless lists)                                                 |
| `GET /list/{list_id}`                         | 200  | list object with `statuses[]`                                                       |
| `GET /folder/{folder_id}/list`                | 200  | `{lists: [...]}` (captured later, Task 0b)                                          |
| `GET /team/{team_id}/space?archived=true`     | 200  | `{spaces: []}`                                                                      |
| `GET /space/{space_id}/folder?archived=true`  | 200  | `{folders: []}`                                                                     |
| `GET /space/{space_id}/list?archived=true`    | 200  | `{lists: []}`                                                                       |
| `GET /team` with an invalid token             | 401  | `OAUTH_019`                                                                         |
| `GET /list/{id}`, an id the token cannot read | 401  | not 404; status code only, observed in the release task (ids `1` and `99999999999`) |

**Unreadable lists.** Observed live in the release task with the maintainer's working token (status codes only): `GET /list/{id}` answered HTTP 401, never 404, for list ids the token cannot read, including ids that do not exist (`1`, `99999999999`). A deleted or moved list, or one the account lost access to, is expected to answer the same (not observed). So a 401 on a list read does not prove a bad token: the doctor's C-CLK-8 relies on C-CLK-7 having passed in the same run and reports such a list per list (§5).

**Workspaces and members.** API v2 calls a workspace a "team": the workspace id is `teams[].id`. `/team` returns `teams[]` with `id` (digit string), `name`, `color`, `avatar` and `members[]`, so no separate member call is needed for `init`. A member entry is `{user, invited_by?}`. `invited_by` is absent for the owner. `user` fields: `id` (a **number**, unlike every other id, which is a digit string), `username`, `email`, `color`, `profilePicture`, `initials`, `role` (number; 1 = owner, 3 = member observed), `role_subtype`, `role_key` (`owner`, `member`), `custom_role`, `last_active`, `date_joined`, `date_invited` (epoch-millisecond strings). `invited_by` fields: `id`, `username`, `color`, `email`, `initials`, `profilePicture`, `banned_date`, `status`.

**Spaces.** `spaces[]` items: `id`, `name`, `color`, `private`, `avatar`, `admin_can_manage`, `statuses[]` (`id`, `status`, `type`, `orderindex`, `color`), `multiple_assignees`, `features`, `archived`. `features` keys: `due_dates`, `sprints`, `time_tracking`, `points`, `custom_items`, `priorities` (with `priorities[]` of `{color, id, orderindex, priority}`, ids `"1"`–`"4"` = `urgent`, `high`, `normal`, `low`), `tags`, `time_estimates`, `check_unresolved`, `milestones`, `custom_fields`, `remap_dependencies`, `dependency_warning`, `status_pies`, `multiple_assignees`, `emails`, `scheduler_enabled`, `dependency_type_enabled`, `remap_dependency_settings`, `reschedule_closed_dependencies`. Observed values relevant to later spikes: `sprints.enabled` false, `time_estimates.rollup` true (U3), `time_tracking.rollup` true.

**Lists.** Folderless list items: `id`, `name`, `orderindex`, `content`, `status`, `priority`, `assignee`, `task_count` (number), `due_date`, `start_date`, `folder`, `space` (`{id, name, archived, access}`), `archived`, `override_statuses`, `permission_level`. A folderless list still carries a `folder` object: ClickUp's hidden container, `{id, name: "hidden", hidden: true, archived, access}`, with its own id. `init` must not show it as a user folder. `GET /list/{id}` returns the same fields minus `status`, plus `deleted` and `statuses[]`. The list items from `/space/{id}/list` carry no statuses, so statuses need one `GET /list/{id}` per list.

**Statuses (`GET /list/{id}`).** `statuses[]` items: `id`, `status` (name), `orderindex`, `color`, `type`, `status_group`. `type` values observed: `open` (`to do`), `custom` (`planning`, `in progress`, `at risk`, `update required`, `on hold`), `done` (`complete`), `closed` (`cancelled`): one `open`, one `done`, one `closed`. This list inherits its statuses from the space (`override_statuses: false`). The status ids are then identical to the space's, shaped `p<space_id>_<8 chars>`, and `status_group` is `proj_<space_id>`. Space statuses have no `status_group`.

**Fixture caveats.** The sanitizer nulls `avatar` and `profilePicture` (live values are a URL string or null) and blanks user and list `color`/`content`, so schemas built from the fixtures must accept `string | null` there. Both fixture members share the email `user@example.com`: the member `id` (a number) is the only unique key, so tests must not key members by email.

**Pagination.** None observed. Each hierarchy response is a single top-level array (`teams`, `spaces`, `folders`, `lists`) with no paging fields, and there is no `Link` header. The only query parameter exercised is `archived`. An empty result is HTTP 200 with an empty array, e.g. `{"folders": []}`. This workspace is too small to show whether the server caps result size.

**Archived.** Without a parameter, the space and list endpoints returned only non-archived items, each with `archived: false`. With `?archived=true` they returned an empty array even though non-archived items exist, so `archived=true` excludes non-archived items; archived items themselves were not observed because none exist. Listing everything probably takes two calls. Not conclusive for folders: the workspace had none during the original capture.

**Rate limit.** Every 200 response carried `x-ratelimit-limit: 100` (observed on this workspace's plan; do not hard-code it), `x-ratelimit-remaining` (down by one per call) and `x-ratelimit-reset` (Unix epoch **seconds** of the window reset, about 60 s ahead). The 401 response carried no `x-ratelimit-*` headers.

### Live MCP spikes (U1–U10, U12)

Run 2026-11-20 inside a sandbox folder with two lists, authenticated as an AI-agent account (member, not owner), so the verbs were exercised as an agent identity. Sanitized fixtures: `skills/pm-tasks-clickup/tests/fixtures/mcp/*.json` (trimmed to representative entries; `_tool-keys.json` holds the allowed parameter keys of every tool the adapter uses, copied from the live schemas). `get_user` returns `{id (number), username, email, initials, color, profile_picture, timezone, week_start_day, current_time, current_time_utc, utc_offset, day_of_week}`.

**U2, response envelope.** Writes do not return a task. `create_task` and `update_task` return a bare `{success, task_id, custom_id, task_url}`; `move_task` returns `{success, task_id, custom_id, new_list_id}` (no `task_url`); `add_tag_to_task` and `remove_tag_from_task` return `{success, task_id, custom_id, tag_name}`; `create_comment` returns `{success, comment_id}`; `create_space_tag` returns `{success, space_id, created, tag{name, tag_bg, tag_fg}}`; `resolve_assignees` returns `{userIds: ["<id>", …]}` as strings (`"me"` resolves to the authenticated account); errors are `{"error": "<text>"}`. `get_task` returns a bare flat task (no wrapper) with `id`, `url`, `status` (a string), `parent` (id or null), `assignees[{id, username, email}]`, `tags[{name, tag_bg, tag_fg}]`, `due_date`/`start_date`/`date_*` (epoch-millisecond strings), `time_estimate` (milliseconds), `list{id, name}`, `folder`, `space{id}`, `subtasks_count`, `checklists_count`; `include: ["subtasks"]` adds `subtasks[]` summaries (their `list`, `folder`, `space` are null), `expand_statuses` adds `available_statuses[]`. The adapter reads `id` or `task_id` and `url` or `task_url`. `[ct:<token>]` lookup: `clickup_search {keywords: "ct:<token>"}` finds a task whose description holds the marker (`results[].id`, `searchContext.hasContentMatch`). Descriptions store the brackets escaped (`\[ct:…\]` in `markdown_description`, plain in `text_content`); comments keep the marker verbatim and `comment_text` ends with a newline, so comment idempotency scans `get_task_comments`.

**U1, assignees.** `update_task.assignees` **replaces** the set: sending the owner's id removed the previously assigned agent. Branch: `task.assignee.add` sends the union of the current assignees and the new one.

**U3, estimate roll-up.** A parent keeps its own `time_estimate` (7,200,000 ms) after a 30-minute child is added; the API field does not roll up. The space reports `time_estimates.rollup: true` (U11) and the operator task object carries `rolled_up_time_estimate`, so views can sum parent and children. Branch (ruling): `time_estimate` is written only on a leaf task (`subtasks_count === 0`); a task with subtasks gets the `est:*` tag only.

**U4, memberships and sprints.** `get_task` exposes only the home `list`, no membership list. `clickup_add_task_to_list` fails on this plan with `{"error":"Your plan is limited to {{limit}} usages of feature, {{usage}} usage."}`, so adding a task to a second list could not be demonstrated and neither could `remove_task_from_list`. Branch: **`task.sprint.set` is dropped from the v1.0.0 manifest** (§10 rule). A maintainer on a plan that allows Tasks in Multiple Lists can verify it and promote it in a later release.

**U5, close with open subtasks.** Setting the done status on a parent with two open subtasks (one `to do` child and one reparented `to do` task; a third child was already `complete`) succeeded and left both open subtasks open (fixture `clickup_get_task.parent.closed_with_open_subtasks.json`). `date_closed` stays null for a done-type status, so completion is detected by status, not by `date_closed`.

**U6, URLs.** `task_url` is `https://app.clickup.com/t/<task_id>` (no workspace segment); `custom_id` is null here. New folders, lists and comments have 16-digit ids; tasks have 10-character ids.

**U7, dates.** A date-only `due_date` or `start_date` (sent as `YYYY-MM-DD`) is stored as **04:00 local time** of the account timezone, as epoch milliseconds (`1795762800000` is 2026-11-27T07:00:00Z, 04:00 at UTC-3). Writing `start_date` alone left `due_date` unchanged. Because the stored instant depends on the account timezone, the transport reports `previousDueAt` as the ISO instant of the stored value and decides whether the date already matches (the core idempotency rule, no-op if equal) by converting the stored instant to a local date with the `utc_offset` that `clickup_get_user` returns, read once per transport and cached; if that call fails it writes anyway.

**U8, tags.** `create_space_tag` lowercases the name (`EST:3` stored as `est:3`) and a second call returns `created: false`. `add_tag_to_task` works by name and `remove_tag_from_task` ignores case.

**U9, bulk create.** `clickup_execute_operator {model: "task", operator: "create_many", parameters: {list_id: <number>}, body: {tasks: […]}}` is sequential: with an invalid `status_label` on the second of three entries, only the first task was created, the call errored, and the third was never attempted. The error body carried no usable `tasks`. A successful call returns `{tasks: [<full internal task objects, ~150 fields>]}` with `id`, `name`, `parent`, `status{id, status, color, orderindex, type}`; always pass a `query` projection. Left for the batch verb in a later release.

**U10, markdown and filters.** A markdown task list round-trips verbatim in `markdown_description`; `text_content` drops the checkboxes. `clickup_filter_tasks` returns `{tasks[], count, page, has_more, next_page}` with summary fields (`id`, `name`, `status`, `url`, `priority`, `assignees`, `tags`, `due_date`, `date_updated`, `date_closed`, `list`). It includes subtasks by default and `include_closed: false` does **not** exclude done-type tasks; the plan-execution lister passes `statuses` (every open- and custom-type status name of the scoped lists, not only the pinned open and wip names, §4 Modes) and `subtasks: false`.

**U12, invalid status.** `update_task` with a status that does not exist on the list returns `{"error":"Failed to update task: Status does not exist"}`; the transport maps it to `INVALID_REQUEST {reason: "status_rejected"}`.

**Fixture notes.** `clickup_filter_tasks.default.json` is trimmed to three of the five entries seen (`count` recomputed); it was called with only `list_ids`. `include_closed_false` was called with `list_ids`, `subtasks: false`, `include_closed: false`, which is why only the root task appears. Pagination (`page`, `has_more`) was never exercised: `has_more` was always false. Shapes to treat as optional or variable in schemas: `get_task` with `include: ["subtasks"]` drops `subtasks_count` (use `subtasks.length`) and, for children, carries `description` instead of `markdown_description`; `priority` is an object in `get_task` and a string in `clickup_filter_tasks`; folder `task_count` is the string `"0"` in the REST folder list but a number in list objects; subtask summaries have null `list`, `folder`, `space`. The leaf-only estimate rule therefore reads `subtasks_count` from a plain `get_task`. Reason for leaf-only: with roll-up on, a parent estimate plus its children's would double count in roll-up views, and the API cannot show the roll-up; a leaf that later gains children keeps its own estimate, which is acceptable.

**Other observations.** `update_task.parent` moves the task into the parent's list (a task created in the second list appeared in the first) and cannot clear a parent. `move_task` is root-only and returns `new_list_id`.

**Verb decisions for v1.0.0.** Keep: `task.create`, `task.move`, `checklist.check` (subtask), `task.close`, `task.due-date.set`, `task.assignee.add` (union write), `task.comment.add`, `task.parent.set`, `task.estimate.set` (leaf-only native estimate, tag always). Drop: `task.sprint.set`. Consequences: the manifest and `autonomous.allow` enum shrink to nine verbs; the `sprints` config block and its i18n keys are removed from the Task 1 package when the adapter factory is reconciled; the init sprint prompts and doctor check C-CLK-5 are not built; the plan's sprint task is skipped; the plan-execution lister passes `statuses` instead of `include_closed: false`; the sprint text in §2, §4, §5 and §9 was removed in the release task. Cleanup the tools cannot do: the space tags `est:2h` and `est:3`, the sandbox folder and its two lists have no delete tool and are removed by the maintainer in the UI.

## 15. Outcome

- **Shipped in v1.0.0:** nine verbs over the ClickUp MCP (`task.create`, `task.move`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`, `task.parent.set`, `task.estimate.set`), `init` (REST token path in a terminal, an agent procedure in a session), `doctor` (C-CLK-1…4, 6, 7, 8; C-CLK-8 reports a list ClickUp refuses to read per list and stops only on a rate limit) and the plan-execution lister procedure, which filters on every open- and custom-type status name of the scoped lists (read with `clickup_get_list`), not only on the pinned open and wip names.
- **Deferred:** `task.sprint.set` (`add_task_to_list` is plan-limited, U4) and the batch verb on `task.create_many` (U9).
- **Spike headlines:** writes return an envelope, not a task (U2); `assignees` replaces the set (U1); date-only values are stored at 04:00 local time (U7); `include_closed: false` keeps done-type tasks (U10); the estimate field does not roll up but views do, so native estimates are leaf-only (U3); `[ct:]` markers are escaped in descriptions and verbatim in comments (U2); a personal token goes in `Authorization` without `Bearer` (U11).
- **Known limitations:** `autonomous.allow`/`scope` are not enforced at runtime (core gap C2); read-then-write races are not guarded; comment idempotency scans the first page only; no due-date clearing, no detach, no custom task ids; `filter_tasks` pagination was never exercised live; the doctor's live checks need `CLICKUP_API_TOKEN` (no MCP probe path in the CLI).
- **Budget:** the dist measures 23.96 kB brotli in `size-limit` against a planned 13 kB (REST init path, doctor live checks, defensive parsing); the budget is 26 kB. About a third of the shipped JS is comments (28 % of the raw bytes, 34 % of the brotli size); a two-pass emit that strips comments from the `.js` files but keeps the `.d.ts` JSDoc is a later option.
