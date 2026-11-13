# Integration and async

## Synchronous by default

Use a synchronous call (HTTP or RPC) when the user is waiting for the answer and the answer is needed to continue. Keep the synchronous path short: at most two hops from the user's request to the data it needs. Every extra synchronous hop multiplies latency and failure probability. If one request fans out to five services, the user waits for the slowest one and fails when any one of them fails.

## Go asynchronous when

- The work takes longer than a request should, from seconds to minutes: report generation, media processing, imports, AI generation.
- The work can be retried safely and the response does not depend on it.
- One event triggers several independent reactions, and the producer should not know about them.
- Traffic is bursty and the consumer must keep up at its own pace.
- A downstream dependency is unreliable and its outages should not reach the user.

## Task queue or event stream

|             | Task queue (SQS, RabbitMQ, Redis-based queue, Postgres-based job queue) | Event stream (Kafka, Kinesis, Pulsar, NATS JetStream)                                                 |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Model       | Each message goes to one consumer and is then gone                      | A retained, ordered log that many consumer groups read independently                                  |
| Strength    | Simple retries, dead-letter queues, low operations cost                 | Replay, several independent consumers, high throughput with ordering per key                          |
| Choose when | Background jobs with one kind of consumer and moderate volume           | Several consumers need the same events, you need replay or rebuilt read models, or throughput is high |
| Cost        | Lower                                                                   | Higher: partitions, retention, consumer offsets, schema governance                                    |

Default to a task queue. A Postgres-based job queue, using row locking such as `FOR UPDATE SKIP LOCKED`, is a valid choice at low to moderate volume. It removes an infrastructure component, and it can enqueue the job in the same transaction as the data the job refers to.

## Delivery and idempotency

- Assume **at-least-once** delivery. Any broker worth using can redeliver a message. Exactly-once processing is a property you build in the application with idempotency. It is not a switch you turn on in the broker.
- Make consumers idempotent. Use an idempotency key per message or operation, a table of processed messages with a unique constraint, or upserts keyed by a natural identifier.
- Make side-effecting endpoints idempotent as well. Clients send an idempotency key, and the server stores the result for that key and returns it on a retry.

## The dual-write problem and the outbox

Writing to the database and publishing an event as two separate steps fails in one of two ways. The database commits and the publish fails, or the publish succeeds and the commit rolls back. The **transactional outbox** fixes this. Insert the event into an outbox table in the same transaction as the state change. A relay process reads the outbox, publishes the events, and marks them as sent. The relay can publish an event twice, so consumers must stay idempotent.

## Choreography or orchestration

- **Choreography:** each service reacts to events and emits its own. It suits short flows with independent reactions. It is hard to see the whole flow, and hard to put a timeout on it.
- **Orchestration:** one component, such as a saga orchestrator or a workflow engine, owns the flow state, calls each step, enforces timeouts, and runs compensations. It suits flows that involve money, several steps, or a need to show progress to a user or an operator.

## Sagas for cross-context transactions

A saga replaces a distributed transaction with a sequence of local transactions. Each step has a compensating action that undoes its business effect.

- A compensation is a business action, not a database rollback. A captured payment is refunded.
- Each step is idempotent, so it can be retried safely.
- Persist the saga's state (current step, attempts, deadline), so that a crash does not lose the flow.
- Every saga has a timeout and a path to a human, such as a queue of stuck orders.
- Avoid two-phase commit across services. It holds locks across network calls and couples the availability of every participant.

The better option is often to keep the flow inside one context. The boundary analysis in [`domain-and-boundaries.md`](domain-and-boundaries.md) exists to make that possible.

## CQRS

Separate the write model from the read model only when the read shape differs materially from the write shape, or when read load dominates and needs its own store. A typical trigger is a dashboard that joins six aggregates and is slow against the transactional model.

The costs are eventual consistency between the two models, two models to maintain, rebuild tooling, and more tests. Do not adopt CQRS for a standard CRUD screen. A read model can begin as a SQL view or a materialized view, and become a separate projection only when it must.

## Event sourcing

Storing state as a sequence of events is a separate decision from CQRS. Adopt it only when the domain needs a complete audit history as a first-class feature, such as a ledger or a regulated workflow, and the team can operate snapshots, event upcasting, and projections. It is not a default.

## Event contracts

- Events are public contracts. Version them, and make changes additive, such as new optional fields. A breaking change gets a new event type or a new version.
- The owning context publishes the event. Consumers must tolerate unknown fields.
- Once there is more than one consumer, check a schema (JSON Schema, Avro, or Protobuf) in CI.
- Ordering is guaranteed only within a partition key, usually the aggregate identifier. Do not assume global ordering.
