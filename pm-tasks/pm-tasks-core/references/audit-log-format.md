# Audit log format

Append-only JSONL at `~/.local/share/llodev/pm-tasks/<tool>/audit.log` (configurable via `autonomous.auditLog`).

## Required fields (every entry)

| Field     | Type    | Notes                                                                   |
| --------- | ------- | ----------------------------------------------------------------------- |
| `ts`      | string  | ISO 8601 with timezone                                                  |
| `verb`    | string  | one of the 6 CRUD verbs                                                 |
| `tool`    | string  | `trello`, `asana`, etc.                                                 |
| `ok`      | boolean | success of the operation                                                |
| `session` | string  | caller-provided session id (defaults to a random short id when missing) |

## Verb-dependent fields

| Verb                | Additional                                                |
| ------------------- | --------------------------------------------------------- |
| `task.create`       | `id`, `url`, `name`, `clientToken?`, `scope.{board,list}` |
| `checklist.check`   | `id`, `item`                                              |
| `task.close`        | `id`                                                      |
| `task.due-date.set` | `id`, `due`                                               |
| `task.assignee.add` | `id`, `userAlias`                                         |
| `task.comment.add`  | `id`, `commentId`, `clientToken?`                         |

## Example

```jsonl
{"ts":"2026-06-11T18:00:00Z","verb":"task.create","tool":"trello","ok":true,"id":"abc123","url":"https://trello.com/c/abc123/...","name":"Implementar feature X","clientToken":"ct-xyz","scope":{"board":"proj-x","list":"backlog"},"session":"sess-001"}
{"ts":"2026-06-11T18:05:00Z","verb":"checklist.check","tool":"trello","ok":true,"id":"abc123","item":"build endpoint","session":"sess-001"}
{"ts":"2026-06-11T18:10:00Z","verb":"task.close","tool":"trello","ok":true,"id":"abc123","session":"sess-001"}
```

## Concurrency

Single-line JSON writes < 4KB are atomic at OS level on Linux/macOS. Multiple agents in parallel do not corrupt. No locks.

## Rotation

`scripts/rotate-audit.mjs` is the Node ESM replacement for the old shell script. It wraps `rotateAuditLog` from `dist/audit.js` and emits a JSON status object to stdout.

**Flags**

| Flag                 | Default                    | Description                                                               |
| -------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `--tool <name>`      | _(required)_               | Adapter name (`trello`, `asana`, …). Resolves the log path automatically. |
| `--max-size <bytes>` | `10485760` (10 MB)         | Rotate when the live log exceeds this size.                               |
| `--max-age <days>`   | _(none)_                   | If set, prune entries older than N days before the size check.            |
| `--keep <n>`         | `12`                       | Maximum number of gzipped archives to keep. Oldest are deleted first.     |
| `--log-path <path>`  | _(resolved from `--tool`)_ | Override the log file path.                                               |

**Exit codes**: `0` success (rotated or not); `2` usage error (missing `--tool`); `1` filesystem error.

**JSON status output** (written to stdout on success):

```json
{
  "tool": "trello",
  "logPath": "/home/user/.local/share/llodev/pm-tasks/trello/audit.log",
  "rotated": true,
  "archive": "/home/user/.local/share/llodev/pm-tasks/trello/audit.log.2026-06-18-1.jsonl.gz",
  "prunedArchives": []
}
```

Suggested cron entry — see the package README.

## Lookup usage

The log doubles as the lookup index for `<task-ref>` resolution steps 4–5. Adapter implementations scan from newest to oldest, filter by `scope.boards`, match `clientToken` or name partial.
