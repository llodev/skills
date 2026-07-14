# Lifecycle Fidelity (pm-tasks) — design

**Date:** 2026-07-14
**Status:** Approved (design). Umbrella spec for a multi-release program; R1 is the immediate implementation target.
**Supersedes/absorbs:** GitHub issue #47 (create-time fields, Option A) — now the "create" moment of this theme.

## Problem

Surfaced during autonomous dogfood of the pm-tasks adapters:

1. **Start not recorded.** When the agent starts a task it moves it to the WIP list/section/status but never stamps a **start date**, even on tools that support one.
2. **Close loses reality.** `dueDate` is set at creation from the effort/duration estimate and is never revisited. When the agent finishes early (or late), the task still shows the original estimate — the board does not reflect what actually happened.
3. **Create is under-specified in the typed contract (#47).** Core `TaskCreateRequest` carries only `name` + `description`; labels/priority/estimate/dueDate reach a task only via SKILL-level publish orchestration or follow-up verbs, not the typed transport contract (Linear's `taskCreate` sent only `team/title/description`).

These are three points on one axis: **fidelity of the task's live state to reality across its lifecycle.**

## Principle: Lifecycle Fidelity

Across **create → start → close**, the task's live/primary fields reflect what is true, and the **plan ↔ actual** gap is preserved wherever the tool allows.

- **Create** — set the planned fields the tool supports (labels, priority, estimate, dueDate).
- **Start** (move → WIP) — stamp a start date where the tool supports one.
- **Close** — reflect the **actual** completion in the primary field; preserve the **plan** for a planned-vs-actual comparison.

The close rule, resolved with the user:

> Reflect the real completion in the live field; keep the plan. On tools that separate plan and actual **natively** (Asana `completed_at`, Jira `resolutiondate`, Linear `completedAt`), this is **free** — `dueDate` stays = plan and the auto timestamp is the actual, so do **not** overwrite `dueDate`. Only on a tool with **no** auto completion timestamp (Trello) does the agent actively overwrite `due` = actual and stash the plan elsewhere.

**This is a particularity, not a rule.** The agent interprets it per tool context and may exploit tool-specific affordances (e.g. a Trello Premium custom field) to improve cohesion. It is documented guidance, not enforced transport behavior — except the create moment, which is deterministic (see §Mechanisms).

## Non-goals

- No new mandatory CRUD verb for start/close temporal handling. It is interpretive guidance + minimal config, not a typed always-on behavior.
- No `timeSpent`/worklog logging verb (Jira) in this program — noted as future.
- No Trello Premium custom-field **config** in the first Trello release — the plan lands in a description footer; premium is opportunistic/documented, config knob deferred.

## Two mechanisms, by moment

The coherence of the theme rests on using the right mechanism per moment:

| Moment            | Mechanism                                                                                                       | Why                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Create**        | **Typed** — extend core `TaskCreateRequest` (issue #47, Option A). Adapters map the subset their tool supports. | The values are known at create time; setting them is deterministic — a rule, appropriately.                                      |
| **Start / Close** | **Interpretive guidance** (docs + minimal config). No new verb.                                                 | Which field, whether to overwrite, which tool affordance to exploit — that is judgment the transport (context-free) cannot make. |

### Core `TaskCreateRequest` extension (create moment, #47 Option A)

Add optional fields to the core create contract; every field is optional and additive:

```
TaskCreateRequest {
  name: string
  description?: string
  labels?: string[]        // adapter maps to its label/tag model
  priority?: string        // adapter maps to its priority model (may be NOT_APPLICABLE)
  estimate?: EstimateInput  // reuse core/estimation NormalizedEstimate input
  dueDate?: string         // ISO 8601 date
}
```

Adapters map what their tool supports at create and ignore the rest (documented per adapter). This makes the typed transport path consistent with the SKILL-orchestrated path, which already sets these via the generic card.

## Per-adapter interpretation

| Adapter    | Create (typed)                                                                                                 | Start (move→WIP)                                                                                                                                   | Close (real / plan)                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asana**  | labels→`custom_fields` (option GIDs), dueDate→`due_on`, estimate→number custom field (with `unit`, per v1.8.0) | `update_tasks` `start_on` = today — **must re-send the current `due_on` in the same call** (MCP requires `due_on` present when setting `start_on`) | `completed:true` → `completed_at` auto = real; `due_on` stays = plan. **De-para native; no overwrite.**                                                                                                                   |
| **Trello** | labels→`idLabels`, dueDate→`due` (at `create_card`)                                                            | `update_card` `start` = today (native field, currently unused by the adapter)                                                                      | **Overwrite** `due` = actual completion date + `dueComplete:true` (+ move to Done). Preserve plan (original due + estimate) in a **description footer**. Premium custom field = opportunistic, documented, no config yet. |
| **Jira**   | labels, dueDate→`duedate`, estimate→`timetracking.originalEstimate`                                            | no wired start field; a custom "start date" field is possible — **documented as optional**, not implemented in this program                        | transition → done → `resolutiondate` auto = real; `duedate` stays = plan. **Native; no overwrite.**                                                                                                                       |
| **Linear** | labels/priority/estimate/dueDate in the single `save_issue`                                                    | `startedAt` **already** auto-stamped by the existing `task.move` → `"started"` state                                                               | `completedAt` auto = real via existing `task.close`; `dueDate` stays = plan. **Native; zero new work.**                                                                                                                   |

### Trello description footer (plan preservation)

When Trello close overwrites `due` with the actual date, append/maintain a single-line footer block at the end of the description, e.g.:

```
— Planejado: due 2026-07-20 · est 8h —
```

- One footer only; on re-close it is replaced, not duplicated.
- Localized to the config `locale` (pt-BR / en-US / es-ES).
- If a Trello Premium custom field for "Planned due"/"Estimate" is later configured, the agent may use it instead of / in addition to the footer (future increment).

## Config knobs (minimal)

- **Asana**: none new — `start_on` / `due_on` / `completed_at` are native MCP fields. The v1.8.0 `customFields[].unit` already covers estimate-as-minutes.
- **Trello**: none new in this program — footer is derived, not configured. (Premium `customFields` config deferred.)
- **Core**: a new reference doc `references/lifecycle-fidelity.md` stating the principle + the three moments + the per-tool interpretation table, consumed by every adapter SKILL.

## Decomposition into releases

The spec is holistic; implementation ships as independent releases (one PR = one changeset = one release). Order is prerequisite-driven.

- **R1 — core (`v1.14.0`, this branch):** extend `TaskCreateRequest` with the optional create-time fields (#47 Option A) + add `references/lifecycle-fidelity.md`. Prerequisite for adapters' typed create-time mapping. **← this spec's immediate implementation plan targets R1.**
- **R2 — Asana:** map create-time fields via the extended contract + `start_on` on move (with the due_on-present gotcha) + document the native-timestamp close (no overwrite). SKILL/operations "Temporal handling" section.
- **R3 — Trello:** map create-time fields + `start` on move + close overwrite `due`=real + description-footer plan preservation. SKILL/operations section.
- **R4 — Jira + Linear:** create-time mapping + temporal documentation (mostly native/auto; Linear already free, Jira `resolutiondate` native + optional start-field note).

Each of R2–R4 gets its own spec-lite/plan → implementation cycle after R1 lands.

## Verification (program-wide)

- `make validate` green per release; `make preflight` (with the skill-judge baseline ratcheted, since SKILL.md files change in R2–R4).
- R1: core unit tests for the extended `TaskCreateRequest` (optional fields accepted, absent by default, no behavior change when omitted). Typecheck across all adapters (they must still compile against the widened contract).
- Live dogfood remains the promotion gate for each adapter release (per project convention).

## Open questions

None blocking R1. Deferred by decision: Trello Premium custom-field config (R3+ increment); Jira `timeSpent`/worklog logging (future); Jira custom start-date field (documented-only).
