# Jira CRUD operations (v1)

Verb → MCP tool mapping for `@llodev/pm-tasks-jira`. All verbs return the core result envelope; see [`../../pm-tasks-core/references/contract.md`](../../pm-tasks-core/references/contract.md) § Result envelope.

## Verb → MCP tool

| Core verb                | Jira MCP tool (`mcp__atlassian__*`)                             | Request arg(s)                                                                              | Notes                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `task.create`            | `createJiraIssue`                                               | `cloudId`, `projectKey`, `issueTypeName`, `summary`, `description`                          | `issueTypeName` from `issueTypes.task` in `.jira.json`; clientToken embedded as `[ct:<token>]` in description body                         |
| `task.move`              | `getTransitionsForJiraIssue` → `transitionJiraIssue`            | `req.targetListOrSectionId` = category key (`"new"` / `"indeterminate"` / `"done"`)         | Two-call transition engine; locale-safe via category matching                                                                              |
| `checklist.check`        | `createJiraIssue` (Subtask) + `transitionJiraIssue`             | complete: `req.itemId` = Subtask summary text; incomplete: `req.itemId` = Subtask issue key | Complete: create Subtask with `parent=req.taskId`, then transition to `"done"`; Incomplete: transition subtask to `"new"`                  |
| `task.close`             | `getTransitionsForJiraIssue` → `transitionJiraIssue`            | `req.taskId` = issue key                                                                    | Hardcoded `"done"` category; same engine as `task.move`                                                                                    |
| `task.due-date.set`      | `editJiraIssue`                                                 | `req.dueAt` (ISO 8601) → `fields.duedate` (YYYY-MM-DD)                                      | Subtask → error-driven `NOT_APPLICABLE` (no pre-read); `dueAt` must be ≥10 chars or `INVALID_REQUEST`                                      |
| `task.assignee.add`      | `lookupJiraAccountId` (conditional) + `editJiraIssue`           | `req.userId` = display name / email / accountId                                             | accountId fast-path: if `userId` matches `ACCOUNT_ID_RE` → skip lookup; `editJiraIssue { assignee: { accountId } }`                        |
| `task.comment.add`       | `addCommentToJiraIssue`                                         | `req.text` → `body`; `markdown: true` (load-bearing)                                        | `markdown: true` is REQUIRED — Atlassian MCP renders as ADF when `false`                                                                   |
| `task.parent.set` (F3)   | `editJiraIssue`                                                 | `req.parentId` (issue key, e.g. `KAN-12`) → `fields.parent.key`                             | Team-managed flat parent; `parentId` validated as `/^[A-Z][A-Z0-9]+-\d+$/`; `INVALID_REQUEST` if invalid; `previousParentId` always `null` |
| `task.estimate.set` (F7) | `getJiraIssue` (labels read) + `editJiraIssue` (labels + field) | `req.input: EstimateInput`, `req.config: EstimationConfig`                                  | Two-call sequence; `est:<slug>` label + optional native field; see [`estimation.md`](estimation.md)                                        |

**F2 (`task.sprint.set`) — unsupported.** The Atlassian MCP exposes no agile/sprint API, so the core factory returns `UNSUPPORTED_VERB` for this verb (parity with SKILL.md § F2 sprint).

## `task.move` — transition engine

Schema: `{ taskId: string, targetListOrSectionId: "new" | "indeterminate" | "done" }`

Resolution algorithm:

1. Call `getTransitionsForJiraIssue({ cloudId, issueKey: taskId })` → array of transition objects.
2. Find transition `t` where `t.to.statusCategory.key === targetListOrSectionId`.
3. If no match → `{ ok: false, code: "NOT_FOUND", details: { message: "TRANSITION_NOT_FOUND:<key>:<category>", taskId } }`.
4. Call `transitionJiraIssue({ cloudId, issueKey: taskId, transitionId: t.id })`.
5. Return `{ ok: true, data: { previousListOrSectionId: null, newListOrSectionId: t.to.id } }`.

**Idempotency note:** The transport does not pre-read the current status before transitioning. If the issue is already in the target category, Jira silently accepts the transition (no-op). `previousListOrSectionId` is always `null` (no pre-read cost).

## `checklist.check` — Subtask model

Jira has no native checklist. Checklist items are modelled as Subtasks.

Request field semantics (Jira-specific):

| `req` field       | complete (creating)                | incomplete (reopening)                         |
| ----------------- | ---------------------------------- | ---------------------------------------------- |
| `req.taskId`      | parent issue key (e.g. `KAN-1`)    | parent issue key (e.g. `KAN-1`)                |
| `req.checklistId` | ignored at transport level         | ignored at transport level                     |
| `req.itemId`      | Subtask **summary text** to create | Subtask **issue key** (e.g. `KAN-2`) to reopen |

The SKILL / adapter layer is responsible for passing the correct value in `req.itemId`. Transport does not validate issue-key format for the incomplete path.

## Temporal handling (lifecycle fidelity)

Implements the cross-adapter principle in [`../../pm-tasks-core/references/lifecycle-fidelity.md`](../../pm-tasks-core/references/lifecycle-fidelity.md) for Jira. **Create** is typed; **start** and **close** are interpretive guidance. Jira separates plan from actual **natively**, so close is free — the same native-timestamp pattern as Asana (and the opposite of Trello's overwrite).

**Create (typed).** The core `TaskCreateRequest.dueDate` (ISO 8601) maps to `duedate` (`YYYY-MM-DD`) on `createJiraIssue` — wired in the typed transport (`src/transport-jira.ts` `taskCreate`). `duedate` is **not applicable on Subtasks**; `taskCreate` always creates a task-type issue, so this is safe, but a create-time due date is silently omitted for subtask-type creation. The remaining create-time fields stay on the SKILL-orchestrated Phase 4/5 path (they need `.jira.json` resolution the config-free typed mapping does not do):

| Core create field | Jira mapping                                            | Where                                               |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `dueDate`         | `duedate` (`YYYY-MM-DD`)                                | typed transport `taskCreate`                        |
| `estimate`        | `timetracking.originalEstimate` (or story-points field) | SKILL Phase 4/5 + `task.estimate.set`, config-aware |
| `labels`          | `labels[]`                                              | SKILL Phase 4/5, config-aware                       |
| `priority`        | `priority` field if configured; else NOT_APPLICABLE     | SKILL Phase 4/5, if configured                      |

**Start (move → WIP).** Jira has **no wired start-date field** in this adapter. The WIP move transitions the issue to the `indeterminate` status category (`task.move(key, "indeterminate")`) but stamps no date. A custom "start date" field could be written via `editJiraIssue` if a team configures one — this is an **optional, documented increment, not implemented** in this program.

**Close (native — no overwrite).** Transition to the `done` category (`task.close` / `task.move(key, "done")`). Jira stamps `resolutiondate` server-side automatically — that is the **actual** completion. Leave `duedate` untouched: it stays = the **plan**, giving a planned-vs-actual comparison for free. **Never overwrite `duedate` at close** on Jira (unlike Trello, which has no auto timestamp). `resolutiondate` is read-only from the adapter's perspective — the adapter never writes it.

## `<task-ref>` resolution for Jira

Accept, in order:

1. Full Jira permalink (`https://<site>/browse/KEY-N`).
2. Bare issue key (`KAN-42`).
3. Alias from `.jira.json` `taskAliases[]`.
4. `clientToken` match in audit log (most recent).
5. Otherwise → `{ ok: false, code: "REF_NOT_RESOLVED", candidates: [...] }`.

## Idempotency

| Verb                | Idempotency rule                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `task.create`       | Before creating, search scope via `searchJiraIssuesUsingJql` for `[ct:<token>]` in description. If found, return existing ref. |
| `task.move`         | Jira silently accepts re-transition to current category — inherently idempotent.                                               |
| `task.close`        | Natural — `"done"` transition is a no-op if already in `done` category.                                                        |
| `task.estimate.set` | `est:*` labels stripped and rewritten on every call — last write wins; re-run safe.                                            |
| others              | Natural or `clientToken`-based; see [`crud-vocabulary.md`](../../pm-tasks-core/references/crud-vocabulary.md).                 |

## Result envelope — Jira-specific `details`

| Verb                     | `details` fields                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `task.create`            | `{ id: "<key>", url?: string }`                                                           |
| `task.move`              | `{ previousListOrSectionId: null, newListOrSectionId: "<statusId>" }`                     |
| `checklist.check`        | `{ previousState: "incomplete" or "complete", newState: "complete" or "incomplete" }`     |
| `task.close`             | `{ closed: true, movedToListOrSectionId: "<statusId>" }`                                  |
| `task.due-date.set`      | `{ previousDueAt: null, newDueAt: "YYYY-MM-DD" }`                                         |
| `task.assignee.add`      | `{ added: true, currentAssigneeIds: ["<accountId>"] }`                                    |
| `task.comment.add`       | `{ commentId: "<id>", postedAt: "<ISO8601>" }`                                            |
| `task.parent.set` (F3)   | `{ previousParentId: null, newParentId: "<issueKey>" }`                                   |
| `task.estimate.set` (F7) | `{ normalized: NormalizedEstimate, fieldWritten: "<fieldId>" \| "timetracking" \| null }` |
