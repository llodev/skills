---
name: ts-ddd-repository
description: "Create, review, or guide repository contracts and implementations in a TypeScript + DDD codebase. Use when the request involves `*.repository.ts` files under `apps/api/src/<bc>/domain/repositories/` or `apps/api/src/<bc>/infra/{firestore,memory}/`, persistence operations (save / findBy* / list*), the `<NAME>_REPOSITORY` DI token, adapting the Firebase Admin SDK to a domain port, `toFirestore`/`fromFirestore` mappers, the side-by-side Firestore + InMemory adapter pair, contract tests under `apps/api/test/<bc>/infra/{firestore,memory}/`, `Result` error handling, or CQRS Repository vs Query separation."
---

# TypeScript DDD Repository

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/repository-pattern.md`](references/repository-pattern.md) completely,
then [`references/firestore-adapter.md`](references/firestore-adapter.md) completely.
The Firestore Admin SDK is the only production persistence stack in this repo
(no Prisma, no MongoDB, no Supabase).

**Do NOT load** other DDD skills (`ts-ddd-use-case`, `ts-ddd-entity`,
`ts-ddd-dto`, `ts-query-cqrs`) unless explicitly requested.

> **Before You Start** — ask: which aggregate owns this write? Persistence boundaries must match aggregate boundaries; if a single `save()` touches data from two aggregates, you've conflated them.

---

## Where the files live

Each bounded context owns a hexagonal slice:

```
apps/api/src/<bc>/
  domain/
    repositories/
      <name>.repository.ts          ← port (interface) + DI token symbol
      index.ts                      ← barrel
  infra/
    firestore/
      firestore-<name>.repository.ts   ← Firestore adapter (Injectable)
      <name>.mapper.ts                 ← to/from Firestore helpers
      index.ts
    memory/
      in-memory-<name>.repository.ts   ← InMemory adapter (no decorators)
      index.ts
  <bc>.module.ts                    ← wires { provide: <NAME>_REPOSITORY, useClass: Firestore<Name>Repository }

apps/api/test/<bc>/infra/
  firestore/firestore-<name>.repository.test.ts   ← fake-DB at the SDK boundary
  memory/in-memory-<name>.repository.test.ts      ← straight unit test
```

Path aliases used everywhere:

- `@acme/shared` → `Result`, `Entity`, base building blocks.
- `@acme/<bc>-contracts` → wire types, status/kind enums (e.g. `CelebrationStatusEnum`).
- `@<bc>/domain/...`, `@<bc>/infra/...` → cross-layer imports inside the BC.
- `@shared/firebase` → `FirestoreService`.
- Relative paths only within the same folder.

---

## Before You Start

Answer first:

- **Which operations?** Define the smallest port that satisfies the use cases. Prefer intent-named methods (`save`, `findBySlug`, `listByStatus`, `saveSection`, `deleteSection`) over a generic `CrudRepository`.
- **Aggregate boundary?** A single port should own writes to the whole aggregate (e.g. `CelebrationRepository` owns `celebrations` doc + its `sections` subcollection). Do not split aggregates across multiple ports.
- **Repository or Query?** Loading an entity to enforce invariants → Repository. Returning a read DTO for the API/front → Query (separate interface, separate skill: `ts-query-cqrs`).
- **DI token name?** Add an exported `Symbol("<NAME>_REPOSITORY")` next to the interface — Nest injects by token, not class.
- **InMemory adapter?** Always ship one. Use-case tests substitute it via the same DI token; no need for `jest.fn()` stubs.

---

## Repository vs Query (CQRS)

| Need                                             | Use                          | Returns                           |
| ------------------------------------------------ | ---------------------------- | --------------------------------- |
| Load entity to preserve invariants before update | `Repository.findBy*`         | Domain entity (or `null`)         |
| Existence check before a write                   | `Repository.findBy*`         | Entity or `null` or `Result.fail` |
| Read projection for an API/front response        | `Query` (separate interface) | Read DTO                          |
| Custom domain-oriented lookup (`findBySlug`)     | `Repository` method          | Domain entity                     |
| Paginated list for the UI                        | `Query`                      | `PaginatedResultDTO<XxxListItem>` |

**Rule**: if the caller needs the entity to run domain logic → Repository. If the caller only needs data to display → Query. Both can share an adapter class but the **TypeScript interfaces must be separate**.

---

## Core Rules

- The port lives in `<bc>/domain/repositories/` — no `firebase-admin`, no `@nestjs/*`, no Zod, no DTOs.
- Export a DI token symbol next to the port: `export const CELEBRATION_REPOSITORY = Symbol("CELEBRATION_REPOSITORY");`
- Every method returns `Promise<Result<T>>`. Adapters never throw in the normal flow — wrap I/O in `try/catch` and return `Result.fail("SHORT_SCREAMING_SNAKE_CODE")`.
- Lookup methods that legitimately mean "absent" return `Result<T | null>` (Firestore + InMemory both used `findBySlug(...): Promise<Result<Celebration | null>>`). Mutation methods that require an existing aggregate return `Result.fail("<AGG>_NOT_FOUND")`.
- Mapping lives in dedicated `<name>.mapper.ts` files (`toFirestore` / `fromFirestore` returning `Result<Entity>`) — never inline transformation inside an operation method.
- `save` accepts a fully constructed entity (already validated by `Entity.tryCreate` / `cloneWith` in the use case). The adapter does **not** patch partial fields.
- Aggregate writes that touch a subcollection (e.g. wholesale-replace sections) document their atomicity guarantees as a code comment — if the write is non-transactional, say so.

## NEVER

- **NEVER** import `firebase-admin`, `@nestjs/*`, Zod, or BC contracts that carry HTTP/UI shapes into a port file.
- **NEVER** add a read-projection / DTO-returning method to a Repository — that belongs in a `Query` interface (see `ts-query-cqrs`).
- **NEVER** inline mapping in `findBy*` / `save` — extract `toFirestore` / `fromFirestore`.
- **NEVER** accept partial fields in `save()`. The use case does `cloneWith` first; the adapter receives a complete, validated aggregate.
- **NEVER** wire an adapter directly via `useClass` _without_ the token symbol — Nest cannot inject an interface, only a token.
- **NEVER** hit real Firestore from a unit test. Pass a fake at the SDK boundary (see firestore-adapter reference).
- **NEVER** share entity references across repository round-trips. Always `toSnapshot()` on save and `Celebration.tryCreate(structuredClone(snap))` on read — otherwise two callers can mutate the same in-memory aggregate and corrupt invariants between use cases.
- **NEVER** call `snap.data()` without first checking `snap.exists`. It returns `undefined` and the next field access crashes downstream — guard with `if (!snap.exists) return Result.ok<T | null>(null);` first.
- **NEVER** let `firebase-admin/firestore.Timestamp` leak into the domain entity. Convert at the boundary (`Timestamp.fromDate()` on write, `.toDate()` on read) inside the mapper. The domain holds plain `Date`, never `Timestamp` — otherwise the domain layer transitively depends on `firebase-admin`.

## References

- [`references/repository-pattern.md`](references/repository-pattern.md) — port shape, DI token, InMemory adapter, dual-adapter test strategy, enums-in-fixtures rule, checklist.
- [`references/firestore-adapter.md`](references/firestore-adapter.md) — Firebase Admin SDK basics (`collection().doc().get()`, subcollections, `Timestamp` conversions, fake-DB test harness, mapper helpers, aggregate-write caveats).
