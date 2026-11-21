# pm-tasks-clickup v1.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@llodev/pm-tasks-clickup` 1.0.0, the ClickUp adapter of the pm-tasks family, with the canonical verbs, `init`, `doctor`, docs and repo wiring.

**Architecture:** Mirrors `skills/pm-tasks-linear`: a typed MCP transport injected into `createCoreRuntime`, config pinned per list at `init`, status resolved from config (never by name in code), checklist items modeled as subtasks. Runtime verbs are MCP-only; `init`/`doctor` additionally have a read-only REST path using `CLICKUP_API_TOKEN`. Everything lands in `skills/pm-tasks-clickup` plus repo wiring; `pm-tasks-core` is untouched.

**Tech Stack:** TypeScript (ESM, NodeNext, Node >=24), vitest, ajv via core `validateConfig`, pnpm workspace, Changesets (meta package only).

**Spec:** `docs/specs/2026-11-20-pm-tasks-clickup-design.md` (approved 2026-11-20). Sections are cited as `§n`. Executors read both.

## Spec amendments found while planning

Apply to the spec in Task 12 (they refine, not reverse, an approved decision):

- **A1** `task.move`/`task.parent.set` cannot report a relocated list id: `TaskMoveResponse`/`TaskParentSetResponse` have no such field and core is untouched. It is documented in `references/operations.md` only (§4, §9).
- **A2** Start-date stamping (`start_date` on move → wip) is SKILL-level guidance for the agent path, like Asana/Linear; the transport's `taskMove` does not write it (core `lifecycle-fidelity.md` calls it interpretive).
- **A3** Partial failures return `ok:false`, `code:"MCP_ERROR"`, `details:{partial:true, applied:[…], failedStep}` (response types have no warnings field). `task.create` is a single call, so only `task.estimate.set` can be partial (§9.4); `task.sprint.set` was dropped.
- **A4** Idempotent create lookup (`[ct:<token>]` via `clickup_search`/`clickup_filter_tasks`) is SKILL-level, as in Linear; the transport only embeds the marker.
- **A5** `.github/CODEOWNERS` needs no change (all per-adapter lines are commented placeholders); the canary test is an `includes` check, so it gains one assertion rather than a list edit (§8).

## Spike outcomes applied (Task 0a/0b, spec §14)

Binding for every later task; they override older wording below.

- **S1 envelope.** Writes return `{success, task_id, custom_id, task_url}` (not a task); `move_task` returns `{success, task_id, custom_id, new_list_id}`; `get_task` is a bare flat task; errors are `{"error": "<text>"}` (a thrown error or a resolved `{error}`, treat both alike).
- **S2 assignees replace** (`update_task.assignees`): `task.assignee.add` writes the union.
- **S3 `task.sprint.set` is dropped** (`add_task_to_list` fails with a plan-limit error): manifest and `autonomous.allow` have nine verbs; Task 6 is skipped; the `sprints` config block, its i18n keys, the init sprint prompts and doctor C-CLK-5 do not exist.
- **S4 estimates:** native `time_estimate` only on a leaf (`subtasks_count === 0`), the `est:*` tag always.
- **S5 dates:** date-only values are stored at 04:00 local; compare local dates via the cached `utc_offset` from `clickup_get_user`, never UTC dates.
- **S6 status errors:** `update_task` with an unknown status → `{"error":"Failed to update task: Status does not exist"}` → `INVALID_REQUEST {reason:"status_rejected"}`.
- **S7 lookups:** `[ct:<token>]` via `clickup_search {keywords:"ct:<token>"}` (descriptions escape brackets), comments keep it verbatim (scan `get_task_comments`).
- **S8 lister:** `filter_tasks` with `include_closed:false` does not drop done-type tasks: pass `statuses` (pinned open and wip names) and `subtasks:false`.
- **S9 fixtures** live in `tests/fixtures/mcp/` and `tests/fixtures/rest/`; `tests/fixtures/mcp/_tool-keys.json` holds the allowed parameter keys per tool (the stub imports it). Fixture members share the email `user@example.com`: key members by id.

## Global Constraints

- **Version:** `package.json` `"version": "1.0.0"` set directly, marketplace entry `"version": "1.0.0"` (precedent: Linear's release commit `cb86eb5`; `marketplace-parity.mjs` requires equality). No changeset for this package; **one minor changeset for `@llodev/pm-tasks`** (meta).
- **Branch/PR:** branch `pmt-clickup-v1.0.0`; PR title `feat(release): clickup v1.0.0 — ClickUp adapter`. Commit steps assume the maintainer approved executing this plan; **push, PR and `npm publish` need a separate explicit ask.**
- **No `pm-tasks-core` change**, no `contract.md` edit.
- **Transport is MCP-only.** `McpCaller` receives tool names **without** the server prefix (`"clickup_create_task"`, not `"mcp__clickup__clickup_create_task"`), like Linear. REST is read-only discovery for `init`/`doctor`.
- **Credentials:** token only from `CLICKUP_API_TOKEN` (`stripEnvQuotes`-style unquoting); header `Authorization: <token>` with no `Bearer` (confirm in Task 0a); never stored in config, logged, committed or echoed. To read it in a non-interactive shell use `zsh -ic '<cmd>'` (the maintainer's `.zshrc` exports it).
- **Tool names and parameter keys are copied verbatim from the live tool schemas.** `additionalProperties: false` is real: the test stub rejects unknown keys. Use `clickup_create_comment`, never the deprecated `clickup_create_task_comment`. Pass `workspace_id: config.workspace.id` on every call.
- **Budget:** `size-limit` entry `13 kB` for `skills/pm-tasks-clickup/dist/**/*.js`; no new runtime dependency (only `@llodev/pm-tasks-core` `workspace:^`).
- **Published content:** files in `package.json` `files` must not link to `docs/specs`, `docs/plans`, roadmap, scripts, `AGENTS.md`/`CLAUDE.md` or say "this repo" (`published-content-lint`). Code, comments, docs and commits in English; localized text only in `i18n/` and `docs/i18n/`.
- **Locales:** `en-US`, `pt-BR`, `es-ES` with identical key sets and non-empty values.
- **Fixtures** in a public repo: no emails, display names, tokens, profile-picture URLs or real workspace/space/list/user ids (replace with consistent synthetic ids of the same length).
- **Style:** run `pnpm format` before each commit (lefthook runs prettier, gitleaks, Conventional Commits); end commit messages with the session's co-author trailer.

## Review Focus

Failure modes the spec implies that no feature test would otherwise pin; each has a test in the owning task:

1. **Pinned status removed/renamed after `init`** → verbs fail closed with `INVALID_REQUEST`, never silently skip; doctor flags drift (Tasks 3, 10).
2. **Task whose home list is not in `config.lists`** (hand-made, relocated by `task.parent.set`) → `INVALID_REQUEST {reason:"list_not_configured"}` (Task 3).
3. **A follow-up call fails after the primary write landed** (estimate tag) → `ok:false` with `details.partial:true` and `applied[]`, never a silent success or an orphan (Task 5); and both the write envelope and the bare task are accepted (Task 2).
4. **Estimate edited/toggled repeatedly** → exactly one `est:*` tag remains; disabled/absent estimation → `NOT_APPLICABLE` (Task 5).
5. **Personal data or a token leaking into committed fixtures/config/logs** → sanitizer test over fixtures; init output never contains the token (Tasks 0a, 0b, 9).

Also pinned: `"me"`/email/numeric assignee behave identically whether the authenticated account is a person or an agent (Task 4).

## Execution notes (maintainer rules)

- Implementers: **opus** for every task (all involve judgment). Reviewers: **opus**, except Task 11's README/i18n subset (sonnet). Never haiku.
- Task 0b needs the maintainer present (sandbox list, delete confirmations): run it **inline in the main session**, not in a subagent.
- Log every dispatch (role, task, model, tokens, duration, from the task-notification `<usage>`) in the **Execution ledger** at the end; every fix round gets a root cause (brief gap / model tier / plan defect / own ruling).
- Order: **1 → 0a → 0b → 2 → 3 → 4 → 5 → 6 (skipped) → 7 → 8 → 10 → 9 → 11 → 12** (Task 10 runs before Task 9 because the init CLI's `--doctor` delegates to `doctor-cli`; a shared `src/env.ts` with `stripEnvQuotes` and `readClickUpToken` is created by Task 10 and consumed by Task 9) (Task 1 first so the package, the vitest project and the fixture sanitizer exist before anything is captured). Tasks 2–6 consume fixtures from 0b; if a needed fixture is missing, stop and run the spike.

## File structure

Create under `skills/pm-tasks-clickup/` (replacing the scaffold's `package.json`, `SKILL.md`, `README.md`):

| File                                                                                                                                         | Responsibility                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `manifest.json`, `LICENSE`, `tsconfig.json`, `vitest.config.ts`                                                                              | as Linear's; `tool: "clickup"`                                                                   |
| `schemas/config.json`                                                                                                                        | `.clickup.json` schema (Task 1)                                                                  |
| `i18n/{en-US,pt-BR,es-ES}.json`                                                                                                              | strings for init/doctor/errors (Task 1)                                                          |
| `src/errors.ts`                                                                                                                              | `classifyError`, `shapeError`                                                                    |
| `src/envelope.ts`                                                                                                                            | `unwrapTask`: wrapped-or-bare response → `ClickUpTaskView`                                       |
| `src/status.ts`                                                                                                                              | `resolveStatus` (pure, config-only)                                                              |
| `src/transport-clickup.ts`                                                                                                                   | `createClickUpTransport` and verb methods                                                        |
| `src/adapter.ts`, `src/index.ts`                                                                                                             | `createAdapter`, exports                                                                         |
| `src/status-map.ts`                                                                                                                          | `mapStatuses` (init: list statuses → config roles)                                               |
| `src/init-api.ts`                                                                                                                            | `ClickUpInitApi`, REST + MCP implementations                                                     |
| `src/init-flow.ts`, `src/bin/init.ts`                                                                                                        | `runInit`, CLI shim (`--doctor` delegates)                                                       |
| `src/doctor-cli.ts`                                                                                                                          | C-CLK checks, `runDoctor`                                                                        |
| `SKILL.md`, `README.md`, `docs/i18n/README.{es-ES,pt-BR}.md`, `references/{operations,estimation,autonomous}.md`, `anti-patterns/clickup.md` | published docs                                                                                   |
| `tests/helpers/mcp-stub.ts`                                                                                                                  | recording `McpCaller` + per-tool allowed-key guard                                               |
| `tests/fixtures/{rest,mcp}/*.json`                                                                                                           | sanitized live captures                                                                          |
| `tests/*.test.ts`                                                                                                                            | one file per source module + `fixtures.sanitized`, `i18n/parity`, `schema`, `init.smoke` (gated) |

Repo-level edits are listed in Task 12.

---

### Task 0a: REST discovery spike (U11, read-only)

**Model:** opus. **Files:** Create `tests/fixtures/rest/{workspaces,spaces,folders,folderless-lists,folder-lists,list}.json`; Modify spec (create `## 14. Spike results`, line for U11).

**Interfaces:** Produces the verbatim (sanitized) REST shapes consumed by Task 8, plus the confirmed auth header form and base URL. Consumes Task 1's `tests/fixtures.sanitized.test.ts` as the gate.

- [ ] **Step 1: Capture** with `zsh -ic 'curl -sS -H "Authorization: $CLICKUP_API_TOKEN" <url>'`, GET only: `https://api.clickup.com/api/v2/team`, then `/team/{team_id}/space`, `/space/{space_id}/folder`, `/space/{space_id}/list` (folderless), `/folder/{folder_id}/list`, `/list/{list_id}` (statuses with `type`). Record HTTP status and the working header form; if `Bearer` is required, record it and fix the Global Constraint. Never print the token.
- [ ] **Step 2: Sanitize** with a throwaway script outside the repo (scratchpad): emails → `user@example.com`, names → `Person N`/`Workspace`/`Space N`/`List N`, ids → consistent synthetic ids of equal length, drop avatar/profile URLs. Save the six fixtures.
- [ ] **Step 3: Run** `pnpm exec vitest run skills/pm-tasks-clickup/tests/fixtures.sanitized.test.ts` → PASS (it now scans real fixtures).
- [ ] **Step 4: Record** in spec §14: auth header form, base URL, the member field names, whether `/team` includes members, pagination behavior, and the observed rate-limit headers.
- [ ] **Step 5: Commit** `test(clickup): capture sanitized REST discovery fixtures`.

### Task 0b: MCP write spikes (U1–U10), maintainer present

**Model:** opus, **inline in the main session**. **Files:** Create `tests/fixtures/mcp/<tool>.<case>.json`; Modify spec `§14`.

**Interfaces:** Produces the response fixtures Tasks 2–7, 8 (MCP path) and 9 rely on, and a **keep/drop decision per verb**.

- [ ] **Step 1: Ask the maintainer** (AskUserQuestion) to name the sandbox list; confirm writes there and deletes afterwards. Nothing is written elsewhere.
- [ ] **Step 2: Load schemas** with ToolSearch for the tools not yet read: `clickup_remove_task_from_list`, `clickup_create_space_tag`, `clickup_get_task_comments` replies if needed; copy their parameter keys into `tests/helpers/mcp-stub.ts` allow-lists later (Task 2).
- [ ] **Step 3: Run each spike**, capturing the verbatim response of every write used (create, update status/due/assignees/parent/time_estimate, move_task, create_comment, add/remove tag, create_space_tag twice, add/remove task list, `task.create_many`) and the `get_task` shape (fields for list id, parent, status, assignees, tags, due, start, subtask count, list memberships):
  - **U1** `update_task.assignees`: add or replace? **U2** envelope shape (wrapped vs bare) and a working `[ct:<token>]` lookup via `clickup_search`/`clickup_filter_tasks`. **U3** parent+subtask `time_estimate` roll-up. **U4** list memberships in `get_task`; behavior with _Tasks in Multiple Lists_ off. **U5** close with open subtasks / required fields. **U6** task URL shape, custom ids. **U7** date-only `due_date` round trip in the account timezone; whether `start_date` needs `due_date` re-sent; completion auto-stamp. **U8** `create_space_tag` on an existing tag; tag case. **U9** `create_many` nulls/order/partial failure. **U10** markdown task list in `markdown_description`; `filter_tasks` pagination and done/closed exclusion.
- [ ] **Step 4: Sanitize** fixtures (same rules as Task 0a), run `pnpm exec vitest run skills/pm-tasks-clickup/tests/fixtures.sanitized.test.ts` → PASS.
- [ ] **Step 5: Delete** every created task one by one with explicit maintainer confirmation (`clickup_delete_task`); confirm the sandbox list is back to its starting state.
- [ ] **Step 6: Record results and decisions** in spec §14: for each spike the result; per verb _keep / drop from v1.0.0 manifest_ (§10 rules: a verb the spike cannot demonstrate is dropped, not shipped); U1 branch; U3 branch (leaf-only or not); U4 branch (sprint add-only or add+remove).
- [ ] **Step 7: Commit** `test(clickup): capture sanitized MCP fixtures and spike results`.

### Task 1: Package skeleton, config schema, i18n

**Model:** opus. **Files:** Modify `package.json` (from Linear's: drop `private`, version `1.0.0`, description/keywords for ClickUp, `bin: {"pm-tasks-clickup": "./dist/bin/init.js"}`, `exports`, `files`, `engines`); Create `tsconfig.json`, `vitest.config.ts` (name `pm-tasks-clickup`), `manifest.json`, `LICENSE`, `schemas/config.json`, `i18n/*.json`, `src/index.ts` (stub), `tests/schema.test.ts`, `tests/i18n/parity.test.ts`, `tests/fixtures.sanitized.test.ts`; run `pnpm install` to refresh `pnpm-lock.yaml`.

**Interfaces:** Produces the config contract (§5) every later task types against, and the string keys `init`/`doctor` use.

`manifest.json`: `{"tool":"clickup","verbs":[` the 10 canonical verbs`]}` (Task 7 reconciles with spike results).

`schemas/config.json` (draft 2020-12, `additionalProperties:false` at root): required `version`, `workspace`, `lists`; `locale` enum `["en-US","pt-BR","es-ES"]`; `attribution` `$ref` `https://llodev.com/pm-tasks/attribution.schema.json` (as asana/trello); `workspace {id,name}`; `lists` (minItems 1) items `{id,name,space?,folder?,statuses{open,done required; wip,closed optional}}`; `defaultListId`; `members[] {id,name,email?,alias?}`; `estimation {strategy enum (Linear's 8), clickupTarget enum ["time","none"], enabled?, hoursPerDay? number min 1 max 24, scale?, sizeMap?}` required `strategy`,`clickupTarget`; `sprints {enabled required, lists[] {id,name}}`; `defaults {assigneeAlias?, escalateToAlias?}`; `autonomous {enabled, allow required; allow items enum = the 10 verbs; scope {lists[]}; rateLimit {writesPerMinute, commentsPerMinute}; auditLog}`.

Flag semantics (pinned): `autonomous.enabled` must be explicitly `true`; `estimation` absent or `enabled:false` ⇒ disabled; `sprints` absent or `enabled` falsy ⇒ disabled.

i18n keys: Linear's set with `team*`→`workspace*`/`list*`, plus `wipStatusPrompt`, `noWipStatus`, `sprintsPrompt`, `errorListNotConfigured`, `errorRoleNotConfigured`, `errorDetachUnsupported`, `errorPartial`, `doctorStatusDrift`, `doctorNoProbe`.

- [ ] **Step 1: Write `tests/schema.test.ts`** with these tests (validate via core `validateConfig`): `accepts a minimal valid config`; `rejects a config without lists`; `rejects a list without statuses.done`; `rejects unknown root keys`; `rejects autonomous.allow with a non-canonical verb`; `rejects clickupTarget "points"`; `accepts hoursPerDay 6 and rejects 0 and 25`.
- [ ] **Step 2: Write `tests/i18n/parity.test.ts`** (copy Jira's): same key set across the 3 locales, non-empty strings.
- [ ] **Step 2b: Write `tests/fixtures.sanitized.test.ts`**, test `fixtures contain no personal data`: for every `*.json` under `tests/fixtures/**` (passes vacuously while the directory is empty), assert no match for `/[\w.+-]+@[\w-]+\.[\w.]+/` except `user@example.com`, `/pk_\d+_/i`, `/attachments\.clickup\.com/`, and that the value of `CLICKUP_API_TOKEN` (when set) does not appear in any fixture.
- [ ] **Step 3: Run** `pnpm exec vitest run skills/pm-tasks-clickup` → FAIL (no schema/i18n).
- [ ] **Step 4: Implement** the files above; pt-BR and es-ES must be real translations with all diacritics.
- [ ] **Step 5: Verify** `pnpm --filter @llodev/pm-tasks-clickup build && pnpm exec vitest run skills/pm-tasks-clickup` → PASS; `node scripts/checks/validate-schemas.mjs` and `validate-locale-parity.mjs` still pass (parity list is updated in Task 12).
- [ ] **Step 6: Commit** `feat(clickup): package skeleton, config schema and i18n`.

### Task 2: Transport foundation and `task.create`

**Model:** opus. **Files:** Create `src/errors.ts`, `src/envelope.ts`, `src/status.ts`, `src/transport-clickup.ts`, `tests/helpers/mcp-stub.ts`, `tests/envelope.test.ts`, `tests/status.test.ts`, `tests/transport-create.test.ts`.

**Interfaces:**

- Produces `type McpCaller = (toolName: string, args: Record<string, unknown>) => Promise<unknown>`.
- `interface ClickUpTaskView { id: string; url?: string; status?: string; listId?: string; parentId: string|null; assigneeIds: string[]; tagNames: string[]; dueDate: string|null; subtaskCount: number }` (`dueDate` = ISO instant of the stored epoch-ms, or null) and `unwrapTask(resp: unknown): ClickUpTaskView | null`: reads a bare `get_task` object (`id`, `url`, `status` string, `list.id`, `parent`, `assignees[].id` as strings, `tags[].name`, `due_date` epoch-ms string, `subtasks_count` or `subtasks.length`) **and** a write envelope `{success, task_id, custom_id, task_url}` (`task_id`→`id`, `task_url`→`url`, other fields defaulted); `null` when neither has an id. A `callTool(mcp, tool, args)` helper turns a resolved `{error}` (no `success`) into a thrown error so verbs handle both the same.
- `type StatusRole = "open"|"wip"|"done"`; `resolveStatus(config: ClickUpConfig, listId: string, role: StatusRole): {ok:true; status:string} | {ok:false; reason:"list_not_configured"|"role_not_configured"}`.
- `classifyError(e: unknown): {code: TransportErrorCode; details: Record<string,unknown>}` (404/not found → `NOT_FOUND`; 401/403/unauthorized/forbidden → `AUTH_ERROR`; 429/rate limit → `RATE_LIMITED`; else `MCP_ERROR`); `shapeError(verb: string)`.
- `createClickUpTransport(opts: {mcp: McpCaller; config: ClickUpConfig}): ClickUpTransport`, where `ClickUpTransport = Omit<Transport,"taskEstimateSet"> & {taskEstimateSet?(req: ClickUpTaskEstimateSetRequest): Promise<TransportResult<TaskEstimateSetResponse>>}`; `ClickUpConfig` mirrors §5 (types in this file, exported).
- `tests/helpers/mcp-stub.ts`: `makeMcp(responses: Map<string, unknown>, allowedKeys?: Record<string, Set<string>>): {mcp: McpCaller; calls: {tool:string; args:Record<string,unknown>}[]}`; throws on unknown keys (per-tool allow-lists copied verbatim from the schemas) and on unexpected tools; an `Error` response is thrown.

`taskCreate` maps: `boardOrProjectId`→`list_id`, `listOrSectionId`→`status` (omitted when empty), `name`, `description`→`markdown_description` (+ `[ct:<token>]` footer when `clientToken`), `labels`→`tags`, `priority` (`urgent|high|normal|medium→normal|low`, case-insensitive; unknown omitted), `dueDate`→`due_date` (first 10 chars), `workspace_id`; `estimate` ignored (SKILL path calls `task.estimate.set`). Returns `{id: task_id, url: task_url}`; `url` falls back to `https://app.clickup.com/t/<id>` when absent (U6).

- [ ] **Step 1: Write failing tests.** `envelope.test.ts`: `unwrapTask reads a bare task`, `unwrapTask reads a write envelope (task_id/task_url)`, `unwrapTask returns null without an id`. `status.test.ts`: `resolves open/wip/done from the task list`, `list_not_configured for an unknown list`, `role_not_configured when wip is absent`. `transport-create.test.ts`: `sends exactly create_task keys` (stub guard), `maps list/status/priority/tags/dueDate`, `embeds [ct:token] footer`, `ignores estimate`, `returns id and url`, `classifies 404/403/429/other`, `a resolved {error} is classified like a thrown error`, `INVALID_REQUEST when boardOrProjectId is empty`, `always sends workspace_id`.
- [ ] **Step 2: Run** `pnpm exec vitest run skills/pm-tasks-clickup` → FAIL.
- [ ] **Step 3: Implement** the signatures above; tests import the Task 0b fixtures for envelope shapes.
- [ ] **Step 4: Run** → PASS; `pnpm --filter @llodev/pm-tasks-clickup typecheck` clean.
- [ ] **Step 5: Commit** `feat(clickup): transport foundation and task.create`.

### Task 3: Status verbs — `task.move`, `task.close`, `checklist.check`

**Model:** opus. **Files:** Modify `src/transport-clickup.ts`; Create `tests/transport-status.test.ts`.

**Interfaces:** Consumes Task 2's `resolveStatus`, `unwrapTask`, `makeMcp`. Produces internal `readTask(taskId): Promise<TransportResult<ClickUpTaskView>>` (one `clickup_get_task {task_id, workspace_id}`).

Behavior (§4): all three read the task first.

- `taskMove`: `open|wip|done` → status of the task's list via `resolveStatus`, then `clickup_update_task {task_id, status}`; already in that status → `ALREADY_IN_STATE`. A value matching `^\d{6,}$` is a destination **list id** → `clickup_move_task {task_id, list_id}`; a task with a parent → `INVALID_REQUEST {reason:"subtask_cannot_move"}`. Response `{previousListOrSectionId, newListOrSectionId}`.
- `taskClose`: status of role `done`; already there → `{closed:true}` with no write.
- `checklistCheck`: `itemId` is the subtask id; the subtask's `parentId` must equal `checklistId` else `INVALID_REQUEST`; `complete`→`done`, `incomplete`→`open`; response `{previousState,newState}` derived from the current status vs the `done` status.
- Resolution failure → `INVALID_REQUEST {reason, listId}` (Review Focus 1, 2). An `update_task` error matching `/status does not exist/i` → `INVALID_REQUEST {reason:"status_rejected", status, listId}` (S6); any other error propagates through `classifyError`, never swallowed.

- [ ] **Step 1: Write failing tests** in `transport-status.test.ts`: `move wip resolves the list's pinned status`, `move to the current status is ALREADY_IN_STATE`, `move with a numeric list id calls move_task`, `move of a subtask by list id is INVALID_REQUEST`, `move to a pinned status the list rejects ({error:"Failed to update task: Status does not exist"}) is INVALID_REQUEST status_rejected`, `list_not_configured for a hand-made task`, `role_not_configured when wip absent`, `close uses the done status and is a no-op when already done`, `checklist.check completes and reopens a subtask`, `checklist.check rejects an item whose parent differs`, `localized status names pass through verbatim`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(clickup): task.move, task.close and checklist.check`.

### Task 4: `task.due-date.set`, `task.assignee.add`, `task.comment.add`, `task.parent.set`

**Model:** opus. **Files:** Modify `src/transport-clickup.ts`; Create `tests/transport-fields.test.ts`.

**Interfaces:** Consumes `readTask`, `unwrapTask`. Core types: `TaskDueDateSetRequest {taskId, dueAt}`, `TaskAssigneeAddRequest {taskId, userId}`, `TaskCommentAddRequest {taskId, text, clientToken?}`, `TaskParentSetRequest {taskId, parentId}`.

- `taskDueDateSet`: `due_date = dueAt.slice(0,10)` via `clickup_update_task`; `previousDueAt` = ISO instant of the stored epoch-ms or null; skip the write (core idempotency: no-op if equal) when the stored instant's LOCAL date equals the requested date, computed with the `utc_offset` of `clickup_get_user` (read once per transport and cached; if that call fails, write anyway). Date-only values are stored at 04:00 local (S5).
- `taskAssigneeAdd`: if `userId` is not numeric, resolve it first with `clickup_resolve_assignees {assignees:[userId]}`; if already assigned → `{added:false, currentAssigneeIds}` with no write; otherwise write the **union** of the current assignee ids and the new id (S2: `update_task.assignees` replaces); `resolve_assignees` returns `{userIds:["…"]}` as strings. Identity-agnostic: `"me"`, email and numeric id behave the same (Task note).
- `taskCommentAdd`: `clickup_create_comment {entity_type:"task", entity_id, comment_text, workspace_id}`; with `clientToken`, prefix `[ct:<token>] ` and first scan `clickup_get_task_comments {task_id}` (first page; `comment_text` ends with a newline, match with `includes`) for the marker → return the existing comment without posting. Attribution prefix is applied by the core handler, not here.
- `taskParentSet`: `clickup_update_task {task_id, parent}`; `previousParentId` from the read; `parentId == null` → `NOT_APPLICABLE {reason:"detach_unsupported"}`.

- [ ] **Step 1: Write failing tests**: `due date writes YYYY-MM-DD and skips when the local date is unchanged (offset from get_user, cached once)`, `due date writes anyway when get_user fails`, `due date round trip uses fixture shape (U7)`, `assignee already present is a no-op`, `assignee "me" resolves then is idempotent`, `assignee write sends the union of current and new ids`, `comment embeds the token and posts once`, `comment with an existing token is not reposted`, `comment uses clickup_create_comment not the deprecated tool`, `parent.set sends parent and returns previous`, `parent.set with null is NOT_APPLICABLE`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(clickup): due date, assignee, comment and parent verbs`.

### Task 5: `task.estimate.set`

**Model:** opus. **Files:** Modify `src/transport-clickup.ts`; Create `src/estimation.ts`, `tests/transport-estimate.test.ts`.

**Interfaces:** `interface ClickUpEstimationConfig { strategy: EstimationStrategy; clickupTarget: "time"|"none"; scale?: number[]; sizeMap?: Record<string,number>; hoursPerDay?: number }`; `interface ClickUpTaskEstimateSetRequest { taskId: string; input: EstimateInput; config: ClickUpEstimationConfig }`; `toMinutes(timeString: string, hoursPerDay: number): number` (`"2h"`→120; `"1.5d"`→`1.5*hoursPerDay*60`, rounded); `slugify(s: string): string` (as Linear's).

Flow: disabled (`estimation` absent or `enabled === false`) → `NOT_APPLICABLE`. `normalizeEstimate(input, {strategy, jiraTarget: clickupTarget==="time" ? "time" : "none", scale, sizeMap})`; failure → `INVALID_REQUEST`. When `clickupTarget==="time"` and the result has a `timeString`: `clickup_update_task {task_id, time_estimate: String(minutes)}` (leaf-only: skip the native write when the task's `subtasks_count > 0`, read from a plain `get_task` without `include`; S4). Then replace-set the tag: read tags, `clickup_remove_tag_from_task` for every `est:*` that differs, `clickup_create_space_tag` if needed (per U8), `clickup_add_tag_to_task {tag_name: "est:<slug>"}`. Response `{normalized, fieldWritten: "time_estimate"|null}`. A failure after the first write → `ok:false`, `MCP_ERROR`, `details {partial:true, applied:["time_estimate"], failedStep}` (A3). `create_space_tag` is idempotent (`created:false` on an existing tag, name lowercased) and `remove_tag_from_task` ignores case.

- [ ] **Step 1: Write failing tests**: `ideal_hours 2 writes 120 minutes`, `ideal_days 1.5 with hoursPerDay 6 writes 540`, `point strategies write only the est tag`, `disabled estimation is NOT_APPLICABLE (absent and enabled:false)`, `re-run leaves exactly one est tag` (stub with a stale `est:3`), `toggling target time→none stops writing time_estimate`, `tag failure after the estimate write is partial`, `a task with subtasks gets only the est tag (fieldWritten null)`, `slugify and toMinutes unit cases`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(clickup): task.estimate.set`.

### Task 6: `task.sprint.set` — SKIPPED (dropped in Task 0b, S3)

**Do not dispatch.** `add_task_to_list` fails with a plan-limit error on the maintainer's plan, so the verb could not be demonstrated and is dropped from v1.0.0 (spec §10). The text below is kept for a later release.

**Model:** opus. **Files:** Modify `src/transport-clickup.ts`; Create `tests/transport-sprint.test.ts`.

**Interfaces:** Core `TaskSprintSetRequest {taskId, sprintRef}` → `TaskSprintSetResponse {previousSprintRef, newSprintRef}`. A sprint is an entry of `config.sprints.lists`; `sprintRef` matches `id` or `name` (case-insensitive).

Flow: `sprints` absent or `enabled` falsy → `NOT_APPLICABLE {reason:"sprints_disabled"}`; unknown ref → `NOT_APPLICABLE {reason:"sprint_not_found"}`; read memberships (per **U4**): already in the target → no-op ok; else `clickup_add_task_to_list {task_id, list_id}`, then `clickup_remove_task_from_list` for every other configured sprint list the task is in; an error matching `/multiple lists/i` → `NOT_APPLICABLE {reason:"multiple_lists_disabled"}`; remove failing after add → partial (A3). If U4 showed memberships are not exposed, implement **add-only** and keep a test documenting it. If the verb was dropped in Task 0b, skip this task and remove it from the manifest in Task 7.

- [ ] **Step 1: Write failing tests**: `disabled sprints are NOT_APPLICABLE`, `unknown sprint is NOT_APPLICABLE`, `adds to the sprint list by name and by id`, `moving between sprints removes the previous configured sprint list`, `already in the target sprint is a no-op`, `multiple-lists-disabled error maps to NOT_APPLICABLE`, `remove failure after add is partial`, `toggling sprints enabled with a task already in a sprint list does not touch other lists`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(clickup): task.sprint.set`.

### Task 7: Adapter factory, runtime integration, manifest reconciliation

**Model:** opus. **Files:** Create `src/adapter.ts`, `tests/adapter.test.ts`; Modify `src/index.ts`, `manifest.json` (nine verbs, no `task.sprint.set`), `schemas/config.json` (remove `task.sprint.set` from the `autonomous.allow` enum and delete the `sprints` property), `i18n/{en-US,pt-BR,es-ES}.json` (delete `sprintsPrompt` and `sprintListsPrompt`), and the Task 1 tests that mention sprints or the verb count (`tests/schema.test.ts`).

**Interfaces:** `interface CreateAdapterOptions { configPath: string; mcp: McpCaller; session?: string; language?: string }`; `createAdapter(opts): Promise<Runtime>` — reads the config, builds the transport, returns `createCoreRuntime({tool:"clickup", configPath, transport: transport as unknown as Transport, session, language})` (the cast mirrors Linear's `taskEstimateSet` narrowing). `src/index.ts` exports `createAdapter`, `createClickUpTransport`, `McpCaller`, the config/transport types.

- [ ] **Step 1: Write `tests/adapter.test.ts`** (pattern: Linear's, temp dir + `LLODEV_PM_TASKS_LOG_DIR`, omnibus stub built from the Task 0b fixtures): `every manifest verb runs through the runtime and returns the ok envelope with tool "clickup"`, `a verb absent from the manifest is UNSUPPORTED_VERB`, `the audit log records the verb`, `manifest verbs equal the schema's autonomous.allow enum`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; reconcile `manifest.json` and the `allow` enum with the Task 0b keep/drop decisions. **Step 4: Run** → PASS; `pnpm contract:check` passes (SKILL.md literal check is satisfied in Task 11; run it there if it fails here).
- [ ] **Step 5: Commit** `feat(clickup): adapter factory and runtime integration`.

### Task 8: Init discovery APIs (REST + MCP) and status mapping

**Model:** opus. **Files:** Create `src/status-map.ts`, `src/init-api.ts`, `tests/status-map.test.ts`, `tests/init-api.test.ts`, `tests/init.smoke.test.ts` (gated).

**Interfaces:**

- `interface ClickUpStatus {status: string; type: "open"|"custom"|"done"|"closed"; orderindex?: number}`; `mapStatuses(s: ClickUpStatus[]): {open: string; done: string; closed?: string; wipCandidates: string[]} | {error: "no_open_status"}` (open = type `open`; done = type `done`, else the `closed` one; closed = the `closed`-type status when distinct from done; wipCandidates = `custom` statuses by `orderindex`).
- `interface ClickUpListSummary {id: string; name: string; space: {id: string; name: string}; folder?: {id: string; name: string}}`; `interface ClickUpMember {id: string; name: string; email?: string}`.
- `interface ClickUpInitApi { getWorkspaces(): Promise<{id:string;name:string}[]>; getLists(workspaceId: string): Promise<ClickUpListSummary[]>; getListStatuses(listId: string): Promise<ClickUpStatus[]>; getMembers(workspaceId: string): Promise<ClickUpMember[]> }`.
- `createRestInitApi(token: string, fetchFn?: typeof fetch): ClickUpInitApi` — base `https://api.clickup.com/api/v2`, header per Task 0a; `getLists` flattens spaces → folders → lists plus folderless lists.
- `createMcpInitApi(mcp: McpCaller): ClickUpInitApi` — `clickup_get_workspace_hierarchy {max_depth:"2"}` following `next_cursor`, `clickup_get_list {list_id}`, `clickup_get_workspace_members`.

- [ ] **Step 1: Write failing tests.** `status-map.test.ts`: the observed set (`to do`, `planning`, `in progress`, `at risk`, `update required`, `on hold`, `complete`, `cancelled`) → `open:"to do"`, `done:"complete"`, `closed:"cancelled"`, candidates in order; `no done type falls back to the closed type`; `no custom statuses gives empty candidates`; `no open status is an error`. `init-api.test.ts` (with `fetchFn` stub serving the Task 0a fixtures): `sends the Authorization header exactly as captured (no Bearer unless 0a says so)`, `calls only GET`, `flattens spaces, folders and folderless lists`, `maps statuses`, `MCP path follows next_cursor`, `HTTP 401 throws a clear error without echoing the token`. `init.smoke.test.ts`: gated on `CLICKUP_API_TOKEN`, read-only, asserts the same shapes against the real API.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS (smoke skipped without the token; run it once with `zsh -ic` and report).
- [ ] **Step 5: Commit** `feat(clickup): init discovery APIs and status mapping`.

### Task 9: Init flow and CLI shim

**Model:** opus. **Files:** Create `src/init-flow.ts`, `src/bin/init.ts`, `tests/init.test.ts`.

**Interfaces:** Consumes Task 8. `interface InitDeps { api?: ClickUpInitApi; mcp?: McpCaller; pick?: PickFn; yesNo?: (q: string) => Promise<boolean>; locale?: string; doWrite?; doValidate?; doLoadSchema?; outPath?: string; env?: NodeJS.ProcessEnv }`; `runInit(deps?: InitDeps): Promise<Record<string, unknown>>`; `stripEnvQuotes(v: string): string`. Helpers from `@llodev/pm-tasks-core/init-lib` (`promptLocale`, `promptPick`, `promptYesNo`, `multiSelect`, `writeConfig`, `validateConfig`, `printInstructions`, `loadStrings`, `registerI18nRoot`), as in Linear's `init-flow.ts`.

Credential order: `deps.api` → `deps.mcp` → `CLICKUP_API_TOKEN` → instructions naming both ways, exit 1. Steps: locale → workspace (auto when one) → lists via `multiSelect` → per list `mapStatuses` + **pick `wip`** among candidates (skip with a warning when none) → `defaultListId` (first) → optional member cache (yesNo) → estimation strategy + `clickupTarget` (default `time` for `ideal_*`, else `none`) → autonomous block (yesNo; `allow` = manifest verbs, `scope.lists` = chosen lists, `enabled:false`) → assemble, validate against `schemas/config.json`, write. `bin/init.ts` mirrors Linear's (`--doctor` delegates, `--output`).

- [ ] **Step 1: Write failing tests** (fake `api`, scripted `pick`/`yesNo`): `writes a config that validates and pins statuses per list`, `asks for wip among the custom statuses`, `done falls back to the closed status`, `multiple lists keep separate status maps`, `autonomous block defaults to enabled:false with scope.lists`, `estimation target defaults follow the strategy`, `members are cached only when accepted`, `no credentials exits 1 and the message names CLICKUP_API_TOKEN and the MCP`, `the written config and stdout never contain the token value`, `existing config uses the core overwrite UX`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `pnpm --filter @llodev/pm-tasks-clickup build` and run `node skills/pm-tasks-clickup/dist/bin/init.js --doctor` against a fixture config to check the shim.
- [ ] **Step 5: Commit** `feat(clickup): init flow and CLI`.

### Task 10: Doctor

**Model:** opus. **Files:** Create `src/doctor-cli.ts`, `tests/doctor-cli.test.ts`.

**Interfaces:** `interface ClickUpProbe { getWorkspaces?(): Promise<{id: string}[]>; getListStatuses?(listId: string): Promise<string[]> }`; `makeClickUpChecks(probe?: ClickUpProbe): DoctorCheck[]`; `ADAPTER_CHECKS: DoctorCheck[]`; `runDoctor({tool, argv}: {tool: string; argv: string[]}): Promise<void>` (flags `--json`, `--fix-hints-only`, `--config`, as Linear). `DoctorCheck`/`runChecks`/`renderReport` from core (`@llodev/pm-tasks-core/doctor`). Probe source: `createRestInitApi` when `CLICKUP_API_TOKEN` is set, else the injected probe, else skipped with `ok:true` and an advisory message.

Checks: **C-CLK-1** config present and parseable; **C-CLK-2** `workspace.id` present; **C-CLK-3** every list has `statuses.open` and `statuses.done`; **C-CLK-4** estimation coherent (`clickupTarget:"time"` with a point strategy → warn; `hoursPerDay` in 1–24); **C-CLK-5** is intentionally unused (sprints dropped from v1.0.0; the other ids stay stable); **C-CLK-6** `autonomous.scope.lists ⊆ lists[].id` and `defaults.*Alias` resolve (`"me"` always valid); **C-CLK-7** credentials/workspace reachable (live); **C-CLK-8** every list resolves and each pinned status exists in the live list (drift, with `fixHint` to re-run init) (live).

- [ ] **Step 1: Write failing tests**: one pass and one fail per static check; `C-CLK-6 fails when scope names an unconfigured list`; `C-CLK-8 reports drift when a pinned status was renamed`; `live checks skip with ok:true and an advisory when no probe and no token`; `--json output is parseable`; `--config override is honored`; `the token never appears in reports`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(clickup): doctor checks`.

### Task 11: SKILL.md, references, READMEs

**Model:** opus (implementer); reviewer opus for `SKILL.md`/references, sonnet for README/i18n. **Files:** Replace `SKILL.md`, `README.md`; Create `references/{operations,estimation,autonomous}.md`, `anti-patterns/clickup.md`, `docs/i18n/README.{es-ES,pt-BR}.md`; Modify `scripts/snapshots/skill-judge-*.json` in Task 12.

**Interfaces:** Follows Linear's structure (headings: Routing, ClickUp model, Phase 4 formatting, Phase 5 MCP publish, Phase 5b autonomous, Phase 6 CRUD, Phase 7 plan-execution, Result envelope, Anti-patterns, Standalone fallback, Config, Init, narration-language banner). Frontmatter: `name: pm-tasks-clickup`, a trigger-rich `description`, `license: MIT`, `metadata {version: 1.0.0, family: pm-tasks, role: adapter, tool: clickup}`; no scaffold markers.

Must state, from the spikes and design: verb→tool table (`operations.md`); modes (paste-ready renders checklist items as a markdown task list per U10; MCP publish; autonomous; plan-execution lister scoped by `autonomous.scope.lists` else all `lists`, `clickup_filter_tasks {list_ids, subtasks:false, statuses:[<pinned open and wip names>]}` (S8: `include_closed:false` does not drop done-type tasks)); checklist items are **subtasks** (native checklists are not writable); start-date guidance (A2); `[ct:<token>]` lookup (A4); status-by-config (`list_not_configured` → re-run init); `wip` is pinned at init; estimation (native `time_estimate` on leaf tasks vs the `est:` tag); parent.set relocates the task (A1); identity-agnostic `"me"` and separate agent accounts as an option, not a requirement; per-adapter anti-patterns (hard-coded status names, deprecated comment tool, assuming `update_task.assignees` semantics outside the U1 result, fake `- [ ]` checklists on publish, writing parent and child estimates if U3 says they roll up). Every verb in `manifest.json` appears literally in `SKILL.md`.

- [ ] **Step 1:** Write the files in English, then the pt-BR and es-ES READMEs (complete translations).
- [ ] **Step 2: Verify** `node scripts/checks/validate-frontmatter.mjs`, `validate-links.mjs`, `validate-localized-paths.mjs`, `published-content-lint.mjs`, `pnpm contract:check` → all pass.
- [ ] **Step 3: Score** with the `skill-judge` skill; record the score for Task 12.
- [ ] **Step 4: Commit** `docs(clickup): SKILL, references and READMEs`.

### Task 12: Repo wiring, spec amendments, release gate

**Model:** opus. **Files:** Modify `.claude-plugin/marketplace.json` (entry `pm-tasks-clickup`, version `1.0.0`, keywords, description), `packages/pm-tasks/package.json` (peer `^1.0.0` + dev `workspace:*`, description, README list) and add `.changeset/<name>.md` (`"@llodev/pm-tasks": minor`), `README.md` + `docs/i18n/README.{es-ES,pt-BR}.md` (row → ✅ v1.0.0; scaffold count 5 → 4; tree/adapter-pool lines), `docs/roadmap.md` (remove the S3 row; baseline line; per-adapter verb counts in §5), `Makefile` (`init-clickup` target), `package.json` (size-limit entry `13 kB`), `scripts/checks/validate-locale-parity.mjs` (add `pm-tasks-clickup`), `scripts/checks/tarball-snapshot.test.mjs` (`PACKAGES`) and `scripts/snapshots/tarball-snapshot.json` (entry from the same `pnpm pack` listing the test uses), `scripts/checks/canary-version.test.mjs` (add a clickup `includes` assertion), `scripts/snapshots/skill-judge-baseline.json` and `skill-judge-golden.json` (entry for the new `SKILL.md`, score from Task 11); Modify the spec: apply A1–A4, remove the sprint text from §4, §5 and §7 (verb dropped), and finalize §14. A6 (the `attribution` example now shows the core object) is already applied.

- [ ] **Step 1:** Make the edits above. **Step 2: Verify** `make build`, `make test`, `make typecheck`, `make lint`, `make validate`, `pnpm size`, `pnpm exec size-limit`, `node scripts/checks/marketplace-parity.mjs`, `pnpm changeset status --verbose`. All pass; paste the summary lines.
- [ ] **Step 3: Whole-branch review** by a fresh **opus** reviewer given the diff, the spec and this plan; act on findings in one round.
- [ ] **Step 4: Print, do not run, the first-publish commands** (repo rule; `npm view @llodev/pm-tasks-clickup` is E404) and tell the maintainer to run them and configure the trusted publisher **before merge**:

```bash
npm whoami
npm view @llodev/pm-tasks-clickup version      # E404 → first publish
cd skills/pm-tasks-clickup
npm publish --access public --dry-run          # confirm the tarball, then:
npm publish --access public
cd -
npm trust github "@llodev/pm-tasks-clickup" --repo llodev/skills --file release.yml --allow-publish -y
npm trust github "@llodev/pm-tasks-clickup" --repo llodev/skills --file canary-publish.yml --allow-publish -y
```

The canary trusted publisher is needed because a non-private `pm-tasks-*` package joins the canary list automatically; an unused trusted-publisher config expires 48 hours after creation (`docs/publishing-guide.md` §12).

- [ ] **Step 5: Commit** `feat(release): clickup v1.0.0 — ClickUp adapter`. Push/PR only when the maintainer asks.

---

## Execution ledger

One row per dispatch; tokens and duration come from the task-notification `<usage>` block. A fix round resumes the same implementer, so its row holds only the tokens added by the round (the duration of those resumes was not logged). Task 6 was folded into task 5 by a plan ruling, so it has no dispatch.

| Task | Role                                 | Model               | Tokens  | Duration   | Fix round | Root cause                                                                   |
| ---- | ------------------------------------ | ------------------- | ------- | ---------- | --------- | ---------------------------------------------------------------------------- |
| 0a   | implementer                          | opus                | 121,939 | 462 s      |           |                                                                              |
| 0a   | reviewer (spec+quality)              | sonnet              | 78,495  | 89 s       |           | first reviewer died with the session crash (usage not recoverable)           |
| 0b   | implementer                          | inline (controller) | —       | —          |           |                                                                              |
| 0b   | reviewer                             | sonnet              | 146,570 | 313 s      |           |                                                                              |
| 0b   | re-review                            | sonnet              | 93,228  | 135 s      | 1         | own prose in the spec (inline execution, no pre-mortem on the facts)         |
| 1    | implementer                          | opus                | 169,761 | 618 s      |           |                                                                              |
| 1    | reviewer                             | opus                | 115,320 | 262 s      |           |                                                                              |
| 2    | implementer                          | opus                | 162,854 | 500 s      |           |                                                                              |
| 2    | reviewer                             | opus                | 136,669 | 255 s      |           |                                                                              |
| 3    | implementer                          | opus                | 197,030 | 620 s      |           |                                                                              |
| 3    | reviewer                             | opus                | 130,974 | 312 s      |           |                                                                              |
| 3    | fix round (same implementer)         | opus                | 41,296  | not logged | 1         | brief gap: `readTask` accepted partial reads                                 |
| 3    | re-review                            | sonnet              | 89,614  | 78 s       |           |                                                                              |
| 4    | implementer                          | opus                | 208,908 | 667 s      |           |                                                                              |
| 4    | reviewer                             | opus                | 141,247 | 358 s      |           |                                                                              |
| 5    | implementer                          | opus                | 236,694 | 827 s      |           |                                                                              |
| 5    | reviewer                             | opus                | 136,596 | 340 s      |           |                                                                              |
| 6    | skipped (folded into 5, plan ruling) | —                   | —       | —          |           |                                                                              |
| 7    | implementer                          | opus                | 227,226 | 697 s      |           |                                                                              |
| 7    | reviewer                             | opus                | 121,232 | 284 s      |           |                                                                              |
| 8    | implementer                          | opus                | 168,427 | 636 s      |           |                                                                              |
| 8    | reviewer                             | opus                | 117,850 | 236 s      |           |                                                                              |
| 10   | implementer                          | opus                | 265,710 | 1082 s     |           |                                                                              |
| 10   | reviewer                             | opus                | 155,658 | 368 s      |           |                                                                              |
| 10   | fix round (same implementer)         | opus                | 47,777  | not logged | 1         | my brief wording widened C-CLK-6 beyond core C-CFG-4                         |
| 10   | re-review                            | sonnet              | 88,352  | 86 s       |           |                                                                              |
| 9    | implementer                          | opus                | 308,267 | 1078 s     |           |                                                                              |
| 9    | reviewer                             | opus                | 148,820 | 360 s      |           |                                                                              |
| 11   | implementer                          | opus                | 362,698 | 1058 s     |           |                                                                              |
| 11   | reviewer (truth check vs code)       | opus                | 204,695 | 477 s      |           |                                                                              |
| 11   | reviewer (README/i18n)               | sonnet              | 107,808 | 161 s      |           |                                                                              |
| 11   | fix round (same implementer)         | opus                | 19,628  | not logged | 1         | implementer error: 3 false doc statements                                    |
| 11   | re-review                            | sonnet              | 117,521 | 151 s      |           |                                                                              |
| 12   | implementer                          | opus                | 355,368 | 1150 s     |           |                                                                              |
| 12   | final whole-branch review            | opus                | 293,847 | 952 s      |           |                                                                              |
| 12   | final fix wave                       | opus                | 270,041 | 805 s      | 1         | review findings (doctor 401, lister filter, config guards, shipped comments) |
| 12   | scoped re-review of the wave         | opus                | 176,939 | 343 s      |           |                                                                              |

**Totals:** 5,765,059 subagent tokens (opus 5,043,471; sonnet 721,588), about 4 h 23 min of summed subagent time (15,760 s; implementers and reviewers ran one after another), 36 dispatches. **Fix rounds: 5** (task 0b, 3, 10 and 11, plus the single final fix wave after the whole-branch review). Every task-level fix round came from a brief or my own text, none from model tier.

**Lessons for the next adapter:**

1. Run the live spikes before writing the briefs. Four design assumptions changed in the spikes (write envelope, `assignees` replace, sprint verb unavailable, dates stored at 04:00); briefs written afterwards were right the first time.
2. Put partial-read and wrong-shape failures in the pre-mortem of every read-then-write verb (task 3 root cause).
3. Do not widen a cross-module rule beyond the core. The doctor alias rule contradicted core C-CFG-4 because the brief said so (task 10 root cause).
4. Have documentation reviewers verify each claim against the code, not only the prose. Task 11 shipped three false statements that a prose-only review would have passed.
5. Measure the size budget early. The 13 kB budget copied from Linear was a placeholder; the real adapter is about 24 kB brotli, with roughly a third of the shipped JS being comments.
6. Tell implementers to use the session's attribution trailer; the branch trailers say Opus 5.5 where the repository convention is Sonnet 5.5.

## Self-review

- **Spec coverage:** §1–§2 → Tasks 1, 11; §3 → 0a, 0b; §4 verbs → 2–6 (modes, lifecycle, idempotency → 11, A1–A4); §5 config/doctor → 1, 10; §6 efficiency → 2–6 (no discovery at runtime), 8; §7 approach C → whole plan, v1.1.0 batch out of scope; §8 wiring/first publish → 12; §9 pre-mortem → Review Focus + tests in 2–6, 9, 10; §10 spikes → 0a, 0b; §11 gates → 12; §12 D1-b → 8–10.
- **Out of scope (v1.1.0, separate plan after U9):** `clickup.task.batch-create-with-subtasks` on `task.create_many`.
