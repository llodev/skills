# ADR-0001: Start with a modular monolith on PostgreSQL

> Example output of the skill. The product, the clinic, and the numbers are fictional.

- **Status**: Accepted
- **Date**: 2026-11-13
- **Deciders**: Two developers and the product owner

## Context

We are building a scheduling SaaS for independent physiotherapy clinics. Each clinic is a tenant.

- **Stage:** MVP. Two pilot clinics in ten weeks, then about thirty clinics in six months. _Assumption:_ roughly 2,000 appointments per day at the end of year one. To validate with the pilot clinics.
- **Team:** two developers, one stronger in Node and one in React. Nobody owns a platform or is on call.
- **Domain:** three areas. Scheduling (core), Patients (core, with health-related records), and Notifications (supporting: reminders).
- **Constraints:** LGPD applies to all personal data, and health data is sensitive personal data under it (art. 5, II, and art. 11), so access control and retention are stricter. The infrastructure budget is fixed. The boundaries are known, but their use patterns are not yet proven.

## Decision

We will build the first version as **one deployable application**, organized into three modules: Scheduling, Patients, and Notifications.

- Each module has a public interface, and owns its tables in one PostgreSQL database.
- Tenancy uses a shared schema with a `tenant_id` on every row, enforced by PostgreSQL row-level security.
- Reminders run as jobs in a Postgres-backed queue, enqueued in the same transaction as the booking that triggers them.
- Cross-module side effects use in-process events with versioned payloads, so that a module can later move to a separate service without a change of design.
- Architecture tests in CI fail the build when a module reads another module's tables.

## Alternatives considered

- **One service per module.** Rejected. Two developers cannot run three deployables, a broker, and their observability in the ten weeks before the pilot. The boundaries are not yet proven by use.
- **A schema per tenant.** Rejected for now. Migrations would run once per tenant, and the pilot cohort is small enough for a shared schema with row-level security.
- **Serverless functions per use case.** Rejected. The booking flow is stateful and transactional across modules, and one database transaction is the simplest way to protect the no-double-booking rule.

## Consequences

**Positive**

- One deploy, one log stream, and one trace per request. Debugging stays fast for two developers.
- The no-double-booking rule is enforced by one transaction and a unique constraint on `(practitioner_id, slot_start)`.
- Notifications can later move to its own service, because its events are already versioned.

**Negative (accepted)**

- All modules share one release cadence.
- A heavy report can compete with booking traffic on the same database. We add a read replica when measurement shows it is needed.
- Module boundaries depend on discipline and CI checks. The platform does not enforce them.

## Failure modes and mitigations

| Failure                          | Detection                                                | Mitigation                                                                                                        |
| -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Database unavailable             | Readiness check fails; error rate alert                  | The app returns 503 and does not accept bookings. Restore from backup is tested before the pilot                  |
| Tenant data leak                 | Integration tests that run the same query as two tenants | Row-level security policies, plus the tests in CI                                                                 |
| Double booking under concurrency | Unique constraint violation rate                         | Unique constraint and a transaction around the booking write                                                      |
| Failed migration during deploy   | Migration step fails in the pipeline                     | Expand-and-contract migrations; the new version receives traffic only after the migration step succeeds           |
| Reminder provider down           | Queue depth and job failure rate                         | Retries with backoff; after the maximum attempts the job goes to the dead-letter table and an operator is alerted |

## Observability plan

- RED metrics per endpoint, and a trace through the database calls.
- Queue lag and failure count for the reminder jobs.
- A tenant identifier on every log line, with personal data redacted.
- Alert when the booking error rate exceeds 1% for ten minutes.

## Revisit triggers

Split a module out only when at least two of the split triggers in [`architecture-style.md`](../references/architecture-style.md) hold, and at least one of them is measured. For this decision, watch these:

- Two or more teams block each other's deploys for four weeks in a row.
- Reminder queue lag stays above five minutes at peak for two weeks, even after adding workers.
- Primary database CPU stays above 70% at peak for two weeks, after a read replica and caching are in place.
