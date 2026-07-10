# Card & workflow anti-patterns (core)

Expert guardrails — violating these wastes board space, breaks paste targets, or misleads reviewers.

---

## Structure & granularity

**NEVER** create one checklist item per micro-step from the plan (e.g. "open file", "run linter", "save"). **Why:** the card mirrors **tasks/outcomes**, not every keystroke; noise hides real progress.

**NEVER** duplicate the entire plan verbatim into description or checklist. **Why:** defeats the purpose of a summary; links to plan/spec suffice.

**NEVER** merge multiple phases into a single card without explicit user consent. **Why:** timelines, ownership, and "done" blur; violates one-card-one-phase default.

**NEVER** bury **Pre-flight / prerequisites** inside a random block. **Why:** skipped baselines cause false "blocked" churn; baseline always tops the checklist.

---

## Honesty about sources

**NEVER** present **inferred** goals, prerequisites, verification, or out-of-scope as if they appeared in the plan. **Why:** teammates act on fiction. Tag with `(inferred)` or state in conversational wrapper: "Plan had no Done when — verification derived from tasks."

**NEVER** invent file paths or spec links not present in the plan. **Why:** stale links wreck trust; use placeholders only if unavoidable: `[link TBD]` and say why.

---

## Paste-ready output

**NEVER** put meta-commentary (**"I'll now…"**, rationale paragraphs) **inside** the titled blocks (`TITLE`, `DESCRIPTION`, checklist sections meant for paste). **Why:** pollutes tooling fields. Keep prose **before or after** the paste blocks only.

**NEVER** use vague verification lines like `"tests pass"` without naming **which** command or scope. **Why:** unmeasurable; use concrete commands (`pnpm test`, `pytest apps/api/...`) from the plan or mark `(add command)`.

---

## Estimates & sizing

**NEVER** report a single point estimate as certainty (e.g. "4h exactly"). **Why:** AI-assisted variance is wide; stick to optimistic — realistic range and optional buffer narrative.

**NEVER** apply the tier table blindly to spikes, migrations, or "unknown-unknown" chunks. **Why:** those need **XL** or explicit `"too uncertain — spike first"` flag in timeline notes.

---

## Scale

**NEVER** put **100+** checkbox items on one card when blocks exist. **Why:** defeats tracking; split by block per SKILL.md parent/child guidance.

---

## Conflicting or missing input

**NEVER** silently pick a phase when multiple plan files apply. **Why:** wrong scope. Prefer: list candidates, recommend one default, confirm.

**NEVER** output an empty checklist because the plan "reads like prose". **Why:** salvage with inferred task bullets or ask one clarifying question before shipping empty.

**NEVER** invent a **Goal** or **Done when** for task-only plans (no Goal / verification section) without tagging **`(inferred)`** in the conversational wrapper. **Why:** prose-only plans look complete but aren't; teammates treat invented goals as authoritative. Derive from dominant theme / last tasks and say so explicitly.
