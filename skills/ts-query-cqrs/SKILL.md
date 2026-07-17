---
name: ts-query-cqrs
description: "Create, review, or guide read-side queries in a TypeScript + DDD CQRS codebase. Use when the request involves `*Query` interfaces, `*.query.ts` files, read use cases (`find-*`), DTO projections for API/front consumption, pagination/filters/aggregations, or separating read (query) from write (repository/command)."
---

# TypeScript DDD Query (CQRS Read Side)

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/query-cqrs-pattern.md`](references/query-cqrs-pattern.md) completely.

**Then load the adapter reference for your infrastructure:**

- **Prisma** → also read [`references/prisma-adapter.md`](references/prisma-adapter.md) completely.
- Other adapters (Firestore, MongoDB, Supabase…) → reference files not yet available; apply the principles from `query-cqrs-pattern.md`.

**Do NOT load** other DDD skills (entity, use-case, repository) unless explicitly requested.

---

## Before You Start

Before defining a single interface, answer:

- **Read or write?** If the caller needs the entity to run domain logic → `Repository`. If the caller only needs data to display → `Query`. When in doubt, check the table below.
- **Projection shape?** What does the consumer actually need? Individual fields only — never return the full entity from a query.
- **Pagination?** Does the list need `page`/`pageSize`? Use `PaginatedResultDTO<XxxListItem>`.
- **Filters?** Map optional filters to conditional `WHERE` clauses in the adapter — never hard-code them.

---

## Query vs Repository Decision Table

| Situation                                                 | Use                   | Why                                                    |
| --------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| Display a list on the front-end                           | `Query`               | Returns DTO, no entity overhead                        |
| Load entity before an update/delete                       | `Repository.findById` | Needs domain invariants (`cloneWith`)                  |
| Paginated list with filters                               | `Query`               | Joins and selective projection are a read-side concern |
| Existence check before a write                            | `Repository.findById` | Returns entity or `Result.fail` — not a DTO            |
| Dashboard / aggregated panel                              | `Query`               | Reads across tables, no entity reconstruction needed   |
| Custom domain lookup (`findByEmail`) that feeds a command | `Repository`          | Caller needs an entity to modify                       |

---

## Core Rules

- Query interface lives in `core` — no ORM imports, no database driver types.
- `execute(input): Promise<Result<OutputDTO>>` is the only method signature.
- The adapter maps rows **directly to DTO** — it never reconstructs a domain entity (`toDomain`).
- Use `SELECT` fields explicitly in the adapter — never `findMany` without a `select` clause.
- Paginated queries must count total records atomically with a single DB round-trip.

## NEVER

- **NEVER** return a domain entity from a Query — entities expose write-side invariants and domain methods that leak to consumers.
- **NEVER** import the entity class or call `toDomain` inside a query adapter — queries map rows to DTOs directly.
- **NEVER** put write-side logic (validation, `cloneWith`, invariant checks) inside a query.
- **NEVER** use `findMany` without a `select` clause — over-fetching in projections becomes a silent performance trap.
- **NEVER** run two separate DB calls for data + count — use a single atomic operation to avoid race conditions on paginated results.
- **NEVER** extend or instantiate the entity class from DTO — a DTO derived from `*Props` must use `Omit`/`Pick`, not class inheritance.

## References

- [`references/query-cqrs-pattern.md`](references/query-cqrs-pattern.md) — core contract, DTO modeling, in-memory mock, checklist.
- [`references/prisma-adapter.md`](references/prisma-adapter.md) — Prisma-specific adapter with `select`, `$transaction`, conditional WHERE.
