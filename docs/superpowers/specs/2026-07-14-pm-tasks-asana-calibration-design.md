# pm-tasks-asana calibration + #47 decision record

**Date:** 2026-07-14
**Status:** Approved (design)
**Scope:** Two releases. This spec fully specifies Release 1 (pm-tasks-asana calibration); Release 2 (issue #47) is only a decision record with pointers — it gets its own spec/plan cycle.

## Problem

Surfaced during autonomous dogfood of `pm-tasks-asana`. Two real defects and one deferred cross-adapter decision:

1. **Estimated-duration unit is silently wrong.** The Asana "Duração estimada" field is a `number` custom field denominated in **minutes**. The agent wrote the human value raw — `12` (meaning 12 hours) landed as 12 minutes; correct is `720`. Root cause: `customFields[]` in the config schema carries `type: "number"` but **no unit metadata**, and neither `SKILL.md` nor `anti-patterns/asana.md` states that a number field can denominate a unit or that a human value must be converted to the field's native unit.

2. **`inheritParentFields` is read as a ceiling, not a floor.** The config schema description is correct — _"Custom field IDs whose values flow from parent to subtask at create time."_ — but `SKILL.md:87` (_"custom_fields matching subtaskDefaults.inheritParentFields"_) and `anti-patterns/asana.md:51-62` induce the agent to treat the list as a whitelist. Result: the agent created a subtask inheriting only Prioridade + Status and left Competência, Módulo, and due date **blank**. Correct semantics: `inheritParentFields` is the set auto-copied parent→subtask; every task/subtask still gets its domain fields (Competência, Módulo) and due date filled **per its actual scope** (which may span multiple values), never left blank, and never inherited unless explicitly listed.

3. **Follow-up (issue #47):** cross-adapter decision on whether `task.create` sets labels/priority/estimate/dueDate at creation time. Core `TaskCreateRequest` carries only `name` + `description`. **Deferred** to its own release — decision recorded here (Option A).

## Non-goals

- No change to core `TaskCreateRequest` in Release 1 (that is #47 / Release 2).
- No new CRUD verbs. No transport-layer field-writing changes beyond documenting existing behavior.
- No auto-detection of a field's unit from Asana's API — the unit is an explicit config annotation the user maintains.

---

## Release 1 — pm-tasks-asana calibration

### Component A — number-field unit awareness

**A1. Config schema (`schemas/config.json`)**
Add an optional `unit` to each `customFields[]` item:

```jsonc
"unit": {
  "type": "string",
  "enum": ["minutes", "hours", "days", "points"],
  "description": "Native unit a number field is stored in. When the source value uses a different unit, convert to this unit before writing (e.g. hours→minutes ×60). Only meaningful for type:\"number\"."
}
```

- Additive and optional → existing `.asana.json` files stay valid (`additionalProperties: false` still holds because `unit` is now a declared property).
- No enforcement that `unit` requires `type: "number"` at schema level; the SKILL states it is only meaningful there. (Rationale: keeps the JSON Schema simple; conditional `if/then` is not worth the complexity for a lint-only concern.)

**A2. `SKILL.md` — custom-field mapping (Phase 4/5)**
Add an explicit conversion rule where custom-field resolution is described: when a `number` custom field declares a `unit`, convert the source value to that native unit before writing. Concrete example: a `minutes` field receiving "12 h" is written as `720`, not `12`.

**A3. `anti-patterns/asana.md`**
New NEVER rule: never write a raw human number into a unit-denominated number field without converting to the field's native unit. Worked example: `12` into a `minutes` field is 12 minutes (wrong); 12 hours is `720`.

### Component B — `inheritParentFields` floor-not-ceiling

**B1. Config schema (`schemas/config.json`)**
Sharpen the `inheritParentFields` description to state it is an auto-copy floor, not a whitelist: fields **not** listed are still populated per-task from the card's actual scope and must never be left blank solely because they are absent from the list.

**B2. `SKILL.md:57` and `SKILL.md:87`**
Reword so the two lines make explicit:

- `inheritParentFields` = the set auto-copied parent→subtask at create (the floor).
- Every task and subtask independently receives Competência, Módulo, and due date determined by what that task **actually touches** (which may be multiple values), regardless of inheritance.
- A field is inherited from the parent **only** when its ID is explicitly listed.

**B3. `anti-patterns/asana.md:51-62`**
Add a NEVER rule alongside the existing "subtasks do NOT inherit custom fields automatically" section: never leave a task/subtask's domain (Competência, Módulo) or due-date fields blank because they are not in `inheritParentFields`. The list is not the complete field set. A single task may touch more than one competência/módulo — fill each per the task's real scope. When a value is genuinely unknown (e.g. due date), ask rather than leaving blank.

### Verification (Release 1)

- `make validate` passes (schema changed).
- Existing `.asana.json` fixtures and adapter tests remain green (additive schema change).
- Manual read-through: the three source spots (`SKILL.md:57`, `:87`, `anti-patterns/asana.md:51-62`) no longer read as a whitelist; the unit rule is unambiguous with a worked example.

### Release mechanics (Release 1)

- `make changeset` → **minor** bump (additive schema feature: `unit`).
- Branch name = the version (e.g. `vX.Y.0`), per repo convention. PR title `feat(release): vX.Y.0 — pm-tasks-asana field-unit + subtask-field calibration`.
- `SKILL.md` is modified → `make pre-release` skill-judge gate applies: run `make skill-judge`, ratchet `scripts/skill-judge-baseline.json` if Δ ≥ +3, or bypass with `SKIP_SKILL_JUDGE_GATE=1` when drift is within [-2, +2] — annotate the decision in the changeset summary.
- One PR = one changeset = one release.

---

## Release 2 — issue #47 (decision record only)

**Decision: Option A.** Extend core `TaskCreateRequest` to optionally carry `labels`, `priority`, `estimate`, `dueDate`; each adapter maps the subset its tool supports at create time (Linear → single `save_issue`; Asana → `custom_fields` + `due_on`; Trello → labels + due; Jira → fields/timetracking).

**Why deferred:** touches core + all four adapters → its own brainstorm → spec → plan → release cycle. Out of scope for Release 1.

**Actions in this plan:** record Option A on issue #47 (comment) and link back to this spec. No code.

---

## Files touched (Release 1)

| File                                           | Change                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `skills/pm-tasks-asana/schemas/config.json`    | add optional `unit` to `customFields[]`; sharpen `inheritParentFields` description |
| `skills/pm-tasks-asana/SKILL.md`               | unit-conversion rule (Phase 4/5); reword lines 57 + 87 for floor-not-ceiling       |
| `skills/pm-tasks-asana/anti-patterns/asana.md` | NEVER unit-conversion rule; NEVER blank-domain-field rule (near lines 51-62)       |
| `.changeset/*.md`                              | minor changeset                                                                    |

## Open questions

None. Forks resolved: unit as enum `minutes|hours|days|points`; #47 split and recorded as Option A.
