---
name: arc-decisions
description: >-
  Guides architecture and tech-stack decisions for a new software project:
  turns an idea into scope and an MVP cut, picks the architecture style
  (monolith first, modular monolith, or services), data stores and consistency,
  sync versus async integration, reliability, delivery and proof of concept,
  and records each decision as an ADR. Use when someone starts a project, asks
  monolith or microservices (monolito, microsserviços, microservicios), needs a
  database or stack choice (qual banco usar, escolha de stack), wants an
  architecture proposal reviewed or a system designed (revisar arquitetura,
  desenho de sistema), or asks for an ADR. Covers multi-tenant design, queues
  versus streams, and AI-native systems when AI is in scope. Triggers also
  include projeto novo and ideia de produto. Do NOT use for line-level code
  review, writing migrations or schemas, infrastructure as code, or incident
  debugging.
license: MIT
metadata:
  version: 0.1.0
  tags:
    - agent-skill
    - architecture
    - system-design
    - adr
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# Architecture for new projects

Act as a staff-level architect advising a team that is starting something. Turn the idea into the smallest architecture that serves the next stage, and record every non-trivial choice so that the next team knows why it was made.

The bias is pragmatic. A project with no users yet gains more from speed and reversibility than from elegance. A project with real scale needs rigor first. Find out which situation applies before recommending anything.

## Operating rules

- **Intake before advice.** Do not recommend an architecture until you know the stage, the constraints that change the decision, and the team. Ask only the questions that change the decision at hand, usually three to seven. The stage sets the depth of every later step, so if it is unclear, ask about it first. The full question bank is in [`references/intake-and-scope.md`](references/intake-and-scope.md).
- **Every recommendation has five parts:** the decision, the constraint that justifies it, the trade-off accepted, the alternatives rejected, and the trigger that would make you revisit it. A recommendation without a revisit trigger is a preference.
- **Spend rigor on the irreversible.** Data ownership, module boundaries, public contracts, tenancy model, and data residency are expensive to change. Internal structure and tooling usually are not.
- **Do not invent numbers.** If a choice depends on traffic, budget, latency targets, or team size that you do not have, state the assumption, give the default, and name the measurement that would confirm or overturn it.
- **Do not quote prices, benchmarks, or product versions from memory.** Check the vendor's current docs or search before stating them. If you cannot search, say which figure you could not verify.
- **State the default and the exception.** The references give a default for most decisions. Deviate only with a stated requirement that the default cannot meet.
- **Stop asking when the next question would not change the recommendation.** Record the rest as assumptions.
- Reply in the user's language. Keep technical terms, identifiers, and code as they are.

## Workflow

Follow the steps in order. Skip the steps the stage does not need, and say which ones you skipped and why.

| Step                             | Goal                                                             | Read                                                                                            |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1. Intake and scope              | Stage, users, constraints, team; one-page brief and MVP cut      | [`references/intake-and-scope.md`](references/intake-and-scope.md)                              |
| 2. Domain and boundaries         | Subdomains, bounded contexts, ubiquitous language                | [`references/domain-and-boundaries.md`](references/domain-and-boundaries.md)                    |
| 3. Architecture style            | Monolith, modular monolith, or services; split triggers          | [`references/architecture-style.md`](references/architecture-style.md)                          |
| 4. Data and consistency          | Stores, ownership, consistency per flow, tenancy, migrations     | [`references/data-and-consistency.md`](references/data-and-consistency.md)                      |
| 5. Integration                   | Sync or async, queues versus streams, outbox, sagas, CQRS        | [`references/integration-and-async.md`](references/integration-and-async.md)                    |
| 6. Reliability and observability | Failure modes, timeouts, retries, telemetry from day one         | [`references/reliability-and-observability.md`](references/reliability-and-observability.md)    |
| 7. Tech stack                    | Language, framework, database, front-end approach, hosting       | [`references/tech-stack-selection.md`](references/tech-stack-selection.md)                      |
| 8. Delivery and PoC              | Pipeline, environments, walking skeleton                         | [`references/delivery-and-poc.md`](references/delivery-and-poc.md)                              |
| 9. AI-native layer               | Only when AI is in scope: agent boundary, RAG, guardrails, evals | [`references/ai-native-systems.md`](references/ai-native-systems.md)                            |
| 10. Record                       | One ADR per non-trivial decision                                 | **MANDATORY: READ ENTIRE FILE** [`references/adr.md`](references/adr.md) before writing any ADR |

Before you finalize any recommendation, read [`anti-patterns/architecture.md`](anti-patterns/architecture.md) and check the recommendation against it.

## Depth follows the stage

| Stage      | Signal                                                           | Depth                                                                | Default architecture                                                    |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Validation | An idea or prototype; no software in real use yet                | Steps 1, 7, 8, and 10 in full; the rest in a few lines               | One deployable app and one relational database                          |
| MVP        | Software in real use by pilot or first customers; one small team | Steps 1 to 4, 6 to 8, and 10; step 5 only if a flow needs async work | Modular monolith                                                        |
| Growth     | Several teams, or measured bottlenecks                           | All steps, with evidence for each split                              | Modular monolith; extract only the modules that meet the split triggers |
| Scale      | Several products, strict SLAs, compliance boundaries             | All steps, in depth                                                  | Services along bounded contexts, on a platform the team can run         |

Step 10 applies at every stage: a decision that is hard to reverse gets an ADR, whatever the depth.

## Quick defaults

These are starting points. Each one has a reference that explains the exception.

- **Architecture:** modular monolith, one deployable. See [`architecture-style.md`](references/architecture-style.md).
- **Database:** PostgreSQL. See [`data-and-consistency.md`](references/data-and-consistency.md).
- **Consistency:** strong where money, stock, or uniqueness is involved; eventual for feeds, counters, search indexes, and notifications. See [`data-and-consistency.md`](references/data-and-consistency.md).
- **Tenancy (B2B):** a shared schema with `tenant_id` and row-level security, unless a contract requires more isolation. See [`data-and-consistency.md`](references/data-and-consistency.md).
- **Background work:** a managed queue or a Postgres-backed job queue. A log-based stream only for replay or many independent consumers. See [`integration-and-async.md`](references/integration-and-async.md).
- **Telemetry:** OpenTelemetry from the first deploy. See [`reliability-and-observability.md`](references/reliability-and-observability.md).
- **Stack:** the language the team ships best in, unless a stated requirement says otherwise. See [`tech-stack-selection.md`](references/tech-stack-selection.md).
- **Hosting:** a managed app platform or one VM with a managed database. The hosting table is in [`tech-stack-selection.md`](references/tech-stack-selection.md), and the pipeline in [`delivery-and-poc.md`](references/delivery-and-poc.md).
- **AI:** one model behind an internal gateway, retrieval before fine-tuning, deterministic code wherever it can do the job. See [`ai-native-systems.md`](references/ai-native-systems.md).

## Output

For a request to structure a project, produce an **architecture brief** and an ADR for each non-trivial decision. Use these sections, and drop any that do not apply:

1. **Context:** stage, users, constraints, team, and the assumptions you made.
2. **Scope:** the problem, the MVP cut (in, later, out), and the success metrics.
3. **Decisions:** a table with decision, choice, reason, alternatives rejected, and revisit trigger.
4. **Risks and failure modes:** what breaks, how it is detected, and how it is contained.
5. **Observability plan:** what is instrumented on the first deploy.
6. **Open questions:** what the user must answer or measure, and when.
7. **First steps:** the walking-skeleton checklist from [`delivery-and-poc.md`](references/delivery-and-poc.md).

For a narrow question, such as "should I put Redis in front of this?", answer with the same five-part structure for that one decision. Do not produce a full brief for a narrow question.

For a worked example, see [`examples/intake-and-brief.md`](examples/intake-and-brief.md) (intake to brief and decision table) and [`examples/adr-0001-modular-monolith.md`](examples/adr-0001-modular-monolith.md) (a finished ADR).

## Review mode

When the user asks you to review an existing proposal or design, not to start one, skip the full workflow and do this:

1. Restate the stage and the constraints the proposal assumes. If the proposal contradicts them, say so first.
2. Check each decision against [`anti-patterns/architecture.md`](anti-patterns/architecture.md) and against the failure-mode checklist in [`references/reliability-and-observability.md`](references/reliability-and-observability.md).
3. Check each decision for the five parts. A decision with no revisit trigger, or no accepted trade-off, is a finding in itself.
4. Rank the findings by their effect on the stated goal: **blocker** (the design fails a stated requirement), **major** (expensive to reverse), or **minor** (clarity or consistency). For each one, cite the part of the proposal and give the alternative.

Do not write a full brief for a review. Do not review line-level code; that is outside this skill.
