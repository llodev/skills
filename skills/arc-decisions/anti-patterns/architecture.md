# Architecture anti-patterns

Check every recommendation against this list before you finalize it. Each entry gives the symptom, why it hurts, and the alternative.

## 1. Services carved from database tables

**Symptom:** "UserService", "OrderService", and "ProductService" each read and write a single table, and one feature touches all three.

**Why it hurts:** the boundaries follow storage, not business rules. Every change crosses services, so the system has the costs of a distributed system and none of its benefits.

**Instead:** find the rules that change together ([`domain-and-boundaries.md`](../references/domain-and-boundaries.md)). Start with one module per context.

## 2. Distributed monolith

**Symptom:** services share a database, must be deployed together, or call each other in long synchronous chains.

**Why it hurts:** you pay for network failures, versioning, and tracing, and you get no independence in return.

**Instead:** merge the services back into a modular monolith ([`architecture-style.md`](../references/architecture-style.md)), or fix the boundary: one owner per table, and asynchronous integration for reactions that need not block the user.

## 3. Shared database across contexts

**Symptom:** two contexts read or write the same tables "because it is faster".

**Why it hurts:** schema changes become negotiations between teams, and invariants leak across the boundary.

**Instead:** owned tables. Cross-context reads go through an interface, an event, or a read model.

## 4. Resume-driven design and novelty without a requirement

**Symptom:** the justification is "modern companies use it", or a technology was chosen before the requirement was written. Or a new framework, language, or database is picked with no team skill behind it and no requirement it solves.

**Why it hurts:** the team pays the cost every day, in slower delivery, scarce hiring, and an operations surface nobody knows how to run. The benefit stays hypothetical.

**Instead:** write the requirement first. Then choose the smallest tool that meets it, scored against the team's capability ([`tech-stack-selection.md`](../references/tech-stack-selection.md)).

## 5. Scaling for demand that does not exist

**Symptom:** Kubernetes, Kafka, multi-region deployment, and sharding in the first version, for zero users.

**Why it hurts:** Knuth warned that premature optimization is "the root of all evil (or at least most of it)". Here it slows the first release and adds operations work before the team has learned anything.

**Instead:** size for the next six to twelve months, name the assumption, and write the revisit triggers.

## 6. Caching or optimizing without measurement

**Symptom:** a Redis layer added "for performance", with no latency or load figure behind it.

**Why it hurts:** it adds invalidation bugs and stale data, and nobody can say whether it helped.

**Instead:** measure the bottleneck, add the cache to the measured path, and define the invalidation rule before writing the cache.

## 7. Dual writes

**Symptom:** the code saves to the database and then publishes to the broker, as two separate steps.

**Why it hurts:** eventually one step succeeds without the other.

**Instead:** the transactional outbox ([`integration-and-async.md`](../references/integration-and-async.md)).

## 8. Retrying everything

**Symptom:** every error is retried, without backoff, including on endpoints with side effects.

**Why it hurts:** duplicated charges, and retry storms that finish off a struggling dependency.

**Instead:** retry only transient failures, with exponential backoff, jitter, and a budget. Make side effects idempotent ([`reliability-and-observability.md`](../references/reliability-and-observability.md)).

## 9. Missing timeouts

**Symptom:** outbound calls use default or infinite timeouts, and connection pools wait forever.

**Why it hurts:** one slow dependency consumes every thread or connection, and the whole system stops.

**Instead:** explicit timeouts shorter than the caller's own. Bounded pools and bulkheads ([`reliability-and-observability.md`](../references/reliability-and-observability.md)).

## 10. Distributed transactions for convenience

**Symptom:** two-phase commit across services, or a "transaction" that spans several HTTP calls with no compensation.

**Why it hurts:** locks are held across the network, and partial failures have no path to recovery.

**Instead:** keep the invariant inside one transaction, or model the flow as a saga with compensations ([`integration-and-async.md`](../references/integration-and-async.md)).

## 11. Event sourcing or CQRS by default

**Symptom:** every write becomes an event, or a standard list screen reads from a separate database.

**Why it hurts:** complexity with no requirement for history or diverging read models, and slower debugging.

**Instead:** plain state first. Adopt CQRS and event sourcing for the specific flows that need them ([`integration-and-async.md`](../references/integration-and-async.md)).

## 12. Tenancy decided later

**Symptom:** "we will add `tenant_id` when the first customer asks".

**Why it hurts:** retrofitting isolation touches every query, cache key, job, and log line. Leaks are likely during the migration.

**Instead:** choose the tenancy model in the first ADR, and enforce it in the data layer ([`data-and-consistency.md`](../references/data-and-consistency.md)).

## 13. Observability after launch

**Symptom:** "we will add tracing once things are stable".

**Why it hurts:** the first incident happens before the telemetry exists, and its cause is lost.

**Instead:** the day-one baseline in [`reliability-and-observability.md`](../references/reliability-and-observability.md), before the first production deploy.

## 14. Designing before the walking skeleton

**Symptom:** weeks of design and feature code before the application has ever run in a deployed environment.

**Why it hurts:** infrastructure problems surface late, at the worst possible moment.

**Instead:** deploy an empty application through the real pipeline first ([`delivery-and-poc.md`](../references/delivery-and-poc.md)).

## 15. Undocumented decisions

**Symptom:** the reasons for the architecture live in one person's head or in a chat thread.

**Why it hurts:** the next team reverses a decision that was made for good reasons, or repeats an experiment that was already rejected.

**Instead:** one ADR per non-trivial decision, with the rejected alternatives and the revisit triggers ([`adr.md`](../references/adr.md)).

## 16. AI agents with direct access

**Symptom:** an agent is connected to the production database, or to a shared service account.

**Why it hurts:** there is no authorization and no audit trail, and a prompt injection becomes a data loss.

**Instead:** curated tools, the user's own identity, the same use cases that humans use, and an approval step for irreversible actions ([`ai-native-systems.md`](../references/ai-native-systems.md)).
