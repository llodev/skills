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

## Card lifecycle pattern (continuous loop)

Implements the contract in [`../../pm-tasks-core/references/autonomous-mode.md`](../../pm-tasks-core/references/autonomous-mode.md) § **Continuous operation across multi-task loops** for Trello specifically. The controlling agent MUST mirror each task transition on the corresponding card in real time — not batched at end-of-loop.

Concrete MCP calls per transition:

| Transition           | MCP call(s)                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task start           | `mcp__trello__move_card { cardId, idList: <wipListId> }`                                                                                                                                                                                  |
| Step complete        | `mcp__trello__trello_update_check_item { cardId, checkItemId, state: "complete" }`                                                                                                                                                        |
| Task complete (full) | `mcp__trello__trello_add_comment { cardId, text: "🤖 [agent] Task complete. Commit: <SHA>. <branch>." }` then `mcp__trello__update_card { id: cardId, dueComplete: true }` then `mcp__trello__move_card { cardId, idList: <doneListId> }` |
| Task failed          | `mcp__trello__trello_add_comment` with failure mode + `mcp__trello__trello_add_member_to_card { cardId, memberId: <escalateToAliasId> }` for human escalation. Do NOT close.                                                              |

Resolve `<wipListId>` / `<doneListId>` from `.trello.json` `lists[]` by alias (`wip`, `done`, or `closeListAlias` from `defaults`). The IDs MUST already be in `autonomous.scope.lists` — otherwise the verb returns `OUT_OF_SCOPE`.

### Pacing

Per-task overhead: ~3 MCP calls + 1 per step. A typical 8-step task runs in ~11 calls per lifecycle. Even a 50-task sweep stays well below Trello's 300-req/10s limit.

### Anti-pattern (Trello-specific)

NEVER:

- Leave 16+ cards in `Backlog` and `move_card` all of them to `Done` in a final sweep. The activity feed shows 16 simultaneous transitions with no "in progress" history — useless for the human reading the board.
- Use `trello_add_comment` with the commit SHA only on the last card of a sweep, summarizing all tasks. Each task gets its own commit, so each card gets its own SHA comment.
- Skip `dueComplete: true` when closing — see [`operations.md`](./operations.md) § `task.close`.
