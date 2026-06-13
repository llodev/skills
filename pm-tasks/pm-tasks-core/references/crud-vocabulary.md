# CRUD vocabulary (v1)

Six verbs. Each adapter maps every verb to one or more MCP tool calls.

## task.create

Create a new task/card/issue from a generic-card spec.

- **Inputs:** `genericCard` (per `generic-card.md`), `targetList` (alias from config), `clientToken?` (opaque idempotency key).
- **Idempotency:** Before creating, search the target scope for any task with matching `clientToken`. If found, return existing ref. Token persistence per tool documented in adapter `operations.md`.
- **Returns:** envelope with `ref.{id,url}`.

## checklist.check

Mark a checklist item / subtask as complete.

- **Inputs:** `taskRef`, `item` (text or index), `checklistName?` (when task has multiple).
- **Idempotency:** natural (no-op if already checked).
- **Returns:** envelope.

## task.close

Close / move to done.

- **Inputs:** `taskRef`.
- **Adapter semantics:** Trello → move to `closeListAlias`. Asana → `completed: true`. Linear → state `completed`. Notion → status `Done`. Bitrix24 → status `5`. Todoist → `close`.
- **Idempotency:** natural.

## task.due-date.set

Set or change due date.

- **Inputs:** `taskRef`, `due` (ISO 8601 date or `null` to clear).
- **Idempotency:** no-op if value matches.

## task.assignee.add

Add an assignee/member to a task. v1 NEVER removes.

- **Inputs:** `taskRef`, `userAlias` (from config `members`).
- **Idempotency:** adapter checks current assignees before MCP call.

## task.comment.add

Post a comment / note / story.

- **Inputs:** `taskRef`, `body`, `clientToken?`.
- **Idempotency:** body is prefixed with `[ct:<clientToken>]` if provided. Adapter scans recent comments for matching token before posting.

## Verbs forbidden in autonomous mode (v1, hard-coded)

`task.delete`, `task.archive`, `task.rename`, `task.description.replace`, `task.assignee.remove`, any `member.remove`, and any operation targeting a board/project outside the declared autonomous `scope`.

## `<task-ref>` resolution order

Adapters resolve `taskRef` in this order, stopping at first success:

1. Full task URL.
2. Native ID.
3. Alias in config `taskAliases`.
4. `clientToken` match in audit log (most recent).
5. Name partial match in audit log scoped to `autonomous.scope` (most recent).
6. Otherwise → `{ ok: false, code: "REF_NOT_RESOLVED", candidates: [...] }`.
