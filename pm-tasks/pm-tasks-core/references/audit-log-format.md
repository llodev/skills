# Audit log format

Append-only JSONL at `~/.local/share/llodev/pm-tasks/<tool>/audit.log` (configurable via `autonomous.auditLog`).

## Required fields (every entry)

| Field | Type | Notes |
|---|---|---|
| `ts` | string | ISO 8601 with timezone |
| `verb` | string | one of the 6 CRUD verbs |
| `tool` | string | `trello`, `asana`, etc. |
| `ok` | boolean | success of the operation |
| `session` | string | caller-provided session id (defaults to a random short id when missing) |

## Verb-dependent fields

| Verb | Additional |
|---|---|
| `task.create` | `id`, `url`, `name`, `clientToken?`, `scope.{board,list}` |
| `checklist.check` | `id`, `item` |
| `task.close` | `id` |
| `task.due-date.set` | `id`, `due` |
| `task.assignee.add` | `id`, `userAlias` |
| `task.comment.add` | `id`, `commentId`, `clientToken?` |

## Example

```jsonl
{"ts":"2026-06-11T18:00:00Z","verb":"task.create","tool":"trello","ok":true,"id":"abc123","url":"https://trello.com/c/abc123/...","name":"Implementar feature X","clientToken":"ct-xyz","scope":{"board":"proj-x","list":"backlog"},"session":"sess-001"}
{"ts":"2026-06-11T18:05:00Z","verb":"checklist.check","tool":"trello","ok":true,"id":"abc123","item":"build endpoint","session":"sess-001"}
{"ts":"2026-06-11T18:10:00Z","verb":"task.close","tool":"trello","ok":true,"id":"abc123","session":"sess-001"}
```

## Concurrency

Single-line JSON writes < 4KB are atomic at OS level on Linux/macOS. Multiple agents in parallel do not corrupt. No locks.

## Rotation

`pm-tasks/pm-tasks-core/scripts/rotate-audit.sh` purges entries older than 90 days. Suggested cron entry in this file's README.

## Lookup usage

The log doubles as the lookup index for `<task-ref>` resolution steps 4–5. Adapter implementations scan from newest to oldest, filter by `scope.boards`, match `clientToken` or name partial.
