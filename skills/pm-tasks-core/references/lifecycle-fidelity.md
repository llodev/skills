# Lifecycle Fidelity

A cross-adapter principle for the pm-tasks family. Across a task's life —
**create → start → close** — the task's live/primary fields reflect what is
true, and the **plan ↔ actual** gap is preserved wherever the tool allows.

This is **interpretive guidance, not a rule** (except the create moment, which
is deterministic). Each adapter's SKILL applies it per its tool's affordances;
the agent may exploit tool-specific features (e.g. a Trello Premium custom
field) to improve cohesion.

## The three moments

- **Create** — set the planned fields the tool supports (labels, priority,
  estimate, dueDate). Deterministic: the values are known, so this is carried
  by the typed `TaskCreateRequest` (`labels?`, `priority?`, `estimate?`,
  `dueDate?`); each adapter maps the subset its tool supports.
- **Start** (move → WIP) — stamp a start date where the tool supports one.
- **Close** — reflect the **actual** completion in the primary field; preserve
  the **plan** for a planned-vs-actual comparison.

## The close rule (plan vs actual)

Reflect the real completion in the live field; keep the plan.

- On tools that separate plan and actual **natively** — Asana `completed_at`,
  Jira `resolutiondate`, Linear `completedAt` — this is **free**: `dueDate`
  stays = plan, the auto timestamp is the actual, so do **not** overwrite the
  due date.
- On a tool with **no** auto completion timestamp — Trello — the agent
  actively overwrites `due` = actual completion date (+ `dueComplete`) and
  stashes the plan (original due + estimate) elsewhere (a description footer;
  a Premium custom field when available).

## Per-adapter interpretation

| Adapter    | Start (move→WIP)                                                                       | Close (real / plan)                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Asana**  | `start_on` = today (must re-send the current `due_on` in the same `update_tasks` call) | `completed_at` auto = real; `due_on` stays = plan (native, no overwrite)                            |
| **Trello** | `start` = today (native field)                                                         | overwrite `due` = actual + `dueComplete`; plan → description footer (Premium custom field optional) |
| **Jira**   | no wired start field (custom field optional, documented)                               | `resolutiondate` auto = real; `duedate` stays = plan (native, no overwrite)                         |
| **Linear** | `startedAt` auto from the existing `task.move` → `"started"` state                     | `completedAt` auto = real from the existing `task.close`; `dueDate` stays = plan                    |

Rollout: create-time carried by the core contract (this doc's create moment);
start/close applied per adapter in that adapter's SKILL. See the umbrella
design in `docs/superpowers/specs/2026-07-14-lifecycle-fidelity-design.md`.
