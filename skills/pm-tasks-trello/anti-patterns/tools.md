# Trello ingestion anti-patterns

Apply **only** when Phase 4 targets Trello (after reading [`../references/format.md`](../references/format.md)). These are paste/rendering pitfalls that **generic markdown** intuition gets wrong.

**Load this entire file** in Phase 4. **Do NOT load** for generic-only output.

---

## Paste health and fallbacks (canonical)

Use when preview looks wrong **or** the user says paste mangled formatting. **Authoritative detail** also lives in [`../references/format.md`](../references/format.md).

| Target     | Healthy paste                                                                                                                                           | If it degrades → fallback                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Trello** | **No Markdown tables** anywhere in DESCRIPTION (timeline, tiers, grids) — bullets or `**Key:** value` lines only. Checklist lines **flat**, no nesting. | Flatten tables → bullets; reread § _Tables vs paste_ in [`../references/format.md`](../references/format.md). |

**Switching tools mid-thread:** re-run Phase 4 **exclusive** load for the **new** tool; do not carry Trello rules into another adapter (see **Cross-tool** below).

---

## Trello

**NEVER** leave **Markdown tables** in descriptions or timelines intended for Trello. **Why:** Trello descriptions do **not** render tables — users see garbage rows. Replace with bullets or a compact key-value bullet list.

**NEVER** use nested markdown (`- item\n  - child`) inside **checklist items**. **Why:** Trello checklist lines are flat; nesting is misleading or stripped.

**NEVER** assume parent/child **card URLs** exist before cards are created. **Why:** links are placeholders until created; prefer explicit note: `"create child cards then replace #link placeholders"`.

**NEVER** exceed **~80 chars** on titles without warning. **Why:** truncates in board view; title rule in [`skills/pm-tasks-core/references/generic-card.md`](../../pm-tasks-core/references/generic-card.md) exists for this.

**NEVER** call `create_card` / `trello_create_checklist` before the user confirms the Phase 5 preview. **Why:** creates real board objects without approval.

**NEVER** pass label **names** to `create_card` — only **`idLabels`** (and **`idMembers`** with member IDs) resolved from `.trello.json`. **Why:** the API rejects names; wrong IDs attach to the wrong board.

**NEVER** guess `boardId`, `listId`, `labels[].id`, or `members[].id` when `.trello.json` exists. **Why:** stale or invented IDs put cards on the wrong board or column; refresh via the discovery flow in [`../references/mcp-config.md`](../references/mcp-config.md) § **MCP config discovery**.

**NEVER** auto-create labels with `trello_create_label` during publish unless the user explicitly asks. **Why:** pollutes the board palette; omit unknown names and report **omitted**.

**NEVER** commit the active token user (or any per-developer member id) into `members[]` in `.trello.json`. **Why:** the file is shared in git; resolve "me" at runtime via `trello_get_member({ memberId: "me" })` at Phase 5.2.5 — each developer's `TRELLO_TOKEN` resolves to themselves without editing the repo.

---

## Cross-tool

**NEVER** apply one tool's quirks to another after switching targets mid-chat. **Why:** user said "actually use Jira/Asana" — re-read the matching adapter reference + **re-apply only that adapter's rules** instead of these.

---

## Query-string concat in custom Trello API calls

When building Trello API URLs by hand (without the URL constructor), check whether the path already contains a `?` before appending `?key=...&token=...`. Trello will silently parse `fields=id,name?key=X` as a single field value and return 401. Prefer:

```javascript
const url = new URL(`https://api.trello.com/1${path}`);
url.searchParams.set("key", KEY);
url.searchParams.set("token", TOKEN);
for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
```

(Bug surfaced in v1.0.3; latent since v1.0.0.)

## `create_card` ignores `idMembers` silently

`mcp__trello__create_card` accepts an `idMembers` array but the underlying MCP does not assign the members. Always follow up with `mcp__trello__trello_add_member_to_card` per member ID. Never trust the create-time response for member assignment.

## `add_member_to_card` may report failure on success

`mcp__trello__trello_add_member_to_card` sometimes returns `"Error adding member to card: Unknown error occurred"` even when the member was added. After the call, re-fetch the card with `mcp__trello__get_card { includeDetails: true }` and check `members[]`. Treat the error as a warning unless the re-fetch confirms the member is absent.
