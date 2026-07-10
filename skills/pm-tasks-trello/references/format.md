# Trello Formatting Reference

## Tables vs paste (critical)

Markdown **tables do not render** in Trello descriptions — pasted `|` grids show as unusable prose.

When filling **`DESCRIPTION`** (and any prose meant for paste): **flatten all tables** from the generic card (timeline, tier summary, deliverables grids, etc.) into **bullets** or lines like `**Optimistic:** 4h`, `**Realistic:** 6h`.

**Routing tables inside _this_ file** (checklist naming, labels) are **instructions for you** mapping blocks → structure. **Never** copy those tables into the card body.

Paste/rendering **NEVER** rules: [`../anti-patterns/tools.md`](../anti-patterns/tools.md) (Trello section).

---

## Card anatomy

Trello cards have: **title**, **description** (Markdown, free-text), **labels** (colored tags), **checklist(s)** (named, checkboxes), **due date**, and **attachments**. There is no native "ticket type" or hierarchy — parent/child cards are simulated with links.

## Title

- Max ~100 chars (Trello truncates in board view around 80).
- Format: `[Area] — PhaseN (summary)` — matches the generic format, no change needed.

## Description

Trello descriptions render Markdown. Use the generic description block as-is.

Additional Trello conventions:

- Add a **Spec/Plan links** block at the top if the files are in a git repo with a URL:
  ```
  📄 [Spec](https://github.com/.../spec.md) · [Plan](https://github.com/.../plan.md)
  ```
- Separate sections with `---` (renders as horizontal rule).
- Trello does **not** render tables — replace the Deliverables table with a bullet list if you used one.

## Checklists

Trello supports **multiple named checklists on one card**. Split as follows:

| Generic block     | Trello checklist name           |
| ----------------- | ------------------------------- |
| Pre-flight        | `Pre-flight`                    |
| Block A / Group 1 | `Implementation — [Block Name]` |
| Block B / Group 2 | `Implementation — [Block Name]` |
| ...               | (one checklist per block)       |
| Verification      | `Verification`                  |

For small cards (≤10 tasks total), use a single `Checklist` instead of splitting.

Trello checklist item format: plain text, no markdown inside items.

```
Task 1 — scaffold workspace (config files)
Task 2 — extend env schema with Firebase vars (TDD)
```

Avoid nesting. Trello items are flat. **Do not** prefix items with `✅` / `[x]` in the paste payload — Trello's native checkboxes track state.

If you show a **sample** checklist to the user outside the paste block, plain `✅` is fine for readability.

## Labels

Trello labels are **board-scoped** and identified by **ID** in the API. When `.trello.json` exists, use only label **names** listed in `labels[]` — do not invent labels or use empty-name color stubs from the board.

For paste output, the agent infers candidate labels from the generic card content (file paths it touches, plan keywords, the LABELS block) and matches them against `labels[]` by `name` or `alias`. If a candidate has no match in `labels[]` (e.g. `phase-2`, `ddd`), omit it and list under **omitted** in the wrapper — do not call `trello_create_label` unless the user explicitly asks.

Apply **3–5** named labels max (board gets noisy beyond that).

## Due date

Set to the **realistic** estimate from the timeline section, starting from today.

If the estimate is a range (e.g. "4–6h"), set the due date at the end of the realistic window.

## Parent / child cards (large phases)

For phases with >15 tasks (like a large BC):

1. Create one **parent card** with the full description and a link to the plan.
2. Create one **child card per block**, titled `[Phase] — Block [X]: [Block Name]`.
3. In the parent card description, link to each child card:
   ```
   ### Sub-cards
   - [Block A — Workspace + VOs](#link)
   - [Block B — Core domain](#link)
   - [Block C — Application](#link)
   ```
4. Add the `epic` or `parent` label to the parent card.

## Output format for Trello

When outputting for Trello, present the content as:

```
--- TRELLO CARD ---

TITLE:
[title here]

DESCRIPTION (paste into card description):
[description markdown]

CHECKLISTS:
[for each block, list: "Checklist name → items"]

LABELS: [comma-separated — names from .trello.json labels[] only]

MEMBER: [username, "me", or omit]

DUE DATE: [date or relative like "3 days from now"]
---
```
