# pm-tasks-asana calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two dogfood-surfaced defects in the `pm-tasks-asana` skill — number custom fields written in the wrong unit, and `inheritParentFields` misread as a field whitelist — and record the Option A decision on issue #47.

**Architecture:** Docs + JSON-Schema calibration only, no runtime/transport code. Add an optional `unit` annotation to number custom fields in the config schema, then harden `SKILL.md` and `anti-patterns/asana.md` so the agent (a) converts source values to a field's native unit and (b) treats `inheritParentFields` as an auto-copy floor while always filling domain/date fields per the task's real scope.

**Tech Stack:** JSON Schema (ajv 2020, validated by `scripts/checks/validate-schemas.mjs`), Markdown skill sources, changesets, `make` targets.

## Global Constraints

- One PR = one changeset = one release. Branch name = the version (`v1.14.0`), no prefix/suffix. — from `CLAUDE.md` release convention.
- Release-1 bump = **minor** (additive optional schema property `unit`).
- `SKILL.md` is modified → `make pre-release` skill-judge gate applies: run `make skill-judge`; ratchet `scripts/skill-judge-baseline.json` if Δ ≥ +3; bypass with `SKIP_SKILL_JUDGE_GATE=1` only when drift ∈ [-2, +2], annotating the decision in the changeset.
- Schema edits must keep `additionalProperties: false` valid — every new field is a declared property.
- The live `.asana.json` is untracked (gitignored); no repo fixture validates config instances, so no fixture updates are required.
- Work happens on branch `v1.14.0` (already checked out; spec already committed there).

---

## File Structure

| File                                           | Responsibility                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `skills/pm-tasks-asana/schemas/config.json`    | add optional `unit` to `customFields[]`; sharpen `inheritParentFields` description     |
| `skills/pm-tasks-asana/SKILL.md`               | unit-conversion mapping rule; reword the subtask lines (57 + 87) for floor-not-ceiling |
| `skills/pm-tasks-asana/anti-patterns/asana.md` | NEVER-write-raw-unit rule; NEVER-blank-domain-field rule                               |
| `.changeset/<name>.md`                         | minor changeset for `@llodev/pm-tasks-asana`                                           |
| issue #47 (GitHub)                             | comment recording Option A + link to spec (no repo file)                               |

---

## Task 1: Schema — `unit` annotation + `inheritParentFields` floor semantics

**Files:**

- Modify: `skills/pm-tasks-asana/schemas/config.json` (customFields item props ~62-66; inheritParentFields description ~97)
- Test: `scripts/checks/validate-schemas.mjs`

**Interfaces:**

- Produces: config property `customFields[].unit` (enum `minutes|hours|days|points`), consumed by the SKILL.md unit-conversion rule (Task 2) and anti-patterns rule (Task 3).

- [ ] **Step 1: Add `unit` to the `customFields[]` item.** In `config.json`, replace the `type` → `alias` sequence:

  Old:

  ```json
          "type": {
            "type": "string",
            "enum": ["text", "number", "enum", "multi_enum", "date", "people"]
          },
          "alias": { "type": "string", "pattern": "^[a-z0-9-]+$" },
  ```

  New:

  ```json
          "type": {
            "type": "string",
            "enum": ["text", "number", "enum", "multi_enum", "date", "people"]
          },
          "unit": {
            "type": "string",
            "enum": ["minutes", "hours", "days", "points"],
            "description": "Native unit a number field is stored in. When the source value uses a different unit, convert to this unit before writing (e.g. hours→minutes ×60). Only meaningful for type:\"number\"."
          },
          "alias": { "type": "string", "pattern": "^[a-z0-9-]+$" },
  ```

- [ ] **Step 2: Sharpen the `inheritParentFields` description.** Replace:

  Old:

  ```json
          "description": "Custom field IDs whose values flow from parent to subtask at create time."
  ```

  New:

  ```json
          "description": "Custom field IDs auto-copied parent->subtask at create time (a floor, NOT a whitelist). Fields not listed are still set per-task from the card's actual scope and must never be left blank just because they are absent here."
  ```

- [ ] **Step 3: Validate the schema compiles.**

  Run: `node scripts/checks/validate-schemas.mjs`
  Expected: exit 0, no error mentioning `config.json`.

- [ ] **Step 4: Confirm the edits are present.**

  Run: `grep -c '"unit"' skills/pm-tasks-asana/schemas/config.json && grep -c 'auto-copied parent' skills/pm-tasks-asana/schemas/config.json`
  Expected: `1` and `1`.

- [ ] **Step 5: Commit.**

  ```bash
  git add skills/pm-tasks-asana/schemas/config.json
  git commit -m "feat(pm-tasks-asana): add unit annotation + clarify inheritParentFields floor semantics"
  ```

---

## Task 2: SKILL.md — unit-conversion rule + floor-not-ceiling wording

**Files:**

- Modify: `skills/pm-tasks-asana/SKILL.md` (line 57 subtask bullet; Phase 4 Labels/Due-date bullets ~69-70; line 87 subtask publish step)
- Test: `node scripts/checks/validate-frontmatter.mjs` + read-through greps

**Interfaces:**

- Consumes: `customFields[].unit` from Task 1.

- [ ] **Step 1: Reword the model-section subtask bullet (line ~57).** Replace:

  Old:

  ```markdown
  - **Subtasks** — one level deep. Custom fields and assignee do NOT auto-propagate from parent; the adapter sets them explicitly per `subtaskDefaults.inheritParentFields` in `.asana.json`.
  ```

  New:

  ```markdown
  - **Subtasks** — one level deep. Custom fields and assignee do NOT auto-propagate from parent. `subtaskDefaults.inheritParentFields` lists the fields **auto-copied** from the parent (a floor, not a whitelist); every subtask still gets its own domain fields (e.g. Competência, Módulo) and due date filled from what that subtask actually touches — never left blank, never inherited unless its ID is listed.
  ```

- [ ] **Step 2: Add the unit-conversion mapping bullet in Phase 4.** Replace the Labels + Due-date bullets:

  Old:

  ```markdown
  - Labels → custom field options (resolved via `.asana.json` `customFields[]`).
  - Due date → `due_on` (YYYY-MM-DD).
  ```

  New:

  ```markdown
  - Labels → custom field options (resolved via `.asana.json` `customFields[]`).
  - Number custom fields with a `unit` (`.asana.json` `customFields[].unit`) → convert the source value to the field's native unit before writing. E.g. an effort of "12 h" into a `minutes` field is `720`, not `12`.
  - Due date → `due_on` (YYYY-MM-DD).
  ```

- [ ] **Step 3: Reword the Phase 5 subtask publish step (line ~87).** Replace:

  Old:

  ```markdown
  2. **Subtasks** — `create_tasks` per subtask with `parent: parentGid`, `name`, `assignee` (inherited or per-subtask), `custom_fields` matching `subtaskDefaults.inheritParentFields`.
  ```

  New:

  ```markdown
  2. **Subtasks** — `create_tasks` per subtask with `parent: parentGid`, `name`, `assignee` (inherited or per-subtask), `custom_fields` = the parent values for the fields in `subtaskDefaults.inheritParentFields` (auto-copy floor) **plus** each subtask's own domain fields (Competência, Módulo) and due date resolved from what it actually touches. Never leave a domain/date field blank because it is absent from `inheritParentFields`.
  ```

- [ ] **Step 4: Validate frontmatter still parses.**

  Run: `node scripts/checks/validate-frontmatter.mjs`
  Expected: exit 0.

- [ ] **Step 5: Confirm the three edits landed.**

  Run: `grep -c 'auto-copied' skills/pm-tasks-asana/SKILL.md && grep -c 'is `720`' skills/pm-tasks-asana/SKILL.md && grep -c 'auto-copy floor' skills/pm-tasks-asana/SKILL.md`
  Expected: `1`, `1`, `1`.

- [ ] **Step 6: Commit.**

  ```bash
  git add skills/pm-tasks-asana/SKILL.md
  git commit -m "docs(pm-tasks-asana): unit-conversion rule + floor-not-ceiling subtask wording"
  ```

---

## Task 3: anti-patterns/asana.md — two NEVER rules

**Files:**

- Modify: `skills/pm-tasks-asana/anti-patterns/asana.md` (insert a section before "## Subtasks do NOT inherit…"; extend that section's tail ~62)
- Test: read-through greps

**Interfaces:**

- Consumes: `customFields[].unit` (Task 1) and the floor semantics (Tasks 1–2).

- [ ] **Step 1: Add the unit NEVER section.** Insert immediately before the line `## Subtasks do NOT inherit custom fields automatically`:

  ```markdown
  ## Number custom fields are written in their native unit

  **NEVER** write a raw human number into a `number` custom field that declares a `unit` without converting to that native unit first. Example: a "Duração estimada" field with `unit: "minutes"` receiving an effort of 12 hours must be written as `720`, not `12` (which would mean 12 minutes). **Why:** Asana stores the number verbatim; the wrong unit silently under/over-states effort and corrupts capacity math.
  ```

- [ ] **Step 2: Extend the inheritance section.** Replace its final line:

  Old:

  ```markdown
  Failing to do this leaves subtasks with empty custom fields even when the parent had them set.
  ```

  New:

  ```markdown
  Failing to do this leaves subtasks with empty custom fields even when the parent had them set.

  **NEVER** treat `inheritParentFields` as the complete field set for a task or subtask — it is the **auto-copy floor**, not a whitelist. Competência, Módulo, and due date must be filled on every task/subtask from what it actually touches (a single task may span more than one competência/módulo). Leaving them blank because they are absent from `inheritParentFields` is the exact failure that loses tracking. **Why:** the config only names what is copied automatically; everything else is still required, and a silently blank field reads as "no scope" to whoever runs the board. When a value is genuinely unknown (e.g. due date), ask instead of leaving it blank.
  ```

- [ ] **Step 3: Confirm both rules landed.**

  Run: `grep -c 'native unit' skills/pm-tasks-asana/anti-patterns/asana.md && grep -c 'auto-copy floor' skills/pm-tasks-asana/anti-patterns/asana.md`
  Expected: `2` (unit section title + rule) and `1`. (If the first is `1`, that is also fine — the assertion is "≥1".)

- [ ] **Step 4: Commit.**

  ```bash
  git add skills/pm-tasks-asana/anti-patterns/asana.md
  git commit -m "docs(pm-tasks-asana): NEVER rules for unit conversion + blank domain fields"
  ```

---

## Task 4: Changeset + skill-judge gate

**Files:**

- Create: `.changeset/<generated-name>.md`
- Possibly modify: `scripts/skill-judge-baseline.json` (only if ratcheting)

**Interfaces:** none (release plumbing).

- [ ] **Step 1: Run full validation before releasing.**

  Run: `make validate`
  Expected: exit 0 (schema, frontmatter, links, locale parity, lint, coverage, size all green).

- [ ] **Step 2: Run the skill-judge and record the score.** `SKILL.md` changed, so the pre-release gate will check it.

  Run: `make skill-judge`
  Record the numeric score for `pm-tasks-asana` and compare against `scripts/skill-judge-baseline.json`.
  - If Δ ≥ +3: ratchet — update the `pm-tasks-asana` entry in `scripts/skill-judge-baseline.json` to the new score.
  - If drift ∈ [-2, +2]: no baseline change; plan to bypass the gate at version time and annotate why.

- [ ] **Step 3: Create the changeset.**

  Run: `make changeset` and select `@llodev/pm-tasks-asana` → **minor**. Then set its body to:

  ```markdown
  ---
  "@llodev/pm-tasks-asana": minor
  ---

  Number custom fields can declare a `unit` (`minutes|hours|days|points`); values are converted to the field's native unit before writing (e.g. 12 h → 720 min), fixing estimated-duration being stored in the wrong unit. Clarify that `subtaskDefaults.inheritParentFields` is an auto-copy floor, not a whitelist — Competência/Módulo/due date are filled per-task from actual scope and never left blank. SKILL.md + anti-patterns hardened.

  skill-judge: recorded score <N> vs baseline <M>; <ratcheted baseline | bypass with SKIP_SKILL_JUDGE_GATE=1, drift within noise band>.
  ```

  Replace `<N>`, `<M>`, and the bracketed choice with the actual values from Step 2.

- [ ] **Step 4: Stage baseline (only if ratcheted) + changeset, then commit.**

  ```bash
  git add .changeset scripts/skill-judge-baseline.json
  git commit -m "chore(release): changeset for pm-tasks-asana field-unit + subtask-field calibration"
  ```

  (If baseline was not ratcheted, `git add .changeset` only — the unchanged baseline stays out of the commit.)

---

## Task 5: Record Option A on issue #47 (Release 2 decision)

**Files:** none (GitHub comment).

- [ ] **Step 1: Comment the decision, linking the spec.**

  ```bash
  gh issue comment 47 --repo llodev/skills --body "Decision: **Option A** — extend core \`TaskCreateRequest\` to optionally carry \`labels\`, \`priority\`, \`estimate\`, \`dueDate\`; each adapter maps the subset its tool supports at create time (Linear → single \`save_issue\`; Asana → \`custom_fields\` + \`due_on\`; Trello → labels + due; Jira → fields/timetracking).

  Scoped to its own release (core + 4 adapters) — separate from the pm-tasks-asana calibration shipping in v1.14.0. Design record: docs/superpowers/specs/2026-07-14-pm-tasks-asana-calibration-design.md (Release 2 section)."
  ```

  Expected: `gh` prints the new comment URL.

- [ ] **Step 2: Confirm the comment posted.**

  Run: `gh issue view 47 --repo llodev/skills --comments | grep -c 'Option A'`
  Expected: `≥1`.

---

## Post-plan manual step (user's own config, not a repo change)

Annotate the live `.asana.json` "Duração estimada" custom field with `"unit": "minutes"` so the new conversion rule engages. This file is untracked/gitignored — it is the user's project data, edited by hand, not part of any task above.

## Release (user-driven, after all tasks green)

`make pre-release` → `make release-version` (or `SKIP_SKILL_JUDGE_GATE=1 make release-version` per Task 4 Step 2) → open PR `feat(release): v1.14.0 — pm-tasks-asana field-unit + subtask-field calibration` → merge → `make release-publish`.
