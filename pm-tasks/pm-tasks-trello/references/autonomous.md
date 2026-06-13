# Autonomous mode — Trello overlay

Supplements [`pm-tasks/pm-tasks-core/references/autonomous-mode.md`](../../pm-tasks-core/references/autonomous-mode.md) with Trello-specific guidance.

## Scope semantics

`autonomous.scope.boards` → values are Trello board IDs (24-char hex). Operations targeting any card outside these boards fail `OUT_OF_SCOPE`.

`autonomous.scope.lists` → values are list IDs. For `task.create`, the target list MUST be in this set. For `task.close`, the destination list (`closeListAlias` resolved) MUST be in this set.

## Allowlist defaults (suggested by `init`)

```json
"autonomous": {
  "enabled": false,
  "allow": ["task.create", "checklist.check", "task.close", "task.comment.add"],
  "scope": { "boards": [], "lists": [] },
  "rateLimit": { "writesPerMinute": 30, "commentsPerMinute": 10 },
  "auditLog": "~/.local/share/llodev/pm-tasks/trello/audit.log"
}
```

Note `enabled: false` and empty `scope.*` — user must explicitly turn on AND populate scope. Init prints a warning explaining why.

## Audit log entries — verb-specific shape

```jsonl
{"ts":"...","verb":"task.create","tool":"trello","ok":true,"id":"<cardId>","url":"https://trello.com/c/<shortLink>","name":"...","clientToken":"...","scope":{"board":"<boardId>","list":"<listId>"},"session":"..."}
{"ts":"...","verb":"checklist.check","tool":"trello","ok":true,"id":"<cardId>","item":"<checkItem name>","session":"..."}
{"ts":"...","verb":"task.close","tool":"trello","ok":true,"id":"<cardId>","session":"..."}
{"ts":"...","verb":"task.due-date.set","tool":"trello","ok":true,"id":"<cardId>","due":"2026-07-01T00:00:00Z","session":"..."}
{"ts":"...","verb":"task.assignee.add","tool":"trello","ok":true,"id":"<cardId>","userAlias":"me","session":"..."}
{"ts":"...","verb":"task.comment.add","tool":"trello","ok":true,"id":"<cardId>","commentId":"<actionId>","clientToken":"...","session":"..."}
```

## Rate-limit handling

`atlassian-trello-mcp` returns HTTP 429 with `Retry-After` header. Adapter inspects the error, returns `{ ok: false, code: "RATE_LIMITED", details: { retryAfterSeconds: <n> } }`. Skill does NOT auto-retry — caller decides.

## Failure recovery for partial `task.create`

If `create_card` succeeds but `trello_create_checklist` or `trello_create_check_item` fails:

- Return `{ ok: false, code: "MCP_ERROR" }` with `details: { partialCard: { id, url }, completedSteps: [...], failedStep: "..." }`.
- Caller can retry with same `clientToken` — idempotency check finds the partial card, only retries the failed steps.
