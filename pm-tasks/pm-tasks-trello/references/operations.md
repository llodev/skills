# Trello CRUD operations (v1)

Maps each verb from [`pm-tasks/pm-tasks-core/references/crud-vocabulary.md`](../../pm-tasks-core/references/crud-vocabulary.md) to `atlassian-trello-mcp` tool calls.

## Verb → MCP tool

| Verb                | MCP tool                    | Params (key ones)                                                                                                                                            |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `task.create`       | `create_card`               | `listId`, `name`, `desc`, `pos`, `due`, `labelIds[]`, `memberIds[]`, optional checklist via follow-up `trello_create_checklist` + `trello_create_check_item` |
| `checklist.check`   | `trello_update_check_item`  | `cardId`, `checkItemId`, `state: "complete"`                                                                                                                 |
| `task.close`        | `move_card`                 | `cardId`, `listId` = config `defaults.closeListAlias` resolved                                                                                               |
| `task.due-date.set` | `update_card`               | `cardId`, `due` (ISO 8601 or `null`)                                                                                                                         |
| `task.assignee.add` | `trello_add_member_to_card` | `cardId`, `memberId`                                                                                                                                         |
| `task.comment.add`  | `trello_add_comment`        | `cardId`, `text` (prefixed with `[ct:<clientToken>]` if provided)                                                                                            |

## `<task-ref>` resolution for Trello

Implementation steps in adapter's runtime logic:

1. **URL match** — pattern `^https?://trello\.com/c/([A-Za-z0-9]+)`. Group 1 is the short-link, usable as `cardId` in all MCP calls.
2. **Native ID** — 24-char hex (e.g. `6a2b574aefe6fe9621a3d5a7`) → use as-is.
3. **`taskAliases` lookup** — match `alias` in config, resolve to `id`/`url`.
4. **clientToken match (audit log)** — newest entry with matching `clientToken` in `~/.local/share/llodev/pm-tasks/trello/audit.log`.
5. **Name partial (audit log)** — case-insensitive substring on `name`, newest first, filter by `scope.boards`.
6. **Otherwise** → `{ ok: false, code: "REF_NOT_RESOLVED", candidates: [list of last 5 created in scope] }`.

## Idempotency

- `task.create` — checks card description for `[ct:<token>]` marker via `trello_get_list_cards` on target list.
- `checklist.check` — fetches checkItem state via `trello_get_check_item` first; skips MCP call if already `complete`.
- `task.close` — fetches current list via `get_card`; skips if already in `closeListAlias`.
- `task.due-date.set` — fetches `due` via `get_card`; skips if equal.
- `task.assignee.add` — fetches `members` of card via `get_card`; skips if memberId already in list.
- `task.comment.add` — fetches last 20 comments via `trello_get_card_actions`; skips if any starts with `[ct:<token>]`.

## Result envelope (Trello-specific `details`)

| Verb                | `details` fields                                                              |
| ------------------- | ----------------------------------------------------------------------------- |
| `task.create`       | `{ shortLink, dateLastActivity, checklists: [{id,name,items: [{id,name}]}] }` |
| `checklist.check`   | `{ checklistId, checkItemId }`                                                |
| `task.close`        | `{ previousListId, newListId }`                                               |
| `task.due-date.set` | `{ previousDue, newDue }`                                                     |
| `task.assignee.add` | `{ memberId, username }`                                                      |
| `task.comment.add`  | `{ commentId }`                                                               |

## `task.close` — close requirements

**Important:** `task.close` MUST set `dueComplete: true` on the card in addition to moving it to the close list. The Trello UI shows the due-date strikethrough only when `dueComplete` is set; relying on the list position alone leaves the card visually unresolved.

Implementation in the adapter:

1. `mcp__trello__update_card` with `{ id, dueComplete: true }`
2. `mcp__trello__move_card` with `{ cardId, idList: <closeListId> }`
