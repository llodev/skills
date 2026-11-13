# Data and consistency

## Default store

Start with **one relational database, PostgreSQL unless a requirement says otherwise.** It provides ACID transactions, constraints that protect invariants inside the database, mature migration and backup tooling, and enough JSON and full-text support for early products. The `pgvector` extension covers embeddings at moderate scale, so a separate vector store is not needed until the corpus or the latency budget demands one.

## Add a second store only for a measured need

| Need                                                    | Store                | Add when                                                                           |
| ------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| Full-text relevance, faceting, typo tolerance at volume | Search engine        | Measured: PostgreSQL search is too slow or too weak for the query                  |
| Hot reads the database cannot serve                     | In-memory cache      | Measured: read latency or load is the bottleneck, and the data tolerates staleness |
| Deep relationship traversal                             | Graph database       | Measured: unbounded-depth queries dominate and relational joins are the bottleneck |
| High-volume time series                                 | Time-series database | Ingest or retention volume exceeds what the relational store handles               |
| Files, images, exports                                  | Object storage       | Always, for binary content. Never store files in the database                      |
| Flexible documents                                      | Document store       | Rarely. Try a JSONB column first                                                   |

Each store adds a synchronization problem, a backup problem, a failure mode, and an operations cost. Write an ADR for each one.

## Consistency per flow

Decide consistency per flow, not per system.

| Flow                                  | Usual requirement                                               | Reason                                    |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| Payment capture, refund               | Strong                                                          | Money must not be counted twice or lost   |
| Stock decrement, slot or seat booking | Strong, enforced by a unique constraint or a conditional update | Overselling is a visible business failure |
| Quota or balance enforcement          | Strong at write time                                            | The rule is checked at the write          |
| Activity feed, timelines              | Eventual                                                        | A few seconds of lag is invisible         |
| Counters such as likes or views       | Eventual, batched                                               | Exact real-time values are rarely needed  |
| Search index                          | Eventual                                                        | It is rebuilt from the source of truth    |
| Notifications and emails              | Eventual, at least once                                         | Duplicates are handled by idempotency     |
| Analytics                             | Eventual, batch                                                 | Reporting tolerates delay                 |

Rule of thumb: if a wrong answer causes a financial loss, a double action, or a legal problem, the write path needs strong consistency. Everything derived from that write can be eventual.

## CAP and PACELC, applied

- **CAP** describes behavior during a network partition only. A system must choose between refusing some requests (consistency) and answering with possibly stale data (availability). It says nothing about normal operation.
- **PACELC** covers the normal case too. Without a partition, the system still trades latency against consistency, for example by waiting for replicas to acknowledge a write.
- For a single-region, single-primary PostgreSQL system, the practical decision is not "CP or AP". It is replication lag. A read from a replica can miss the user's own write. Send read-your-writes flows to the primary, or read from the primary for a short window after a write in the same session.
- Most MVPs have no partition-tolerance decision to make. Multi-region writes create that decision. Do not adopt a distributed store without a requirement that needs it.

## Ownership and schemas

- Each bounded context owns its tables or schema. No other context writes to them.
- Cross-context reads go through an interface, an event, or a read model. Cross-context joins are not allowed.
- If two contexts need the same table, the boundary or the ownership is wrong.

## Multi-tenancy

Decide the tenancy model early. It is expensive to change later. Options for B2B products, from the lightest isolation to the strongest:

1. **Shared schema with a `tenant_id` column on every row,** enforced by the application and, preferably, by PostgreSQL row-level security. This is the cheapest option and the usual default for B2B SaaS.
2. **A schema per tenant.** Stronger separation. Migrations run once per schema, and hundreds of tenants make that operationally heavy.
3. **A database per tenant.** The strongest isolation, per-customer data residency, and a cost per tenant. Use it when contracts or regulation require it.

Whichever you choose, every query, cache key, background job, and log line must carry the tenant. Tenant leakage is the most damaging bug class in B2B systems, so test it explicitly with queries that run as two different tenants.

## Migrations

- Run migrations from the pipeline. Keep them in version control and make them forward-only.
- Use expand and contract for any change that old and new code must both survive: add the new column, deploy code that writes both, backfill, switch the reads, then remove the old column in a later release.
- Never rename or drop a column in the same release that stops using it.
- Design each migration so that rolling back the application version still works.

## Backups and recovery

- A backup is not proven until a restore has been run. Schedule restore tests.
- Write the recovery objectives explicitly: RPO, the amount of data loss the business accepts, and RTO, how long recovery may take. These drive the backup frequency and the replication setup, and they belong in the ADR.
