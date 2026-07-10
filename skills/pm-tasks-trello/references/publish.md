# Trello Publish Sequence

## Preview and approval (Phase 5.2)

Before any write MCP call, show:

```
Ready to create on Trello:

  Board : [boardName]
  List  : [listName]
  Title : [card title]
  Checklists:
    Pre-flight         (N items)
    Block A — [name]   (N items)
    ...
    Verification       (N items)
  Labels: [names] → IDs: [idLabels summary or count]
  Member: [fullName] ([username]) → [memberId]
  Due date: [date or omitted]

Create now? [y] confirm · [n] cancel · [e] edit title/list/member/labels first
```

- **y / confirm** → proceed to publish sequence
- **n / cancel** → stop; paste-ready output remains the artifact
- **e / edit** → adjust title/board/list/due date/member/labels, show preview again

**NEVER** call write MCP tools (`create_card`, `trello_create_checklist`, etc.) before confirmation.

When **Phase 5** runs (MCP create), add after § Resolve labels and member and **before** § Preview:

```
CREATE_CARD (API):
  idList    : [listId]
  idLabels  : ["...", ...]  (omit key if empty)
  idMembers : ["..."]       (omit key if unassigned)
```

---

## Publish via MCP (Phase 5)

Invoked from [`../SKILL.md`](../SKILL.md) Phase 5 after § **Preview and approval** confirmation and § **Resolve labels and member** complete. **NEVER** call write MCP tools before confirmation.

**Description body:** use [`skills/pm-tasks-core/references/generic-card.md`](../../pm-tasks-core/references/generic-card.md) **Description** block **without** Out of scope / Next step (see [`../anti-patterns/tools.md`](../anti-patterns/tools.md)).

### Publish sequence

Execute in order; stop and report on first failure.

**Step 1 — Create the card**

Call `create_card` with:

- `name` = card title (from Phase 4)
- `desc` = card description (from Phase 4, Markdown; no tables — flatten per § Tables vs paste)
- `idList` = resolved `listId` from § List resolution
- `due` = due date if set (ISO 8601), otherwise omit
- `idLabels` = array from Phase 5.2.5 (omit key if empty)
- `idMembers` = `[memberId]` when assigned (omit key if none)

Capture returned `id` / `shortUrl` as `cardId`.

Prefer **assigning labels and member at create** — fewer API calls and atomic card state. Use `trello_add_label_to_card` / `trello_add_member_to_card` only when adding after create (e.g. user amended labels in **e** flow).

**Step 2 — Create checklists**

For each named checklist block (Pre-flight, one per implementation block, Verification):

1. `trello_create_checklist`: `{ cardId, name: "Pre-flight" }` → capture `checklistId`
2. Per item: `trello_create_check_item`: `{ checklistId, name: "plain text, no markdown" }`

Order: Pre-flight → implementation blocks in plan order → Verification last.

**Rate limit:** Trello allows 300 req/10s per key. A card with 8 checklists × 5 items ≈ 50 calls — within limits.

**Step 3 — Fallback labels/member (optional)**

Only if Step 1 omitted `idLabels` / `idMembers` but Phase 5.2.5 resolved new values after create:

- `trello_add_label_to_card` per `labelId`
- `trello_add_member_to_card` per `memberId`

**Step 4 — Confirm**

```
✓ Card created: [shortUrl from create_card]
  Board : [board.name] → [listName]
  Member: [fullName or "unassigned"]
  Checklists: N created, M items total
  Labels: [names applied] (omitted: [names with no match in labels[]])
```

### Error handling

| Failure                               | Action                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| MCP not connected                     | Abort Phase 5; deliver paste-ready output (Phase 4); check MCP server config and `TRELLO_*` env vars |
| `boardId` / `listId` not resolved     | Re-run § **MCP config discovery**; do not guess IDs                                                  |
| Label name not in `.trello.json`      | Skip that label; continue; report under **omitted**; do not auto-create labels                       |
| Member not in `members[]`             | Stop before create; list valid usernames                                                             |
| Card creation fails                   | Abort; report error; no checklists created                                                           |
| Checklist creation fails mid-sequence | Report card URL; which checklists succeeded vs "add manually"                                        |
| Label/member fallback fails           | Report card URL; list what was applied at create vs failed fallback                                  |

**NEVER** leave a partial card without reporting what was and wasn't created.
