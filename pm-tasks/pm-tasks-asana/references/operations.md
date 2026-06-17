# Asana CRUD operations (v1)

Verb → MCP tool mapping for `@llodev/pm-tasks-asana`. All verbs return the core result envelope; see [`../../pm-tasks-core/references/contract.md`](../../pm-tasks-core/references/contract.md) § Result envelope.

## Verb → MCP tool

| Core verb           | Asana MCP tool (`mcp__claude_ai_Asana__*`)      | Notes                                                                                                                                                                |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | `create_tasks`                                  | parent + subtasks; `memberships: [{ project, section }]` places card in the correct section at creation time.                                                        |
| `task.move`         | `update_tasks`                                  | `memberships: [{ project: <projectGid>, section: <resolvedGid> }]`. See § `task.move` below for resolution rules. Idempotency: check current section before calling. |
| `checklist.check`   | `update_tasks`                                  | `{ task: <subtaskGid>, completed: true }`. Subtask model emulates checklist items.                                                                                   |
| `task.close`        | `update_tasks`                                  | `{ task: <parentGid>, completed: true }`. Visual section move is handled separately by `task.move(cardId, "done")` before calling `task.close`.                      |
| `task.due-date.set` | `update_tasks`                                  | `{ task: <gid>, due_on: "YYYY-MM-DD" }`. Pass `null` to clear.                                                                                                       |
| `task.assignee.add` | `update_tasks` + `update_tasks` (add_followers) | Primary assignee via `assignee` field; additional users become followers via `add_followers: [<gid>]`.                                                               |
| `task.comment.add`  | `add_comment`                                   | Creates a comment story on the task. Apply attribution prefix per `config.locale` if `config.attribution` is enabled.                                                |

## `task.move` — resolution rules

Schema: `{ cardId: string, targetList: "open" | "wip" | "done" | string }`

Resolution order for `targetList`:

1. If `targetList` is `"wip"` → look up `defaults.wipSectionAlias` in `.asana.json`, find the matching entry in `sections[]` by alias, use its `id` as the section GID.
2. If `targetList` is `"done"` → look up `defaults.doneSectionAlias` in `.asana.json`.
3. If `targetList` is `"open"` → look up `defaults.openSectionAlias` in `.asana.json`.
4. Otherwise → treat `targetList` as a raw Asana section GID and pass through directly.

The resolved section GID MUST be in `autonomous.scope.sections` — otherwise the verb returns `{ ok: false, code: "OUT_OF_SCOPE" }`.

Idempotency: fetch current task memberships before calling `update_tasks`. If the task is already in the target section, return `{ ok: true }` without an MCP write.

## `<task-ref>` resolution for Asana

Accept, in order:

1. Full Asana permalink (`https://app.asana.com/0/<project>/<task>`).
2. Bare GID (numeric string).
3. Alias from `.asana.json` `taskAliases[]`.
4. `clientToken` match in audit log (most recent).
5. Name partial match in audit log scoped to `autonomous.scope`.
6. Otherwise → `{ ok: false, code: "REF_NOT_RESOLVED", candidates: [...] }`.

## Idempotency

| Verb          | Idempotency rule                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| `task.create` | Before creating, search scope for task with matching `clientToken`. If found, return existing ref.             |
| `task.move`   | Check current section before `update_tasks`. No-op if already in target.                                       |
| `task.close`  | Natural — `completed: true` is a no-op if already completed.                                                   |
| others        | Natural or `clientToken`-based; see [`crud-vocabulary.md`](../../pm-tasks-core/references/crud-vocabulary.md). |

## Result envelope — Asana-specific `details`

| Verb                | `details` fields                                                         |
| ------------------- | ------------------------------------------------------------------------ |
| `task.create`       | `{ parentGid, subtaskGids[], projectGid, sectionGid?, customFields[]? }` |
| `task.move`         | `{ taskGid, sectionGid, targetList }`                                    |
| `checklist.check`   | `{ subtaskGid, completed: true }`                                        |
| `task.close`        | `{ parentGid, completed: true }`                                         |
| `task.due-date.set` | `{ taskGid, due_on }`                                                    |
| `task.assignee.add` | `{ taskGid, assignee, followers[]? }`                                    |
| `task.comment.add`  | `{ taskGid, storyGid }`                                                  |
