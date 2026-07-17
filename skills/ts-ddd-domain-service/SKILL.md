---
name: ts-ddd-domain-service
description: "Create, review, or guide pure Domain Service implementation in a TypeScript + DDD monorepo. Use when the request involves `*.service.ts` files inside `apps/api/src/<bc>/domain/services/`, domain policies, pure calculations/rules across multiple entities/VOs, naming patterns (`*Policy`, `*Calculator`, `*Resolver`, `*Specification`), branching on closed-set enums (status / kind / role) from `@acme/celebrations-contracts`, or tests in `apps/api/test/<bc>/domain/services/`. Scope is the *pure* domain layer; for orchestrators that need a repository or other I/O (e.g. `SlugAllocator`), see the sibling `application/services/` section at the end."
---

# TypeScript DDD Domain Service

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/domain-service-pattern.md`](references/domain-service-pattern.md) completely.
**Do NOT load** other DDD skills (entity, use-case, repository) unless explicitly requested.

This skill covers **pure** domain services that live in
`apps/api/src/<bc>/domain/services/`. They never see a repository, NestJS,
Firestore, HTTP, Zod, or any DTO. They take entities/VOs/primitives as
arguments and return a `Result` or a plain domain value.

> If the rule needs I/O (load by slug, retry against the database,
> call an external API), it is an **application service**, not a domain
> service — jump straight to the "When you need I/O" section below.

---

## Before You Start

Before writing a single method, answer:

- **Ownership**: does the rule use only one entity's own data? → put it as an entity method + `cloneWith` (see `Celebration.publish`), not a service.
- **Cross-aggregate?**: does it combine 2+ entities/VOs without a clear owner? → Domain Service.
- **I/O needed?**: does the rule require a repository, query, Firestore, or external call? → Application Service in `application/services/` (DI + `@Injectable`), not Domain Service.
- **Already exists?**: is the rule already captured in a VO (`Slug`, `PaletteKey`) or entity method (`addSection`, `publish`)? → do not duplicate.
- **Closed-set branch?**: if you compare a status/kind/role against a literal string, stop — use the enum from `@acme/celebrations-contracts` (see "Branching on closed sets" in the reference).

---

## Domain Service vs Use Case vs Application Service

> For the **Entity Method** criteria (single-aggregate invariants — when the rule belongs inside `*.entity.ts` rather than in any service), see the `ts-ddd-entity` skill references. This skill owns the boundary **between** the three service-shaped homes below.

| Situation                                                 | Where to put it                                   | Why                                                   |
| --------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Rule combines 2+ entities/VOs with no clear owner, no I/O | **Domain Service** (`domain/services/`)           | No single entity owns the rule; pure → no DI needed   |
| Rule is pure but only used in one flow                    | Inline in Use Case                                | YAGNI — extract to service only when reused           |
| Rule needs I/O (repository, query, Firestore, HTTP)       | Use Case **or** Application Service               | Domain layer must stay pure                           |
| Multi-step I/O flow that doesn't fit `UseCase<IN, OUT>`   | **Application Service** (`application/services/`) | `SlugAllocator`-style: needs DI, retries, repo access |
| Rule is a boolean policy over a collection                | Domain Service (`*Policy`)                        | Stateless check over multiple objects                 |

---

## Core Rules

- File lives in `apps/api/src/<bc>/domain/services/<name>.service.ts` — never under `application/`, `infra/`, `presentation/`, or `libs/contracts/**`.
- Each leaf folder has an `index.ts` barrel — re-export every new service from `apps/api/src/<bc>/domain/services/index.ts`.
- Pure and deterministic: same input always produces same output, no `Date.now()`/`Math.random()` inside the rule (inject if needed).
- Imports allowed: `@acme/shared` (`Result`, `Entity`, VOs), `@acme/<bc>-contracts` (enums + interfaces), other entities/VOs in the same BC. Nothing else.
- **No** `@nestjs/*`, `@Injectable`, constructor injection, `firebase-admin`, Zod, DTOs, or framework decorators in this file.
- Receives domain objects (entities, VOs, primitives) — returns `Result<T>` or a plain domain value.
- Name by rule intent: `*Policy`, `*Calculator`, `*Resolver`, `*Specification`.
- Default to a class with `static` methods for stateless calculations; instance methods only when the service genuinely holds configuration that varies per call site.
- Compare closed-set fields against enum members (`CelebrationStatusEnum.PUBLISHED`), never raw strings. Iterate catalogs via `Object.values(XxxEnum)`.
- On failure use `Result.fail("DOMAIN_ERROR_CODE")` (UPPER_SNAKE). Aggregate multi-error validation with `Result.combine([...])` or by pushing into an `errors[]` array — same pattern as `Celebration.tryCreate`.
- Bubble up failures from inner VOs/entities via `result.withFail` instead of re-wrapping.

## NEVER

- **NEVER** inject a repository, query, or Firestore client into a Domain Service — I/O belongs in a Use Case or Application Service.
- **NEVER** import `@nestjs/*`, `firebase-admin`, `next`, `react`, or any framework here — that contamination is what the layer exists to prevent.
- **NEVER** duplicate logic already in an entity method or VO — if `Celebration` exposes `publish()`, the service calls it instead of re-implementing the transition.
- **NEVER** put orchestration decisions (which repository to call next, which event to emit, retry loops) in a Domain Service — that is application concern.
- **NEVER** return `null`/`undefined`/`throw` to signal failure — return `Result.fail("CODE")` so callers handle errors uniformly.
- **NEVER** branch on a raw string literal for status/kind/role/palette — import the enum from `@acme/celebrations-contracts` (or the relevant BC contracts).
- **NEVER** call the function `execute` here — `execute` is reserved for `UseCase<IN, OUT>`. Name the method after the rule (`check`, `calculate`, `resolve`, `isSatisfiedBy`).
- **NEVER** call `Date.now()`, `Math.random()`, `crypto.randomUUID()`, `performance.now()`, `new Date()` (without an argument), or any other non-deterministic primitive inside a domain service — pure means **deterministic given inputs**. Pass a clock/random/id-generator as a parameter (or generate the value in the use case before calling the service). **Why**: non-determinism makes tests flaky, breaks property-based testing, and hides the real input set the rule depends on — the service silently couples to wall-clock time instead of taking it as data.

## When you need I/O — use an Application Service

If your "service" needs a repository, retries against the database, or
external calls, it is **not** a Domain Service. Put it in
`apps/api/src/<bc>/application/services/<name>.service.ts`, mark it
`@Injectable()`, inject ports via DI tokens, and still return `Result`.
Canonical reference in this repo:
`apps/api/src/celebrations/application/services/slug-allocator.service.ts`
(allocates a unique `Slug` by retrying against `CelebrationRepository`).
See the final section of [`references/domain-service-pattern.md`](references/domain-service-pattern.md)
for the contrast.

## Verification

After writing or editing a service, run:

```bash
pnpm --filter api typecheck && pnpm --filter api test
```

(or `make check-api`). Test files live in `apps/api/test/<bc>/domain/services/<name>.test.ts`.

## References

See [`references/domain-service-pattern.md`](references/domain-service-pattern.md) for: file paths, canonical snippets (`*Policy` and `*Calculator`), the closed-set enum rule, test strategy, the implementation checklist, and the application-service contrast.
