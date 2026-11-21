---
name: pm-tasks-clickup
description: >-
  ClickUp adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  ClickUp, asks to "create a ClickUp task", "publish to ClickUp", "post to
  ClickUp", "move the task to in progress", "check the subtask", "close the
  ClickUp task", or uses --publish-clickup; OR for CRUD on existing ClickUp
  tasks (status move, check subtask, close, due date, assign, comment, parent,
  time estimate); OR when an agent invokes it autonomously ([autonomous] /
  --auto sentinel) or for plan-execution sync.
  ClickUp model: workspace > space > folder > list > task > nested subtasks;
  statuses are defined per list with a type (open/custom/done/closed) and pinned
  by role (open/wip/done/closed) in .clickup.json at init, never by name;
  checklist items are subtasks; multi-assignee (assignees replace, so writes
  send the union); native time_estimate on leaf tasks plus est: tags. MCP:
  ClickUp MCP (clickup_* tools). Modes: paste-ready, MCP publish, autonomous
  (write-through with allowlist), plan-execution. Implements 9 verbs
  (task.create, task.move, checklist.check, task.close, task.due-date.set,
  task.assignee.add, task.comment.add, task.parent.set, task.estimate.set).
  Requires @llodev/pm-tasks-core.
license: MIT
metadata:
  version: 1.0.0
  tags:
    - agent-skill
    - clickup
    - plan-to-tasks
    - pm-tools
    - clickup-mcp
  family: pm-tasks
  role: adapter
  tool: clickup
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# pm-tasks-clickup

ClickUp adapter for the `@llodev/pm-tasks-*` family. Publishes generic cards as ClickUp tasks with subtasks and dispatches the nine CRUD verbs through the ClickUp MCP. Tool names below omit the server prefix your agent adds (for example `mcp__clickup__`). Every call carries `workspace_id` from `.clickup.json`.

## Routing

| Trigger        | Signal                                                                 | Path                                          |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| Paste-only     | No ClickUp MCP connected                                               | Phase 4 only: Markdown description            |
| MCP publish    | ClickUp MCP connected + `.clickup.json` present                        | Phase 4 → 5 (task, then one subtask per item) |
| Autonomous     | `[autonomous]` / `--auto` sentinel **and** `autonomous.enabled: true`  | Phase 5b (write-through, no preview)          |
| CRUD ops       | Verb on an existing task (id or `https://app.clickup.com/t/<task_id>`) | Phase 6: jump directly                        |
| Plan-execution | Plan file path, plan slug or title list, with `.clickup.json`          | Phase 7 (discover + dispatch)                 |
| No config      | MCP connected, no `.clickup.json`                                      | § Init, path (b), before anything else        |

## ClickUp model

- **Hierarchy:** workspace → space → folder (optional) → list → task → subtasks (nested, any depth). Work lives in lists; a list id is a digit string.
- **Statuses are per list** (inherited from the folder or space unless the list overrides them). Each has a `type`: exactly one `open`, one `closed`, an optional `done`, any number of `custom`. No type means "in progress", so the user picks `wip` at `init`. The `closed` type is often a cancellation ("cancelled"), not a success.
- **Roles pinned per list** in `.clickup.json` → `lists[].statuses`: `open`, `wip` (optional), `done` (the `done`-type status, else the `closed` one), `closed` (only when distinct from `done`). Verbs resolve a role to the pinned name, compare names trimmed and case-insensitively, and send the pinned name verbatim, so localized names work.
- **Checklist items are subtasks.** The MCP can read native checklists (`clickup_get_task` with `include: ["checklists"]`) but has no tool that creates or ticks them. `checklist.check` takes the subtask id as `itemId` and the parent task id as `checklistId`.
- **Multi-assignee, replace semantics:** `clickup_update_task.assignees` replaces the whole set. `task.assignee.add` reads the task and writes the union; it never removes anyone.
- **Writes return an envelope, not a task:** `{success, task_id, custom_id, task_url}` (`clickup_move_task`: `new_list_id`, no URL). Only `clickup_get_task` returns a task (bare and flat). Errors are `{"error": "<text>"}`.
- **Dates are calendar days:** a `YYYY-MM-DD` value is stored as 04:00 in the account's timezone. Compute "today", "tomorrow" or "next Friday" from `clickup_get_user.current_time`, never from your own clock.
- **Identity:** `"me"` resolves to whoever the MCP is authenticated as, a person or an AI-agent account. Nothing branches on which. A separate agent account for autonomous runs is an option, not a requirement; a manager publishing, a team member publishing and an agent executing all use the same verbs.

**Before any write, ask:**

- **Which list is home?** Status verbs resolve against the task's home list; a list missing from `lists[]` (or from `autonomous.scope.lists`) is a stop, not a guess.
- **Role or place?** `open`/`wip`/`done` change the status; a list id moves the task. Re-parenting moves it too.
- **Does this field replace?** Assignees and the `est:` tag set are rewritten whole: read first, write the result.
- **Whose clock?** Any relative date comes from `clickup_get_user.current_time`.
- **Did it already happen?** `ALREADY_IN_STATE` and `ok: true` without a write are success; a re-run with the same `clientToken` must not duplicate.

## Phase 4: ClickUp formatting

Apply the generic card from [`../pm-tasks-core/references/generic-card.md`](../pm-tasks-core/references/generic-card.md), then map:

- Title → `name`. Sections → Markdown headings in `markdown_description` (literal newlines).
- Labels → `tags` (ClickUp stores tag names lowercased). Priority → `urgent`, `high`, `normal` or `low` (`medium` becomes `normal`; anything else is dropped). Due date → `due_date` (`YYYY-MM-DD`).
- Initial status → `listOrSectionId` is a status **name** that exists on the target list (usually its pinned `open`), or empty for the list default. Never `open`/`wip`/`done`: `task.create` does not resolve roles, and ClickUp rejects a name the list lacks.
- Estimate → not at create time: call `task.estimate.set` after the task (and its subtasks) exist, because the leaf rule depends on whether it has subtasks.
- Publishing from a plan file → put `[plan:<slug>]` in the description so Phase 7 can find the task by slug.
- **Checklists:** paste-ready renders each item as a Markdown task list line (`- [ ] item`); ClickUp keeps that text verbatim in the description and shows checkboxes, which is fine for a human. MCP publish creates **subtasks** instead (Phase 5), because only subtasks are addressable by `checklist.check`.

## Phase 5: MCP publish

**Prerequisite:** the ClickUp MCP connected in your agent (remote server `https://mcp.clickup.com/mcp`; it handles OAuth, so the adapter never sees a credential), and `.clickup.json`.

Strict order: 1 config → 2 duplicate lookup → 3 preview & approval → 4 publish → 5 follow-ups → 6 confirm; 7 covers errors.

1. **Config:** target list = the requested list or `defaultListId`. It must be in `lists[]`: a task created elsewhere works, but every later status verb on it fails `list_not_configured`.
2. **Duplicate lookup** (when you pass a `clientToken`): `clickup_search {keywords: "ct:<token>"}` without brackets, because ClickUp stores the description with the brackets escaped (`\[ct:…\]`). For a `type: "task"` hit, confirm with `clickup_get_task` that `text_content` contains `[ct:<token>]`, then reuse that task: skip `task.create` in step 4 and create only the missing subtasks.
3. **Preview & approval:** name, list, initial status, tags, priority, due date, assignees, subtasks, estimate.
4. **Publish:** `task.create` with the `clientToken` (the transport appends the `[ct:<token>]` footer). Then one `clickup_create_task {list_id, name, parent: <parent id>}` per checklist item, in the parent's list. On a re-run, read `clickup_get_task {task_id, include: ["subtasks"]}` first and skip item names already present.
5. **Follow-ups:** `task.assignee.add`, then `task.estimate.set` on the parent and, if the plan estimates items, on the subtasks.
6. **Confirm:** write each task as a link with its name as the text, `[Task name](https://app.clickup.com/t/<task_id>)`; never a bare URL.
7. **Errors:** surface the server message. There is no rollback: subtasks created before a failure stay. Re-run with the same `clientToken`; steps 2 and 4 resume without duplicates.

### Attribution (opt-in)

Read `config.attribution`. If `enabled === true`, append the `descriptionFooter` from `getAttribution()` to the description and start comments with `commentPrefix` (`autonomousCommentPrefix` in autonomous mode). The transport sends text verbatim and adds nothing. See [`../pm-tasks-core/references/attribution.md`](../pm-tasks-core/references/attribution.md).

## Phase 5b: Autonomous

Skip Phase 5 step 3 (preview & approval). Apply [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). `init` writes `autonomous.enabled: false` on purpose: if it is not explicitly `true`, stop and ask the human.

**You are the gate.** The transport cannot tell autonomous from interactive calls and checks none of `allow`, `scope.lists` or `rateLimit`. Before every write, check the verb is in `autonomous.allow` and the task's home list is in `autonomous.scope.lists` (all `lists[]` when scope is absent). The doctor validates the shape (C-CFG-2, C-CFG-3, C-CLK-6); only the status verbs fail closed on their own, with `list_not_configured`.

> **MANDATORY READ before the first autonomous write:** [`references/autonomous.md`](references/autonomous.md) (scope rules, how to learn a task's home list, escalation, audit log).

### Continuous operation in multi-task loops

Mirror each task transition in ClickUp as it happens; NEVER batch at the end of the loop.

| Transition      | Canonical verb → ClickUp call                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task started    | `task.move` (`wip`) → `clickup_update_task {status: <pinned wip>}`; then stamp the start date if the team uses it (below)                                   |
| Subtask checked | `checklist.check` → `clickup_update_task {status: <pinned done>}` on the subtask                                                                            |
| Task completed  | `task.move` (`done`), `task.comment.add` with the commit SHA and `clientToken: <sha>`, then `task.close` (a no-op after the move)                           |
| Task failed     | `task.comment.add` with the failure mode, `task.assignee.add` of the `defaults.escalateToAlias` member. Do NOT call `task.move(_, "done")` or `task.close`. |

**Lifecycle fidelity:** ClickUp stamps no start date. When the list or team tracks start dates, follow the `wip` move with `clickup_update_task {task_id, start_date: <today from clickup_get_user.current_time>}`; writing `start_date` alone leaves `due_date` untouched. At close, `due_date` stays = the plan: never overwrite it. ClickUp leaves `date_closed` null for a `done`-type status, so completion is read from the status, not from `date_closed`. See [`../pm-tasks-core/references/lifecycle-fidelity.md`](../pm-tasks-core/references/lifecycle-fidelity.md).

## Phase 6: CRUD operations (existing tasks)

> **MANDATORY READ:** [`references/operations.md`](references/operations.md) before the first CRUD verb of a session: exact parameters, result shapes, every `reason` token and its fix. **Do NOT load** [`references/estimation.md`](references/estimation.md) unless the verb is `task.estimate.set`.

| Core verb           | ClickUp calls                                                                          | Input that matters                                                        | When nothing changes             |
| ------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `task.create`       | `clickup_create_task`                                                                  | `boardOrProjectId` = list id; `listOrSectionId` = status name or empty    | n/a (duplicate lookup is yours)  |
| `task.move`         | `clickup_get_task` → `clickup_update_task {status}` or `clickup_move_task`             | `open` / `wip` / `done`, or a numeric list id (root tasks only)           | `ALREADY_IN_STATE`               |
| `checklist.check`   | `clickup_get_task` → `clickup_update_task {status}`                                    | `itemId` = subtask id, `checklistId` = parent task id                     | `ALREADY_IN_STATE`               |
| `task.close`        | `clickup_get_task` → `clickup_update_task {status: <pinned done>}`                     | Already at the pinned `done` **or** `closed` status → no write            | `ok: true`                       |
| `task.due-date.set` | `clickup_get_task` (+ `clickup_get_user` once) → `clickup_update_task {due_date}`      | `YYYY-MM-DD`; clearing is not supported                                   | `ok: true`                       |
| `task.assignee.add` | (`clickup_resolve_assignees`) → `clickup_get_task` → `clickup_update_task {assignees}` | Numeric id, `"me"`, email or username; writes current ∪ new               | `ok: true`, `added: false`       |
| `task.comment.add`  | (`clickup_get_task_comments`) → `clickup_create_comment`                               | `clientToken` → `[ct:<token>] ` prefix, first comments page scanned first | `ok: true`, the existing comment |
| `task.parent.set`   | `clickup_get_task` → `clickup_update_task {parent}`                                    | Moves the task into the parent's list; cannot detach                      | `ok: true`                       |
| `task.estimate.set` | `clickup_get_task` → `clickup_update_task {time_estimate}` + tag tools                 | Pass the `.clickup.json` `estimation` block as `config`                   | `ok: true`, zero writes          |

**`ALREADY_IN_STATE` means "nothing to do", not a failure.** Report it as done; plan-execution hooks count it as skipped without failing the run.

**Choosing a `task.move` target:** a status change inside the list → a role word. A different list → its numeric id, and only for a root task (a subtask answers `subtask_cannot_move`: move its parent). ClickUp requires the task's current status name to exist in the destination list, and if the destination is not in `lists[]`, every later status verb on that task fails `list_not_configured` until `init` registers it.

**When a verb fails with `INVALID_REQUEST`, read `details.reason`:**

| `reason`               | Meaning → next step                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `list_not_configured`  | The task's home list is not in `lists[]` (hand-made task, list move, re-parenting) → re-run `init`          |
| `role_not_configured`  | No status pinned for that role (often `wip`) → re-run `init` and pick one                                   |
| `status_rejected`      | The pinned status was renamed or deleted in ClickUp → run the doctor (C-CLK-8 names list and role), re-init |
| `subtask_cannot_move`  | List moves are root-only → move the parent                                                                  |
| `not_a_checklist_item` | `itemId`'s parent is not `checklistId` → re-read the parent's subtasks                                      |
| `assignee_unresolved`  | The user did not resolve to exactly one id → pass the numeric id or a unique email                          |
| `invalid_due_date`     | Not a real `YYYY-MM-DD` date (also what `null` gets: clearing is unsupported)                               |

`task.parent.set` with an empty `parentId` is `NOT_APPLICABLE` (`detach_unsupported`): detach in the ClickUp UI. Beyond refusing a task as its own parent (`self_parent`), it has no cycle guard; ClickUp decides.

**`<task-ref>` resolution:** task URL `https://app.clickup.com/t/<task_id>` (last segment) → native task id → `[ct:<token>]` lookup (Phase 5 step 2) or the audit log → otherwise `REF_NOT_RESOLVED` with candidates. Custom task ids (`DEV-1234`) are not supported: pass the native id.

**Members and aliases:** `init` can cache `members[]` with unique `alias` values. Resolve an alias to its `members[].id` yourself before `task.assignee.add`: the transport accepts ids, `"me"`, emails and usernames, not aliases.

### Estimation (`task.estimate.set`)

> **MANDATORY READ:** [`references/estimation.md`](references/estimation.md) before the first estimate.

The core runtime does not read `.clickup.json` for you: pass its `estimation` block as the request `config`. No block, or `enabled: false` → `NOT_APPLICABLE`. Time strategies with `clickupTarget: "time"` write `time_estimate` (minutes) **only on a leaf task**; a task with subtasks gets the tag only, because ClickUp views roll subtask estimates up into the parent. The `est:<slug>` tag (`ideal_hours` 2 → `est:2-ideal-hours`) replaces any other `est:*` tag; a re-run writes nothing. A failure after a write returns `ok: false`, `details.partial: true` with `applied[]` and `failedStep`: re-run the same call.

## Phase 7: Plan-execution mode

Load `.clickup.json` with `requireConfig`, then call `discoverPlanTasks` (both from `@llodev/pm-tasks-core`) with this lister:

```text
clickup_filter_tasks {
  list_ids: autonomous.scope.lists, else every lists[].id,
  subtasks: false,                       // subtasks are checklist items, not plan tasks
  statuses: [every open- and custom-type status name of those lists],
  page: 0, then the response's next_page while has_more is true
}
→ [{ id, title: name }]                  // titles or a .md plan
→ [{ id, title: name, description }]     // bare slug: description = text_content
```

Read the status names at the start of each discovery, with one `clickup_get_list {list_id}` per scoped list: pass every name whose `type` is not `done` or `closed`, and never a `done`- or `closed`-type name. Filtering on the pinned open and wip names alone misses tasks parked in another custom status (`on hold`, `planning`, `at risk`): they come back `missing`, and creating them duplicates them in ClickUp.

Each page answers `{tasks[], count, page, has_more, next_page}`. Follow `next_page` while `has_more` is true; if `has_more` is true without a `next_page`, stop and report instead of returning a partial list.

NEVER use `include_closed: false` as the done filter: it does not drop `done`-type tasks. The summary has no description, and core's `discoverPlanTasks` matches a bare-slug `planRef` against each returned task's `description` (it must contain `[plan:<slug>]`). So in bare-slug mode the lister reads each candidate with `clickup_get_task` and returns `description: text_content`; `markdown_description` escapes the brackets and would never match. Without a `description`, bare-slug discovery returns `found: []`.

The skill returns `{ found, missing, ambiguous }`; the calling agent decides (create missing via Phase 4 + 5, disambiguate, proceed). Record progress with the standard verbs. With core's `onTaskStart` / `onTaskComplete` hooks, pass the **role words** `listsWipId: "wip"` and `listsDoneId: "done"` (a numeric value would move the task to another list), `checklistId` = parent task id and `checklistItemId` = subtask id. Full contract: [`../pm-tasks-core/references/plan-execution.md`](../pm-tasks-core/references/plan-execution.md).

## Result envelope

The runtime returns `{ ok: true, data }` or `{ ok: false, code, details }`. Report it in the core contract shape ([`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) § Result envelope):

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "clickup",
  "ref": { "id": "<task_id>", "url": "https://app.clickup.com/t/<task_id>", "alias": null },
  "details": {}
}
```

Per-verb `data` (into `details`) and the failure codes are in [`references/operations.md`](references/operations.md) § Result envelope. Failures carry `details.verb`, `details.message` and, for `INVALID_REQUEST`/`NOT_APPLICABLE`, a stable `details.reason`.

## Known limitations

- No sprint verb: `task.sprint.set` answers `UNSUPPORTED_VERB`. ClickUp Sprints are lists; `task.move` with the sprint list id moves a root task there, but the task then leaves its home list, so later status verbs fail `list_not_configured` unless `init` registers the sprint list (multi-list membership is plan-limited and not used).
- Native checklists are read-only; unchecking a subtask whose pinned `done` status was renamed in ClickUp reports `ALREADY_IN_STATE` (run the doctor).
- No conditional update in ClickUp: read-then-write races are not guarded. Comment idempotency scans only the first comments page.

## Anti-patterns

> **MANDATORY READ before Phase 5 or 5b:** [`anti-patterns/clickup.md`](anti-patterns/clickup.md)

- NEVER hard-code a status name: names are per list, user-defined and often localized; use the pinned role.
- NEVER call `clickup_create_task_comment` (deprecated): use `clickup_create_comment`.
- NEVER send `assignees` without the current set: it replaces, silently unassigning people.
- NEVER put `- [ ]` checklists in the description on MCP publish: they cannot be checked by `checklist.check`.
- NEVER write a native estimate on a parent and its children: roll-up views count it twice.
- NEVER read a write response as a task: it is `{success, task_id, ...}` with no status, list or assignees.

## Standalone fallback

If `@llodev/pm-tasks-core` is not installed: ask for the minimum (title + checklist items) and produce a paste-ready ClickUp description with a `- [ ]` task list. Quality is degraded (no scope, audience or fidelity inference). Print: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

`init` writes `./.clickup.json` (or `--output <path>`); the doctor reads `./.clickup.json` (or `--config <path>`); `createAdapter({ configPath })` takes the path you give. Schema: [`schemas/config.json`](schemas/config.json). No credential is ever stored in it.

> **Narration language.** When `.clickup.json` sets `locale`, agent-authored narration — comments the agent writes, autonomous commit/PR copy, code comments — MUST use it. The plan's language still governs task name, description and subtask text. The doctor's `C-LANG-1` warns if it is unset or has no installed i18n bundle. See pm-tasks-core § Narration language.

Key fields:

- `workspace` `{ id, name }`; `lists[]` `{ id, name, space?, folder?, statuses: { open, wip?, done, closed? } }`; `defaultListId`.
- `members[]` `{ id, name, email?, alias? }` (optional cache; `init` always writes an alias). `defaults.assigneeAlias` / `escalateToAlias` must be `"me"` or a member alias.
- `estimation` `{ strategy, clickupTarget: "time" | "none", enabled?, hoursPerDay?, scale?, sizeMap? }` (optional; `init` writes `enabled: true`).
- `autonomous` `{ enabled, allow[], scope: { lists[] }, rateLimit, auditLog }`; `attribution` (core block); `locale`.

## Init

See [`../pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md). Discovery is read-only; nothing is written to ClickUp. Two paths:

**(a) Terminal, with a token.** Set `CLICKUP_API_TOKEN` to a personal API token (ClickUp → Settings → Apps → API Token) in the environment, then run `npx @llodev/pm-tasks-clickup init`. It picks the workspace (asked only when there are several), the lists, then `wip` per list among its `custom` statuses. The token is read only from the environment: never paste it into chat, an issue or a config file.

**(b) Inside an agent session with the ClickUp MCP.** The CLI cannot reach your session's MCP, so its "run init inside an agent session" message means: you do the discovery and write the file.

1. `clickup_get_workspace_hierarchy {max_depth: "2"}` → the root is the workspace; spaces → folders → lists (pass the response's `next_cursor` back as `cursor` until there is none). Ask which lists to use.
2. Per list, `clickup_get_list {list_id}` → `statuses[]`. Pin `open` = first `open`-type by `orderindex`; `done` = first `done`-type, else the `closed`-type; `closed` = the `closed`-type when it differs from `done`. Ask the user to pick `wip` among the `custom` statuses (or leave it unset). Skip a list with no `open` or no `done`/`closed` status.
3. Optional: `clickup_get_workspace_members {workspace_id}` → `members[]` with unique lowercase aliases (not `"me"`, not digits only; ids as strings).
4. Write `.clickup.json` per the schema with `version: "1"`, `locale`, `defaultListId` = first list. Write the `autonomous` block only if the user wants it, as `{enabled: false, allow: [the nine verbs of manifest.json], scope: {lists: [the chosen list ids]}}` (the schema requires `allow`).
5. Run `npx @llodev/pm-tasks-clickup init --doctor`. Without `CLICKUP_API_TOKEN` its live checks (C-CLK-7, C-CLK-8) are skipped: in the session, compare each list's pinned statuses with the `statuses[]` of `clickup_get_list {list_id}` yourself, and re-pin any that no longer exists.

**Doctor:** `npx @llodev/pm-tasks-clickup init --doctor [--json] [--fix-hints-only] [--config <path>]` runs core's shared checks plus C-CLK-1…4 and 6 (config, workspace id, pinned `open`/`done`, estimation coherence, scope and aliases). With `CLICKUP_API_TOKEN` set it also runs the live checks: C-CLK-7 (workspace reachable) and C-CLK-8 (each pinned status still exists in its list). Without a token they are skipped with an advisory.
