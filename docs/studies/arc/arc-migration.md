# arc-migration — design study

Status: sketch, 2026-11-13. Not a skill. Decides structure and seams only.

## 1. Responsibility

Plans how an existing system moves from its current shape to a target shape without a big-bang release. It picks a migration pattern per slice, sequences the slices, moves data ownership, and writes the cutover, verification, rollback, and decommission steps.

Produces a migration plan: slices, pattern per slice, data steps, gates, and the point of no return for each slice.

Non-goals (refuses):

- Choosing the target architecture. That is `arc-decisions`. With no target, it asks for one or records the target as an explicit assumption.
- Writing migration files, DDL, or lock-safe SQL (`database-schema-designer`, `django-schema-design`).
- Framework or language version upgrades (`dependency-updater`). Scope is architectural change, not version bumps.
- A single-release deploy checklist (`engineering:deploy-checklist`). This skill sequences many releases.
- Migrating with no stated pain. "Modernize" without a measured problem is sent back to `arc-decisions` intake.

## 2. Triggers

1. "We have a Rails monolith. Plan how to pull billing out into its own service without downtime."
2. "How do I split this column in a 400M-row table while the app stays live?"
3. "Our modules all share tables. Plan the path to a modular monolith."
4. "Write the cutover and rollback plan for moving orders from the legacy database to the new one."
5. "Rewrite or strangle? Eight-year-old PHP app, two developers." (also: "migrar sistema legado")

## 3. Core concepts

- **Seam:** a place where behavior can be redirected without editing callers. No seam, no strangler; create one first (branch by abstraction).
- **Strangler fig:** route one capability at a time at the edge (proxy or facade) until the legacy path has no traffic. Slice by business capability, never by technical layer.
- **Expand-contract (parallel change):** an incompatible change becomes expand, migrate, switch reads, contract. Contract ships in a later release than expand.
- **Writer of record:** exactly one component writes an entity at any moment. Ownership transfer is a named step with a gate, not a side effect.
- **Parallel run (shadow):** the new path runs on real input, its result is compared and discarded, until the diff rate is acceptable.
- **Point of no return:** the first step whose rollback needs data repair rather than a redeploy or flag flip. Every slice names it, and a go/no-go gate sits before it.
- **Rollback class:** redeploy, flag flip, reverse data migration, or forward fix only. Each step carries one.
- **Anti-corruption layer:** a translator that stops the legacy model from leaking into the new one.

## 4. Workflow

| #   | Input                                | Action                                                                                                                               | Output                                 |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 1   | System description, code map, pain   | Map capabilities, shared tables, and callers; mark coupling hotspots                                                                 | Current-state map, coupling matrix     |
| 2   | `arc-decisions` brief or user target | Confirm the target and the measured reason to migrate; refuse if there is none                                                       | Target statement and success metric    |
| 3   | Coupling matrix                      | Cut slices by capability; rank by risk and learning; first slice is low-risk and high-learning                                       | Slice backlog                          |
| 4   | Each slice                           | Choose the pattern: edge-routable → strangler; in-process → branch by abstraction; schema → expand-contract; behavior → parallel run | Pattern per slice                      |
| 5   | Slices that touch data               | Plan ownership transfer, sync (CDC or outbox, never naive dual write), backfill, and verification (counts, checksums, sampled diffs) | Data plan per slice                    |
| 6   | Data plan                            | Stage dark → shadow → canary → full; set gates, the point of no return, and rollback per stage                                       | Cutover runbook                        |
| 7   | Cut-over slice                       | Delete the old path, contract the schema, remove flags and the ACL when no longer needed                                             | Decommission checklist                 |
| 8   | Every non-trivial choice             | Record as a decision with a revisit trigger                                                                                          | ADRs (format owned by `arc-decisions`) |

## 5. Actions and artifacts

- **Coupling matrix:** capability × table, marked read or write. Shows which slices cannot move first.
- **Slice backlog:** slice, pattern, risk, dependency, owner.
- **Expand-contract step table:** step, release, reversible?, verification, rollback class.
- **Cutover runbook:** stages, entry and exit gates, metrics watched, point of no return, rollback per stage.
- **Decommission checklist:** what is deleted, and the evidence that nothing still calls it.

## 6. Expert judgments to inject

- **Strangle, do not rewrite.** Exception: the system is small enough to rewrite in one short cycle (heuristic: weeks, not quarters) and its behavior is pinned by tests, or the platform is at end of life.
- **Modules before services.** Enforce boundaries in-process first; extract a service only for slices that meet the `arc-decisions` split triggers. Exception: a hard isolation or compliance requirement on that slice.
- **No naive dual write.** Sync through an outbox or CDC with one writer of record. Exception: a short dual-write window with a reconciliation job, recorded as an accepted risk.
- **Contract waits for evidence.** Heuristic: zero reads of the old shape across one full business cycle (for example month-end) before dropping it.
- **Shadow before canary on read paths.** Heuristic canary ladder: 1% → 10% → 50% → 100%, each hold long enough to cover the slowest batch job.
- **No step with rollback class "forward fix only" without a named gate and an owner who accepts it.**

## 7. Anti-patterns to watch

- Big-bang cutover weekend.
- An extracted service that still reads the monolith's tables (distributed monolith).
- Slicing by technical layer ("move the data layer first").
- Two systems forever: no decommission step, so the legacy path never dies.
- Backfill with no verification, discovered wrong after contract.

## 8. Reference candidates

- `strangler-and-seams.md` — seam types, edge routing, branch by abstraction, slice ranking.
- `expand-contract.md` — step tables for rename, split, type change, and table move.
- `data-ownership-and-sync.md` — writer transfer, CDC versus outbox for migration, backfill, verification.
- `cutover-and-rollback.md` — staged rollout, gates, rollback classes, point of no return.
- `monolith-to-modules.md` — untangling shared tables, internal APIs, boundary enforcement in-process.
- `anti-patterns/migration.md` — the list above with symptoms and fixes.

## 9. Boundary

- **arc-decisions:** owns the target and the split triggers (`architecture-style.md` § Split triggers). Its § How to extract a module and `data-and-consistency.md` § Migrations overlap this skill directly; they should shrink to the default rule plus a pointer once this ships (README, open question 1).
- **database-schema-designer, django-schema-design:** write the migration files; this skill decides the release sequence they fit into.
- **engineering:deploy-checklist:** used for each release inside a cutover stage.
- **engineering:incident-response:** takes over when a rollback fails in production.
- **arc-api-contract:** a slice that breaks a public contract follows its deprecation policy.
- **arc-observability:** supplies cutover metrics (shadow diff rate, error budget during canary).
- **ts-ddd-\*:** implement the anti-corruption layer in code.

## 10. Structure guess

SKILL.md plus 5 references and 1 anti-patterns file. Four patterns each carry their own decision tree and step table, too long for SKILL.md; the workflow and defaults fit in it.
