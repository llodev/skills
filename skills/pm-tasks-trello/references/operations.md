# Trello CRUD operations (v1)

Maps each verb from [`skills/pm-tasks-core/references/crud-vocabulary.md`](../../pm-tasks-core/references/crud-vocabulary.md) to `atlassian-trello-mcp` tool calls.

## Verb → MCP tool

| Verb                                       | MCP tool                                                                                         | Params (key ones)                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`                              | `create_card`                                                                                    | `listId`, `name`, `desc`, `pos`, `due`, `labelIds[]`, `memberIds[]`, optional checklist via follow-up `trello_create_checklist` + `trello_create_check_item`   |
| `task.move`                                | `move_card`                                                                                      | `cardId`, `idList` = resolved from `targetList` alias. See § `task.move` below.                                                                                |
| `checklist.check`                          | `trello_update_check_item`                                                                       | `cardId`, `checkItemId`, `state: "complete"`                                                                                                                   |
| `task.close`                               | `move_card` + `update_card`                                                                      | `cardId`, `idList` = `defaults.closeListAlias` resolved; ALSO `dueComplete: true` via `update_card`. See § `task.close` below.                                 |
| `task.due-date.set`                        | `update_card`                                                                                    | `cardId`, `due` (ISO 8601 or `null`)                                                                                                                           |
| `task.assignee.add`                        | `trello_add_member_to_card`                                                                      | `cardId`, `memberId`                                                                                                                                           |
| `task.comment.add`                         | `trello_add_comment`                                                                             | `cardId`, `text` (prefixed with `[ct:<clientToken>]` if provided)                                                                                              |
| `trello.task.batch-create-with-checklists` | `create_card` + `trello_create_checklist` + `trello_create_check_item` (bounded-parallel, cap 8) | `boardOrProjectId`, `cards[]` (`listOrSectionId`, `name`, `desc`, `due`, `clientToken`, `checklists[{name, items[]}]`). Custom Trello verb; see § batch below. |

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
- `task.move` — fetches current list via `get_card`; skips `move_card` if `card.idList` already matches resolved target. Silent skip (with audit warn) if alias not in config.
- `checklist.check` — fetches checkItem state via `trello_get_check_item` first; skips MCP call if already `complete`.
- `task.close` — fetches current list via `get_card`; skips if already in `closeListAlias`.
- `task.due-date.set` — fetches `due` via `get_card`; skips if equal.
- `task.assignee.add` — fetches `members` of card via `get_card`; skips if memberId already in list.
- `task.comment.add` — fetches last 20 comments via `trello_get_card_actions`; skips if any starts with `[ct:<token>]`.

## Result envelope (Trello-specific `details`)

| Verb                                       | `details` fields                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `task.create`                              | `{ shortLink, dateLastActivity, checklists: [{id,name,items: [{id,name}]}] }`                                 |
| `task.move`                                | `{ previousListId, newListId, targetList }`                                                                   |
| `checklist.check`                          | `{ checklistId, checkItemId }`                                                                                |
| `task.close`                               | `{ previousListId, newListId }`                                                                               |
| `task.due-date.set`                        | `{ previousDue, newDue }`                                                                                     |
| `task.assignee.add`                        | `{ memberId, username }`                                                                                      |
| `task.comment.add`                         | `{ commentId }`                                                                                               |
| `trello.task.batch-create-with-checklists` | `{ ok, created, failed, results: [{ ok, card:{id,url}, checklists:[{id,name,items:[{id,name}]}], error? }] }` |

## `task.move` — resolution rules

Schema: `{ cardId: string, targetList: "open" | "wip" | "done" | string }`

Resolution order for `targetList`:

1. If `targetList` is `"wip"` → look up `lists.wip` in `.trello.json`, use its `id` as `idList`.
2. If `targetList` is `"done"` → look up `lists.done` in `.trello.json`.
3. If `targetList` is `"open"` → look up `lists.open` in `.trello.json`.
4. Otherwise → treat `targetList` as a raw Trello list ID and pass through directly to `move_card`.

Fallback: if the named alias (e.g., `lists.wip`) is not present in the config, skip the MCP call silently and emit a warning to the audit log: `WARN: task.move skipped — "wip" not found in lists config`. Do NOT return an error envelope — the card stays where it is.

The resolved `idList` MUST be in `autonomous.scope.lists` — otherwise the verb returns `{ ok: false, code: "OUT_OF_SCOPE" }`.

Idempotency: fetch current list via `get_card`; skip `move_card` if `card.idList === resolvedIdList`.

## `task.close` — close requirements

**Important:** `task.close` MUST set `dueComplete: true` on the card in addition to moving it to the close list. The Trello UI shows the due-date strikethrough only when `dueComplete` is set; relying on the list position alone leaves the card visually unresolved.

Implementation in the adapter:

1. `mcp__trello__update_card` with `{ id, dueComplete: true }`
2. `mcp__trello__move_card` with `{ cardId, idList: <closeListId> }`

## Temporal handling (lifecycle fidelity)

Implements the cross-adapter principle in [`../../pm-tasks-core/references/lifecycle-fidelity.md`](../../pm-tasks-core/references/lifecycle-fidelity.md) for Trello. **Create** is typed; **start** and **close** are interpretive guidance applied by the agent in the Phase 5 / autonomous flow. Trello has **no auto completion timestamp**, so — unlike Asana/Jira/Linear — the agent must actively record reality and stash the plan.

**Create (typed).** The core `TaskCreateRequest.dueDate` maps to `due` (full ISO 8601) on `create_card` — wired in the typed transport (`src/transport-trello.ts` `taskCreate`). The other create-time fields are config-dependent and stay on the SKILL-orchestrated Phase 4/5 path (they need `.trello.json` resolution the config-free transport does not have):

| Core create field | Trello mapping                                                                              | Where                          |
| ----------------- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| `dueDate`         | `due` (ISO 8601)                                                                            | typed transport `taskCreate`   |
| `labels`          | `idLabels[]` (label name → id via `.trello.json` `labels[]`)                                | SKILL Phase 4/5                |
| `priority`        | no native Trello field; a label if one is configured, else NOT_APPLICABLE                   | SKILL Phase 4/5, if configured |
| `estimate`        | no native Trello field; carried into the plan footer (below) at create so it survives close | SKILL Phase 4/5                |

To preserve the estimate for the eventual close footer (Trello has no native estimate field), the Phase 4/5 publish flow appends the **plan footer** (below) to the card `desc` at create.

**Start (move → WIP).** When moving a card to the WIP list, also stamp the native start date: `update_card { id: <cardId>, start: <today ISO 8601> }` (a second call after `move_card`). Trello's `start` field takes an ISO date and has no co-field requirement (unlike Asana's `start_on`, which needs `due_on` present).

**Close (overwrite — Trello has no auto timestamp).** At close, reflect reality in the live field and keep the plan:

1. `update_card { id: <cardId>, due: <actual completion ISO>, dueComplete: true }` — **overwrite** `due` with the actual completion date. This is the opposite of Asana (which never overwrites `due_on`, because Asana auto-stamps `completed_at`).
2. Move the card to Done (`move_card { cardId, idList: <doneListId> }`).
3. **Preserve the plan** in a single description footer, so the planned-vs-actual gap survives. Read the current `desc` (`get_card`), then set/replace exactly one footer line:

   | locale | plan footer template                                 |
   | ------ | ---------------------------------------------------- |
   | pt-BR  | `— Planejado: due {plannedDue} · est {estimate} —`   |
   | en-US  | `— Planned: due {plannedDue} · est {estimate} —`     |
   | es-ES  | `— Planificado: due {plannedDue} · est {estimate} —` |

   Pick the template by `config.locale`. `{plannedDue}` = the original planned due (the card's `due` value BEFORE this close overwrote it — capture it first); `{estimate}` = the plan estimate (from the footer already written at create, or from the plan). `{plannedDue}`/`{estimate}` render as `YYYY-MM-DD` / effort (e.g. `8h`).

**Footer rules (replace, never duplicate, never clobber attribution):**

- The plan footer is the single line matching `^—\s*(Planejado|Planned|Planificado):\s.*—\s*$` (starts and ends with an em-dash `—`, contains the localized "Planned:" keyword). On re-close, find and REPLACE that line — do not append a second one.
- The attribution footer (`— posted by … via @llodev/pm-tasks-trello`, from core `getAttribution`, appended at create when `config.attribution.enabled`) is DISTINCT (no trailing em-dash, no "Planned:" keyword). The plan-footer replace MUST leave it untouched.
- Premium custom fields for planned-due / estimate are opportunistic and out of scope here; the footer is the baseline mechanism.

## `trello.task.batch-create-with-checklists` — batch creation

Each card in `cards[]` goes through the same audited `task.create` path (idempotency, config resolution, attribution) as a single-card create — batching does not bypass those checks. Checklists are created in two phases: all checklists for all cards first, then all check items, each phase run bounded-parallel with a concurrency cap of 8 to respect Trello's 300 requests/10s rate limit. One card failing (create or checklist error) does not abort the batch — it is recorded in `results[]` with `ok: false` and `error`, and the remaining cards proceed; `created`/`failed` in the envelope summarize the outcome. The speedup versus one-at-a-time is purely from parallelizing the existing `create_card` / `trello_create_checklist` / `trello_create_check_item` POSTs — no new Trello capability is used.

Note: `trello_create_checklist` also exposes an optional `idChecklistSource` param that clones items from an existing checklist. It is intentionally **not** used by this verb — F13's cards each carry their own distinct checklist content, so cloning a single template does not apply here. It remains a candidate future optimization for the same-template-across-many-cards case.
