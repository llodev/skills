# Linear CRUD operations (v1)

Verb → MCP tool mapping for `@llodev/pm-tasks-linear`. All verbs return the core result envelope; see [`../../pm-tasks-core/references/contract.md`](../../pm-tasks-core/references/contract.md) § Result envelope.

## Verb → MCP tool

| Core verb           | Linear MCP tool (`mcp__linear__*`)                           | Request arg(s)                                                                                          | Notes                                                                                                                                       |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | `save_issue` (no `id`)                                       | `team`, `title`, `description?`, `state?`, `assignee?`, `labels?`, `dueDate?`, `estimate?`, `parentId?` | No `id` = create; embed `clientToken` in description as `[ct:<token>]`; sub-issues per Phase 5                                              |
| `task.move`         | `save_issue` (id + `state`)                                  | `id`, `state` resolved by type                                                                          | Map `req.targetListOrSectionId`: `"open"` → `unstarted`, `"wip"` → `started`, `"done"` → `completed`; resolve via `config.states[]`         |
| `checklist.check`   | `save_issue` (sub-issue id + `state`)                        | `id: req.itemId`, `state`                                                                               | `req.itemId` = sub-issue id; `complete` → type `completed`; `incomplete` → type `unstarted`; sub-issue created during `task.create` Phase 5 |
| `task.close`        | `save_issue` (id + `state`)                                  | `id`, `state` resolved by type `completed`                                                              | Same upsert tool as `task.move`; type-based → locale/rename-safe                                                                            |
| `task.due-date.set` | `save_issue` (id + `dueDate`)                                | `id`, `dueDate: req.dueAt.slice(0,10)`                                                                  | ISO 8601 → YYYY-MM-DD; native Linear field                                                                                                  |
| `task.assignee.add` | `save_issue` (id + `assignee`)                               | `id`, `assignee: req.userId`                                                                            | Single-assignee set-not-add; accepts id / name / email / `"me"`                                                                             |
| `task.comment.add`  | `save_comment` (issueId + body)                              | `issueId: req.taskId`, `body: req.text`                                                                 | Markdown; **literal newlines** (per MCP server instructions — not `\n` escape sequences); apply attribution prefix if enabled               |
| `task.parent.set`   | `save_issue` (id + `parentId`)                               | `id`, `parentId: req.parentId \| null`                                                                  | Arbitrary depth; `null` detaches from parent                                                                                                |
| `task.estimate.set` | `get_issue` (read labels) → `save_issue` (estimate + labels) | Two-call; see § Estimation                                                                              | Normalize via core `normalizeEstimate`; `est:<slug>` label idempotency under replace-set; see [`estimation.md`](estimation.md)              |
| `task.sprint.set`   | `list_cycles` → `save_issue` (id + `cycle`)                  | Two-call; see § Sprint                                                                                  | Team-gated (`config.cycles.enabled`); `NOT_APPLICABLE` when disabled; see [`../SKILL.md`](../SKILL.md) § Sprint                             |

## `<task-ref>` resolution for Linear

Accept, in order:

1. Full Linear permalink (`https://linear.app/<team>/issue/LEO-N`).
2. Bare identifier (`LEO-42`, `TEAMKEY-N`).
3. UUID (string matching Linear UUID format).
4. Alias from `.linear.json` `taskAliases[]`.
5. `clientToken` match in audit log (most recent).
6. Otherwise → `{ ok: false, code: "REF_NOT_RESOLVED", candidates: [...] }`.

Identifiers and UUIDs are **interchangeable** on all Linear MCP tools — the MCP resolves both.

## `task.move` — state resolution

Linear states are resolved by **type** against `config.states[]` (scoped to team). The `type` field is the stable reference; state names and display labels change with team customization.

Core target → Linear state type:

| Core `targetListOrSectionId` | Linear type     |
| ---------------------------- | --------------- |
| `"open"`                     | `unstarted`     |
| `"wip"`                      | `started`       |
| `"done"`                     | `completed`     |
| raw type string              | passed directly |

If no state matches the target type in `config.states[]`, return `INVALID_REQUEST` with hint to re-run `pm-tasks-linear init` to refresh state list.

## `checklist.check` — sub-issue model

Linear has no native checklist. Checklist items are modelled as sub-issues (`save_issue { parentId }`).

Request field semantics (Linear-specific):

| `req` field       | complete                                   | incomplete                                 |
| ----------------- | ------------------------------------------ | ------------------------------------------ |
| `req.taskId`      | parent issue id                            | parent issue id                            |
| `req.itemId`      | **sub-issue id** to move to completed type | **sub-issue id** to move to unstarted type |
| `req.targetState` | `"complete"`                               | `"incomplete"`                             |

The SKILL / adapter layer is responsible for passing the sub-issue id in `req.itemId`. The transport does not validate format.

Idempotency: `save_issue { id: subIssueId, state }` is idempotent — re-applying the same state type is a no-op.

## Temporal handling (lifecycle fidelity)

Implements the cross-adapter principle in [`../../pm-tasks-core/references/lifecycle-fidelity.md`](../../pm-tasks-core/references/lifecycle-fidelity.md) for Linear. **Create** is typed; **start** and **close** are **already handled natively by Linear's state machine** — this section documents that; there is no new runtime behavior for start/close.

**Create (typed).** The core `TaskCreateRequest.dueDate` (ISO 8601) maps to `dueDate` (`YYYY-MM-DD`) on `save_issue` — wired in the typed transport (`src/transport-linear.ts` `taskCreate`). The remaining create-time fields stay on the SKILL-orchestrated Phase 4/5 path (they need `.linear.json` resolution / replace-set label logic the config-free typed mapping does not do):

| Core create field | Linear mapping                                           | Where                                    |
| ----------------- | -------------------------------------------------------- | ---------------------------------------- |
| `dueDate`         | `dueDate` (`YYYY-MM-DD`)                                 | typed transport `taskCreate`             |
| `estimate`        | Linear estimate field + `est:<slug>` label (replace-set) | SKILL Phase 4/5 + `task.estimate.set`    |
| `labels`          | `labels[]` (replace-set, id-resolved)                    | SKILL Phase 4/5, config-aware            |
| `priority`        | `priority` (0–4)                                         | SKILL Phase 4/5 (future typed increment) |

**Start (move → WIP) — already native.** `task.move(id, "wip")` resolves to a `started`-type state (`save_issue { id, state }`). Linear **auto-stamps `startedAt`** the first time an issue enters a started-type state. No extra call, no config — the existing `task.move` already produces the start timestamp.

**Close (native — no overwrite).** `task.close` moves the issue to a `completed`-type state; Linear **auto-stamps `completedAt`** (the actual completion). Leave `dueDate` untouched: it stays = the **plan**. **Never overwrite `dueDate` at close** on Linear (unlike Trello). `startedAt`/`completedAt` are read-only from the adapter's perspective — the adapter never writes them. This makes Linear the lightest adapter on the fidelity axis: create-time `dueDate` is the only new behavior; start and close were already faithful.

## Idempotency

| Verb                | Idempotency rule                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `task.create`       | Before creating, search via `list_issues` for `[ct:<token>]` in description. If found, return existing ref.    |
| `task.move`         | Re-applying same state type is a no-op (Linear silently accepts).                                              |
| `task.close`        | Natural — `completed` state is a no-op if already completed.                                                   |
| `task.estimate.set` | `est:*` labels stripped and rewritten on every call — last write wins; re-run safe.                            |
| others              | Natural or `clientToken`-based; see [`crud-vocabulary.md`](../../pm-tasks-core/references/crud-vocabulary.md). |

## Error codes

| Code               | When                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NOT_APPLICABLE`   | `task.sprint.set` when `config.cycles.enabled === false`; `task.estimate.set` when `config.estimation.enabled === false`               |
| `INVALID_REQUEST`  | `task.estimate.set` when `linearTarget === "points"` but strategy produces no points; `task.due-date.set` with missing/invalid `dueAt` |
| `NOT_FOUND`        | Referenced issue id / identifier does not exist                                                                                        |
| `UNSUPPORTED_VERB` | Verb not in manifest (none for this adapter — all 10 verbs are implemented)                                                            |
| `MCP_ERROR`        | Linear MCP returned an error; surface raw message                                                                                      |

## Result envelope — Linear-specific `details`

| Verb                | `details` fields                                                                      |
| ------------------- | ------------------------------------------------------------------------------------- |
| `task.create`       | `{ id: "LEO-42", url?: string }`                                                      |
| `task.move`         | `{ previousListOrSectionId: null, newListOrSectionId: "<stateId>" }`                  |
| `checklist.check`   | `{ previousState: "incomplete" or "complete", newState: "complete" or "incomplete" }` |
| `task.close`        | `{ closed: true, movedToListOrSectionId: "<stateId>" }`                               |
| `task.due-date.set` | `{ previousDueAt: null, newDueAt: "YYYY-MM-DD" }`                                     |
| `task.assignee.add` | `{ added: true, currentAssigneeIds: ["<userId>"] }`                                   |
| `task.comment.add`  | `{ commentId: "<id>", postedAt: "<ISO8601>" }`                                        |
| `task.parent.set`   | `{ previousParentId: null, newParentId: "<issueId or null>" }`                        |
| `task.estimate.set` | `{ normalized: NormalizedEstimate, fieldWritten: "estimate" or null }`                |
| `task.sprint.set`   | `{ previousSprintRef: null, newSprintRef: "<cycleId>" }`                              |
