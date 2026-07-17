---
name: ts-ddd-dto
description: "Create, review, or guide Data Transfer Objects in a TypeScript + DDD monorepo. Use when the request involves the per-BC contracts package (`libs/contracts/<bc>/src/{interfaces,schemas,dtos}/`), Zod 4 schemas paired with `z.infer` DTO types, closed-set values modelled as string-backed `XxxEnum` (with `z.literal(EnumName.X)` for discriminators and `z.nativeEnum(EnumName)` for full-set validators), input contracts (`CreateXxxDTO`, `UpdateXxxDTO`), output contracts (`XxxResponseDTO`), CQRS read projections, pagination/filters/metadata, or wire-shape changes consumed by both `apps/api` and `apps/web`."
---

# TypeScript DDD DTO

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/dto-pattern.md`](references/dto-pattern.md) completely.
**Do NOT load** other DDD skills (entity, use-case, controller) unless explicitly requested.

---

## Where DTOs live

DTOs are **not** co-located with the api. They live in the per-BC contracts package, which is the single source of truth for the wire shape and is consumed by both `apps/api` and `apps/web`.

```
libs/contracts/<bc>/src/
  interfaces/   ← pure TS types + string-backed `XxxEnum` for closed sets
  schemas/      ← Zod 4 schemas (derive types via z.infer)
  dtos/         ← DTO types paired with their Zod schema
  index.ts      ← re-exports interfaces + schemas + dtos
```

Imported as `@acme/<bc>-contracts` (e.g. `@acme/celebrations-contracts`). Neither api nor web redefines wire types locally. The api maps contract DTOs to entities via `apps/api/src/<bc>/presentation/mappers/`.

---

## Before You Start

Non-obvious decisions specific to this monorepo:

- **Does this wire shape already exist in `libs/contracts/<bc>/`?** If yes, edit it; never duplicate it inside `apps/api` or `apps/web`.
- **Write-side input (`CreateXxxDTO` / `UpdateXxxDTO` / `XxxFiltersDTO`) or read-side projection (`XxxResponseDTO` / `XxxListItemDTO`)?** They are separate DTOs; do not reuse one as the other.
- **Does any field belong to a closed set?** It MUST come from an `XxxEnum` in `interfaces/` — see the fallback rule in `references/dto-pattern.md` for where the enum lives (BC vs `libs/shared`).
- **Is the shape new, an added field, or a new variant in a discriminated union?** Use the decision tree at the top of `references/dto-pattern.md` to pick the right file(s).

---

## DTO Types

| Type   | Suffix / name                                   | Purpose                                |
| ------ | ----------------------------------------------- | -------------------------------------- |
| Input  | `CreateXxxDTO`, `UpdateXxxDTO`, `XxxFiltersDTO` | Command input / query filters          |
| Output | `XxxResponseDTO`                                | Controller response / use case payload |
| Query  | `XxxDTO`, `XxxDetailsDTO`, `XxxListItem`        | CQRS read projection                   |

---

## Mandatory: enums for closed-set values

Every closed set is a string-backed TS enum in `interfaces/`. The tuple, type, and predicate derive from it:

```ts
export enum SectionKindEnum {
  HERO = "hero",
  MESSAGE = "message",
  // ...
}

export const SECTION_KINDS = Object.values(SectionKindEnum);
export type SectionKind = (typeof SectionKindEnum)[keyof typeof SectionKindEnum];
export function isSectionKind(v: unknown): v is SectionKind {
  return typeof v === "string" && SECTION_KINDS.includes(v as SectionKind);
}
```

Zod usage:

- `z.literal(SectionKindEnum.HERO)` — branch of a `z.discriminatedUnion(...)`.
- `z.nativeEnum(CelebrationStatusEnum)` — full-set field validator.
- `z.enum(StringTuple)` — only when no enum exists (e.g. `PALETTE_KEYS` from `@acme/shared`).

Never inline string literals like `z.literal("hero")` or `z.enum(["draft", "published"])` when an enum exists.

---

## Core Rules

- Zod is the single validation source. Declare the schema first; export the type via `z.infer`.
- Query DTOs **never** extend an entity class — they are independent shapes that describe the wire payload.
- DTOs carry **no domain logic** and **no Firestore / NestJS / Next imports**.
- Enrichment for the front (signed URLs, formatted strings, expanded relations) happens at the **api boundary** (`presentation/mappers/` or a use-case projection), not inside the DTO file.
- Closed-set fields reference an `XxxEnum`. Discriminated unions use `EnumName.MEMBER` in both the TS branch (`type: SectionKindEnum.HERO`) and the Zod branch (`z.literal(SectionKindEnum.HERO)`).
- A change in `libs/contracts/<bc>` is a wire-contract change: update api validation/mappers and web consumers in the same PR.

## NEVER

- **NEVER** redefine a wire type inside `apps/api` or `apps/web` — import it from `@acme/<bc>-contracts`.
- **NEVER** reuse a `CreateXxxDTO` as a `XxxResponseDTO` — command fields leak into responses.
- **NEVER** import `firebase-admin`, `@nestjs/*`, `next`, or `react` from a contracts package.
- **NEVER** hand-write an interface that mirrors a Zod schema — derive with `z.infer`.
- **NEVER** use string literals or `as const` tuples for a closed set when an `XxxEnum` exists or should exist.
- **NEVER** put transformation logic in the DTO file — map at the api boundary.
- **NEVER** embed pagination totals inside the `data` array — keep `data` and `meta` separate.

## References

See [`references/dto-pattern.md`](references/dto-pattern.md) for: contracts-package layout, the enum → tuple → type → predicate pattern, schema/DTO snippets, naming conventions, and the verification checklist (`pnpm --filter @acme/<bc>-contracts test` → `build` → `pnpm --filter api typecheck` → `pnpm --filter web typecheck`).
