---
"@llodev/pm-tasks-core": minor
"@llodev/pm-tasks-trello": minor
---

Recalibrate effort tiers and pin the effort→calendar conversion, so generated estimates and due dates stop running long.

Two independent sources of inflation were compounding:

1. **The tier table was written for a heavier baseline.** Every tier is cut ~35%: S/Docs `10–20 min → 5–15 min`, M `20–45 min → 15–30 min`, L `45–90 min → 30–60 min`, XL `1.5–3 h → 1–2 h`. The 20% formula buffer is deliberately left untouched — one lever, so the net effect is a predictable ~35% reduction rather than a compounded one. A new tie-break rule sends a task that sits between two tiers to the **lower** one; rounding up was the unstated default bias and it compounded across a plan.

2. **Nothing defined how effort became calendar time.** `generic-card.md` now fixes a working day at **6 focused hours** and derives the due date as `ceil(realistic_hours / 6)` business days from today, with `≤ 6 h → due today`. Previously the conversion was left to the agent, which padded conservatively — applying a second, undocumented buffer on top of the 20% already in the effort formula. Two new anti-patterns in `anti-patterns/core.md` forbid that double buffer and the round-up bias explicitly.

Trello's `references/format.md` § _Due date_ no longer restates its own rule ("end of the realistic window"); it now delegates to the core calendar formula and pins range handling to the upper bound of the realistic window. Trello cards therefore get materially nearer due dates — same-day for anything under a focused day of work.

No code changes: `estimation.ts` normalizes a supplied estimate and is unaffected. `contract.md` is untouched.
