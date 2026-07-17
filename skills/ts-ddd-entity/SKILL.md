---
name: ts-ddd-entity
description: >-
  Create, review, or guide Domain Entity implementation in a TypeScript + DDD
  codebase. Use when: the request touches `*.entity.ts` files under
  `apps/api/src/<bc>/domain/entities/` or their tests under
  `apps/api/test/<bc>/domain/entities/`; modeling business rules with `Entity`
  from `@acme/shared` (dual API `create`/`tryCreate`, `Result` /
  `Result.combine` validation); validating FK refs with `Id.required` or own id
  with `Id.tryCreate`; enforcing enum-backed closed-set fields (status / kind /
  layout / provider / palette) from `@acme/<bc>-contracts` instead of string
  literals; validating nested entities or arrays element-by-element; adding
  state transitions via `cloneWith` (leaf entity) or named domain methods like
  `publish`, `addSection`, `deactivate` that mutate `_field` + `touch()`
  (aggregate root); exposing typed getters or `toSnapshot()` for persistence
  boundaries.
metadata:
  version: 0.1.0
---

# TypeScript DDD Entity

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/entity-pattern.md`](references/entity-pattern.md) completely.
**Do NOT load** other DDD skills (use-case, repository, dto) unless explicitly requested.

---

## Before You Start

Before writing a single line, answer:

- **Bounded context**: which BC owns this entity? File lands at `apps/api/src/<bc>/domain/entities/<name>.entity.ts` and is re-exported by that folder's `index.ts` barrel.
- **Identity**: is `id` optional on create (use `Id.tryCreate` / let the `Entity` base auto-generate via `Id.create(props.id!)`) or a required foreign relation (validate with `Id.required`)?
- **Closed-set fields**: every status / kind / layout / provider / palette / discriminator must come from a **string-backed TS enum** in `libs/contracts/<bc>/src/interfaces/` or `libs/shared` — never inline string literals or `as const` tuples.
- **Invariants**: which VO (`Slug`, `PaletteKey`, `ImageRefValue`, …) validates each field? Are there arrays of IDs or nested entities (e.g. `Section[]` inside `Celebration`)?
- **State transitions**: does behavior require a domain method? Use `cloneWith` for immutable swap-and-revalidate, or mutate `_field` + `this.touch()` for entities that own a mutable collection (see `Celebration`).
- **Constructor visibility**: `private` for leaf entities; `protected` only when subclasses need access.

---

## Core Rules

- Extend `Entity<Type, Props>` from `@acme/shared`; keep constructor `private` or `protected`.
- Import enums and tagged unions from `@acme/<bc>-contracts` (e.g. `@acme/celebrations-contracts`). Never redefine wire types in the entity file.
- Expose dual API: `tryCreate(props): Result<T>` (returns Result, **canonical**) and `create(props): T` (delegates to `tryCreate` + `throwIfFailed`).
- Validate every field via VOs / type guards + collect errors (either `Result.combine([...])` or a manual `errors: string[]` accumulator — both patterns exist in this codebase; use `Result.combine` when all checks return `Result<T>`).
- Always store **normalized** values. Spread `vo.instance.value` for scalars; for sibling entities, prefer building from `Section.tryCreate(sp)` and keeping the array as `Section[]` in a private field while keeping `SectionProps[]` in `props` for serialization.
- Getters expose domain values; `this.props` is never accessed from outside the entity class.
- `cloneWith(overrides)` deep-merges and re-runs `tryCreate` automatically — never call `tryCreate` by hand from a domain method when `cloneWith` suffices.

## Enum Rule (HARD)

Every closed set is a **string-backed TS enum** in the contracts package. Pattern:

```ts
export enum CelebrationStatusEnum {
  DRAFT = "draft",
  PUBLISHED = "published",
}
export const CELEBRATION_STATUSES = Object.values(CelebrationStatusEnum);
export type CelebrationStatus = (typeof CelebrationStatusEnum)[keyof typeof CelebrationStatusEnum];
export function isCelebrationStatus(v: unknown): v is CelebrationStatus {
  return typeof v === "string" && CELEBRATION_STATUSES.includes(v as CelebrationStatus);
}
```

Inside the entity:

- Validate with the type guard (`isCelebrationStatus(props.status)` → push `"INVALID_CELEBRATION_STATUS"` on failure).
- Store the value typed as the union (`CelebrationStatus`), emit it from a getter.
- Compare with the enum member: `this._status === CelebrationStatusEnum.PUBLISHED`. **Never** `=== "published"`.
- Singleton / limit catalogs reference enum members: `const SINGLETON_KINDS = [SectionKindEnum.HERO, SectionKindEnum.GALLERY, SectionKindEnum.SIGNATURE] as const`.

## Base Class Behaviour You Must Know

`Entity`'s protected constructor calls `Id.create(props.id!, { attribute: "id" })` and stores the normalized id, plus initializes `createdAt`/`updatedAt`/`deletedAt` if absent. Therefore:

- Do **not** set `createdAt`, `updatedAt`, `deletedAt` inside `tryCreate`. Use `this.props.updatedAt = new Date()` via a private `touch()` for mutations.
- `cloneWith` uses `structuredClone` on `props` before deep-merging, so nested objects are safe from caller mutation.

## NEVER

- **NEVER** use a raw string literal where an enum member exists (`"published"` → `CelebrationStatusEnum.PUBLISHED`).
- **NEVER** store raw VO input in `props` — always normalize via `vo.instance.value`.
- **NEVER** add a public setter — mutate state through a named domain method.
- **NEVER** skip validating array elements — loop and either push into a manual `errors[]` or `Result.combine` per-element results.
- **NEVER** put a domain invariant in the use case if it must hold for the entity from any caller.
- **NEVER** expose `this.props` to callers outside the entity — use typed getters or a deliberate `toSnapshot()` method.
- **NEVER** import from `@ddd/shared` (legacy alias). The shared lib is `@acme/shared`.

## References

See [`references/entity-pattern.md`](references/entity-pattern.md) for: real paths, canonical `tryCreate` snippet, enum-driven validation, array / nested-entity pattern, `cloneWith` vs mutable-collection mutation, test layout under `apps/api/test/`, and the pitfalls table.

See also [`examples/product.entity.ts`](examples/product.entity.ts) and [`examples/product.entity.test.ts`](examples/product.entity.test.ts) for a self-contained reference entity with an enum-driven status field.
