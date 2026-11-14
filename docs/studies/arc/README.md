# arc family — design study

Status: sketch, 2026-11-13. Not a skill, and not a plan. It decides structure, responsibilities, and seams for the five planned `arc-*` members before any of them is started.

## Family goal

Give a team staff-level architecture judgment as knowledge-only skills: no MCP, no init, no runtime.
Each member owns one concern, with its own trigger and workflow, and injects defaults, exceptions, and anti-patterns rather than textbook content.
`arc-decisions` takes an idea to a brief; the other members go deep on one part of that brief, or on a system that already exists.

## Members

| Skill               | One-line scope                                                                                           | Study                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `arc-decisions`     | Idea to brief: scope, boundaries, style, data, integration, reliability, stack, delivery, ADRs (shipped) | `skills/arc-decisions/`                      |
| `arc-migration`     | Move an existing system to a target shape: slices, strangler, expand-contract, cutover and rollback      | [arc-migration.md](arc-migration.md)         |
| `arc-api-contract`  | Design-first API contract: resources, conventions, errors, idempotency, versioning, OpenAPI skeleton     | [arc-api-contract.md](arc-api-contract.md)   |
| `arc-ai-system`     | AI layer in depth: autonomy level, agent boundary, tool catalog, RAG, gateway, guardrails, evals         | [arc-ai-system.md](arc-ai-system.md)         |
| `arc-threat-model`  | Design-time threat model: trust boundaries, STRIDE, personal-data register under LGPD and GDPR, controls | [arc-threat-model.md](arc-threat-model.md)   |
| `arc-observability` | Telemetry plan from journeys: SLIs, SLOs, burn-rate alerts, log schema, trace design, telemetry cost     | [arc-observability.md](arc-observability.md) |

How they connect: `arc-decisions` produces the brief (contexts, journeys, data, decisions). Each member reads the brief, or asks for the missing part, and returns its artifact plus decisions in the ADR format that `arc-decisions` owns. `arc-threat-model` and `arc-observability` also consume the outputs of `arc-api-contract` and `arc-ai-system`.

## Overlap map

What each member does NOT cover, and who owns it.

| Member              | Does not cover                                   | Owner                                                |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `arc-migration`     | Choosing the target architecture, split triggers | `arc-decisions`                                      |
|                     | Migration files, lock-safe DDL                   | `database-schema-designer`, `django-schema-design`   |
|                     | Single-release checklist                         | `engineering:deploy-checklist`                       |
|                     | Breaking a public contract                       | `arc-api-contract` (deprecation policy)              |
| `arc-api-contract`  | Sync versus async between contexts               | `arc-decisions`                                      |
|                     | Controller and DTO code; `.http` suites          | `ts-ddd-controller`, `ts-ddd-dto`; `tests-http`      |
|                     | Post-build docs for the front end                | `backend-to-frontend-handoff-docs`                   |
|                     | Which security controls are required             | `arc-threat-model`                                   |
| `arc-ai-system`     | Whether AI is in scope; the short default        | `arc-decisions` (`ai-native-systems.md` § Defaults)  |
|                     | SDK code, model ids, prices                      | `claude-api` (or the provider's docs)                |
|                     | Whole-system threat model                        | `arc-threat-model`                                   |
|                     | SLOs and alerts on AI signals                    | `arc-observability`                                  |
| `arc-threat-model`  | Code-level review, SAST                          | `security-review`                                    |
|                     | Tenancy model, data residency decisions          | `arc-decisions`                                      |
|                     | AI-specific controls                             | `arc-ai-system`                                      |
|                     | Breach handling at runtime                       | `engineering:incident-response`                      |
| `arc-observability` | Timeouts, retries, breakers, day-one baseline    | `arc-decisions` (`reliability-and-observability.md`) |
|                     | Runbooks, on-call                                | `engineering:incident-response`                      |
|                     | Business dashboards                              | `bi-dashboard`                                       |

Generic overlap: `engineering:architecture` and `engineering:system-design` are broad, unopinionated entry points. Each `arc-*` member must win on trigger specificity and on decisions with defaults and exceptions, not on coverage. `engineering:documentation` writes prose; no `arc-*` member writes user docs. `init-monorepo` scaffolds code; no `arc-*` member generates files beyond Markdown artifacts.

### Sections of `arc-decisions` that each member deepens

These are the duplication risks the family rule forbids. Proposed treatment: `arc-decisions` keeps the default and the "whether", and drops the "how" to one line naming the member.

| `arc-decisions` reference § section                                  | Member              | Proposed treatment in `arc-decisions`        |
| -------------------------------------------------------------------- | ------------------- | -------------------------------------------- |
| `architecture-style.md` § How to extract a module                    | `arc-migration`     | Keep 3-line summary, name the member         |
| `data-and-consistency.md` § Migrations                               | `arc-migration`     | Keep "backward-compatible only" rule         |
| `integration-and-async.md` § Event contracts                         | `arc-api-contract`? | Open question 3                              |
| `ai-native-systems.md` § RAG, Untrusted content, Gateway, Evaluation | `arc-ai-system`     | Keep § Separate the core and § Defaults only |
| `reliability-and-observability.md` § Service level objectives        | `arc-observability` | Keep "name SLOs per critical journey"        |

## Suggested build order

1. **`arc-api-contract`** — most self-contained, smallest overlap with `arc-decisions`, stable facts (RFCs), and its outputs feed two later members.
2. **`arc-migration`** — high priority, and building it forces the first trim of `arc-decisions` (§ How to extract a module, § Migrations), which tests the overlap policy on a small surface.
3. **`arc-threat-model`** — low overlap with `arc-decisions`, consumes the contract's scopes; the privacy reference needs the longest verification, so it should start before the last two.
4. **`arc-observability`** — narrowest delta over `arc-decisions`; ship it only after confirming it earns a member (open question 5).
5. **`arc-ai-system`** — deepest overlap with `ai-native-systems.md` and the fastest-aging facts; last, so the other seams (threat model, observability) exist to point at.

## Open questions for the maintainer

1. **Overlap policy.** When a member ships, does the matching `arc-decisions` section shrink to the default plus a one-line pointer (a release of `arc-decisions` each time), or stay as is while the member goes deeper? Recommendation: shrink. Leaving both breaks the "no duplicated reference" rule.
2. **ADR and brief ownership.** Members emit decisions, but copying `adr.md` is duplication. Options: members name `arc-decisions` as the ADR owner and inline only the five-part rule (decision, constraint, trade-off, alternatives, revisit trigger), or the `@llodev/arc` meta-package guarantees `arc-decisions` is installed. Which?
3. **Event and message contracts.** Do they move to `arc-api-contract` (HTTP and async contracts in one place), or stay in `arc-decisions` § Event contracts with `arc-api-contract` HTTP-only?
4. **AI security seam.** Prompt injection and tool-permission threats: owned by `arc-ai-system` (controls) with `arc-threat-model` only citing them, or catalogued in `arc-threat-model` as a STRIDE extension?
5. **Does `arc-observability` earn a member?** It has its own trigger and workflow, but its delta over `arc-decisions` is the smallest. Alternative: a deeper reference inside `arc-decisions`.
6. **Training and fine-tuning.** In `arc-ai-system` scope, or explicitly out until there is demand?
