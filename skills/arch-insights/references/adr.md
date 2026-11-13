# Architecture Decision Records

**MANDATORY: READ ENTIRE FILE** before writing any ADR.

An ADR records one decision, the context that forced it, and the consequences the team accepted. Its job is to let a future engineer understand why the system looks the way it does, and to know when the decision should be reopened.

## When to write one

Write an ADR when the decision is:

- Hard or expensive to reverse: data model boundaries, tenancy, public contracts, the database engine, the hosting platform.
- Visible to more than one team or module.
- Chosen over alternatives that a reasonable engineer would consider.
- Setting a constraint that future work must respect: a security rule, a latency budget, a compliance requirement.

Do not write an ADR for a choice that a linter or a single file can change. Keep the count small enough that people will read them.

## Format

Use this structure. Keep the whole ADR to one or two pages.

```markdown
# ADR-NNNN: <short decision title, in the active voice>

- **Status**: Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
- **Date**: YYYY-MM-DD
- **Deciders**: <roles or names>

## Context

The forces at play: requirements, constraints, team, stage, and the assumptions made.
Name the numbers you have and the numbers you assumed.

## Decision

"We will ..." One clear statement, followed by the details a builder needs.

## Alternatives considered

- **<Option>**: why it was not chosen. Name the requirement it failed.

## Consequences

**Positive**

- ...

**Negative (accepted)**

- ...

## Failure modes and mitigations

| Failure | Detection | Mitigation |
| ------- | --------- | ---------- |

## Observability plan

What is measured and alerted for this decision.

## Revisit triggers

Measurable conditions that would reopen this decision. For example: "p95 latency of the booking endpoint stays above 800 ms for two weeks, even with caching."
```

## Rules

- One decision per ADR. If the title needs "and", split it.
- Write the context before the decision. A decision without context reads as arbitrary.
- Do not edit an accepted ADR to change its decision. Write a new ADR that supersedes it, and link the two in both directions. Fixing typos is fine.
- Store ADRs in the repository, for example as `docs/adr/NNNN-short-title.md`, so that they are reviewed and versioned like code.
- Number them sequentially from `0001`. Keep the titles stable.
- Consequences must include the negatives. An ADR with no accepted cost was not written honestly.
