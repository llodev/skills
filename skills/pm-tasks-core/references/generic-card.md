---
description: Tool-agnostic card blocks (title, description, checklists, timeline, labels) for pm-tasks-core Phase 3. Read entire file before building paste blocks.
---

# Generic card blocks (Phase 3)

> This file is referenced by every `pm-tasks-<tool>` adapter. Changes here may affect all adapters — coordinate via Changesets.

Produce the following blocks **in order**. Adapt section names in Phase 4 per tool (see the adapter's `references/format.md`).

For **paste/rendering** when a named tool is chosen, apply the adapter's paste-health rules during Phase 4 — not while drafting generic blocks.

---

## Title

Pattern: `[System/Area] — [Phase N] ([short summary of what's built])`

Max 80 characters. Examples:

- `API Scaffold — Phase 1 (NestJS + shared wiring)`
- `Celebrations BC — Phase 3 (domain + contracts + HTTP)`

---

## Description

```
**Goal:** [one sentence from the plan's goal, translated to plain language]

**Spec:** [file or document reference]
**Plan:** [file or document reference]
**Prerequisite:** [phase or condition that must be true before starting]

---

**Deliverables**
• [artifact 1]
• [artifact 2]
(group by layer/area if more than 7 items)

---

**Out of scope**
• [explicitly deferred item 1]
• [item 2]

**Next step**
**[Phase N+1 or follow-up name]** — [one sentence]
```

- Use `**Section**` labels (not `##`) when formatting for tools that flatten Markdown headings on paste.
- **Publish flows (Phase 5+):** the adapter decides whether to omit **Out of scope** / **Next step** from `desc` / `html_notes` — see the adapter's `references/format.md`.
- **Generic paste:** include Out of scope and Next step unless the user asks to drop them.

---

## Implementation checklist

Structure:

```
### Pre-flight
- [ ] [prerequisite check 1]
- [ ] [prerequisite check 2]

### [Block or Group name] (Tasks N–M)
- [ ] Task N — [action verb] + [artifact] [(skill or note if relevant)]
- [ ] Task N+1 — ...

### [Next block]
...
```

Rules:

- One checkbox per task, not per step. Steps live inside the plan, not the card.
- If a task includes a skill invocation, note it: `(skill: ts-ddd-entity)`
- If a plan has no explicit blocks, group tasks by layer: setup, domain, application, infra, http, docs.
- Pre-flight (baseline verification) always comes first.

---

## Verification checklist

Draw from the plan's `Done when` / `Self-review checklist` / `Final verification` section.

```
### Verification

- [ ] [test command] — passes
- [ ] [build command] — exits 0
- [ ] [runtime check] (e.g. curl localhost:3001/health returns expected payload)
- [ ] [security/quality check] (e.g. no secrets staged, no forbidden imports)
- [ ] [git hygiene check] (e.g. N commits, one per task)
```

---

## Timeline estimate

Estimate calendar time for a developer using AI assistance (Claude, Cursor, Copilot, etc.).

**Complexity tiers per task:**

| Tier               | Description                                  | AI-assisted estimate |
| ------------------ | -------------------------------------------- | -------------------- |
| S — Setup/config   | Files, manifests, workspace wiring           | 5–15 min             |
| M — Standard TDD   | Write test → implement → pass                | 15–30 min            |
| L — Complex domain | Entity/aggregate with invariants, many tests | 30–60 min            |
| XL — Large block   | 4+ related tasks sharing the same fixture    | 1–2 h                |
| Docs               | README, inline docs, layout updates          | 5–15 min             |

When a task sits between two tiers, **take the lower one**. The tiers already
assume AI assistance; rounding up is the default bias and it compounds across a
plan.

**Estimation formula (effort):**

1. Classify each task by tier.
2. Sum the estimates.
3. Add 20% buffer for integration, context-switching, and debugging. **This is
   the only buffer.**
4. Round to a practical unit (hours or days).
5. Present a range: `optimistic — realistic`.

**Calendar formula (effort → due date):**

A working day is **6 focused hours**. Convert the _realistic_ effort:

```
calendar_days = ceil(realistic_hours / 6)
```

- `realistic_hours ≤ 6` → **due today**. Do not push a same-day amount of work
  into tomorrow.
- Count **business days** from today (skip weekends).
- **NEVER add slack on top.** Step 3 already bought the buffer; adding calendar
  padding applies it twice and is the single biggest source of inflated
  deadlines.

Adapters set their native due-date field from this formula; see the adapter's
`references/format.md`.

**Format:**

```
### Estimated timeline (AI-assisted)

| Scope                                       | Estimate                |
| ------------------------------------------- | ----------------------- |
| Optimistic (focused session, no blockers)   | Xh                      |
| Realistic (normal day, some back-and-forth) | Xh / X days             |
| Task count                                  | N tasks across N blocks |

> Timeline assumes a developer with AI assistance (Claude/Cursor/Copilot).
> Solo (no AI): multiply by 3–5×.
```

Generic output may keep the timeline **as Markdown table**. Adapters may flatten or relocate the table during Phase 4 per their paste-health rules in the adapter's `references/format.md`.

---

## Labels / Tags

Suggest **3–6** from plan context: phase, domain/layer (`api`, `web`, …), status, size tier from timeline tiers. Apply the adapter's label palette and caps (defined in the adapter's `references/format.md`).
