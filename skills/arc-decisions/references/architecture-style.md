# Architecture style

Default: **one deployable application, organized into modules along bounded contexts** (a modular monolith). Move away from it only when there is evidence, not a forecast.

## Why this is the default

- One deploy, one log stream, and one trace per request. Debugging takes minutes instead of hours.
- Transactions across modules are local database transactions. A saga is not needed on day one.
- Moving a boundary is a code change, not a data migration between services.
- The operational load is one application and one database, which a team of a few engineers can run.

## Enforce the boundaries

A modular monolith stays modular only if the boundaries are enforced:

- Each module exposes a small public interface, such as a facade or an application service. Other modules call only that.
- Each module owns its tables or schema. No other module queries them directly. Cross-module reads go through the interface.
- Dependency rules are checked in CI with architecture tests, import linters, or build-graph rules. A rule that nobody checks is a suggestion.
- Cross-module side effects go through in-process events, with the same contract that an asynchronous version would use. Later, extraction changes the transport, not the design.

## Split triggers

Extract a module into its own service only when **at least two** of these hold, and at least one of them is measured:

1. Two or more teams block each other's deploys every week.
2. The module has a measured scaling profile (CPU, memory, throughput, or latency) that scaling the whole application cannot solve.
3. It has a different availability, security, or compliance boundary, such as card data or medical records that must be isolated.
4. The problem needs a different runtime or technology: real-time media, ML inference, heavy batch processing.
5. A failure in the module must not take the rest down, and bulkheads inside the monolith cannot provide that isolation at reasonable cost.

These are not valid reasons: "microservices are modern", "we might need to scale someday", "large companies do it", "it will be cleaner". They are the usual causes of a distributed monolith (see [`anti-patterns/architecture.md`](../anti-patterns/architecture.md)).

## How to extract a module

1. Make the boundary real inside the monolith first: a public interface, owned tables, and no backdoor reads. If that cannot be done, the extraction will fail.
2. Route callers through an anti-corruption layer, so that the new service's model does not leak into the rest of the code.
3. Move the code into a new deployable and shift traffic to it gradually. Martin Fowler describes this as the strangler fig pattern.
4. Move the data last, once the service owns the behavior. During the transition, sync data through change events and keep a rollback path.

## Other styles and when they fit

- **Serverless functions** fit spiky, event-driven workloads with little state, for a team that does not want to run servers. Watch cold starts, local development friction, and vendor lock-in.
- **Services from day one** fit only when the bounded contexts are already known, usually from a previous system, and the team has run distributed systems before.
- **Event-driven architecture across the whole system** fits when most flows are reactions to events and consumers evolve independently. It is an integration style, not a starting point (see `integration-and-async.md`).

## Decision checklist

- [ ] The stage and the team size are stated. As a heuristic, one team of roughly eight engineers or fewer works well in one codebase. Several teams in one codebase call for stronger module boundaries first. They are not a split rule on their own.
- [ ] The boundaries that already exist are named, even if they are informal.
- [ ] If services are proposed, the split triggers that hold are listed with their evidence.
- [ ] The mechanism that enforces the module boundaries is written down.
