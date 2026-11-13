# Reliability and observability

Add telemetry before the first production deploy, not after the first incident. In a distributed system, observability is part of the architecture.

## Day-one baseline (even for an MVP)

- **Structured logs** in JSON, with a request or correlation identifier and the tenant identifier when there is one. Never log secrets or personal data. Redact at the source.
- **Traces** with OpenTelemetry. Use auto-instrumentation for the framework and the database, and add spans around external calls and queue operations. Export over OTLP, so the backend can change later without touching the code.
- **Metrics** per endpoint and per consumer: request rate, error rate, and duration (the RED method), plus saturation for database connection pools and queues.
- **Error tracking** that groups exceptions and links them to releases.
- **Health checks.** A liveness check proves that the process runs. A readiness check verifies the dependencies that the instance needs before it can serve traffic.
- **An uptime probe** on the public entry point, run from outside your own infrastructure.
- **Alerts tied to user-facing symptoms.** An SLO burn-rate alert, which fires when the error budget is being spent too fast, is more useful than an alert on CPU.

## Service level objectives

Define one or two objectives per user journey: availability (the fraction of successful requests) and latency (p95 or p99 for a named endpoint). Use them to decide where reliability work goes. An unspent error budget means the team can ship faster. A spent budget means feature work pauses until the trend recovers. For an MVP, one availability target is enough.

## Timeouts

- Every outbound call has an explicit timeout, shorter than the timeout of the request that triggered it, so that the caller can still respond.
- Library defaults are often infinite or very long. Check them.
- Waiting for a connection from a pool is a timeout too. A pool that waits forever hides an outage.

## Retries

- Retry only operations that are idempotent or that carry an idempotency key.
- Use exponential backoff with jitter, a randomized delay, so that clients do not retry in synchronized waves.
- Cap the number of attempts, and cap the total load. A retry budget, such as retries that may not exceed a fixed fraction of the original traffic, stops retry storms from amplifying an outage.
- Respect `Retry-After` from the server.
- Retry transient failures, such as timeouts, 503 responses, and connection resets. Do not retry validation errors or business rejections.

## Circuit breakers, bulkheads, and fallbacks

- A **circuit breaker** wraps dependencies that can hang or flap, such as payment gateways, email providers, and third-party APIs. When failures pass a threshold, it opens and fails fast. After a cool-down, it lets a few probe requests through (half-open).
- A **bulkhead** isolates resources by workload: separate connection pools, worker pools, or queues. A slow integration must not consume the connections that serve the core flow.
- A **fallback** is a decision made in advance. It can serve a cached or stale value, degrade a non-essential feature, or queue the work and tell the user it is pending.
- A circuit breaker does not replace connection-pool limits on the database. Protect the database with pool sizes, statement timeouts, and load shedding.

## Rate limiting and load shedding

- Apply rate limits at the edge, in the gateway, the load balancer, or the CDN, keyed by client, API key, or tenant. Limit expensive endpoints separately from cheap ones.
- Return `429` with `Retry-After`.
- Use bounded queues. An unbounded queue turns a slowdown into an outage, and it hides the problem until memory runs out.
- When the system is overloaded, reject the least important work first, and say so in the response.

## Dead-letter queues

Every queue that can fail gets a dead-letter queue (DLQ) with a maximum receive count. Store the original payload, the error, and the attempt count. Alert when a critical flow's DLQ is not empty. Build the replay tool before you need it. A DLQ without a replay path is a place where work goes to be lost.

## Graceful operation

- Handle SIGTERM: stop accepting new work, finish in-flight requests, and close connections within a deadline.
- Deploys must not drop requests. Use rolling or blue-green deploys, with readiness checks gating the traffic.
- Auto-healing, where the orchestrator restarts failed instances, helps only stateless processes. Keep state in the database, in queues, or in object storage.

## Failure-mode checklist

For each critical flow, answer these questions:

- What happens if the database is slow, unavailable, or fails over?
- What happens if a third-party dependency times out or returns errors?
- What happens if a message is delivered twice, or out of order?
- What happens if the service crashes between a database write and an external call?
- What happens if a deploy rolls back in the middle of a migration?
- What is the blast radius of one tenant or one bad input?

Each answer is either a mitigation in the design or an accepted risk recorded in an ADR.
