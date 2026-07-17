# TypeScript DDD DTO — Reference

## Decision Tree — new file or extend existing?

- **New BC concept** (e.g. `subscription`, `invoice`) → create new files under `libs/contracts/<bc>/src/{interfaces,schemas,dtos}/<name>.ts` + update each barrel `index.ts`.
- **New field on an existing shape** → edit the existing schema/interface file. If the field is a closed set, declare/extend the matching `XxxEnum` in `interfaces/` first, then reference it from the schema.
- **New variant in a discriminated union** (e.g. a new section type) → (1) add the enum member to the existing `XxxEnum`, (2) add the interface variant in `interfaces/`, (3) add the Zod literal branch in the `discriminatedUnion(...)` schema.
- **New cross-BC primitive** (used by ≥ 2 BCs) → it does not belong in `libs/contracts/<bc>/`; lift it to `libs/shared` (see "Where does the enum live?" below).

---

## Contracts-package Layout

Each bounded context has its own contracts package under `libs/contracts/<bc>`. It is the single source of truth for the wire shape and is consumed by both `apps/api` and `apps/web`.

```
libs/contracts/<bc>/
  package.json                       ← name: "@acme/<bc>-contracts"
  src/
    interfaces/
      <name>.ts                      ← pure TS types + `XxxEnum` for closed sets
      index.ts                       ← barrel
    schemas/
      <name>.schema.ts               ← Zod 4 schemas
      index.ts
    dtos/
      <name>.dto.ts                  ← `export type FooDTO = z.infer<typeof fooSchema>`
      index.ts
    index.ts                         ← `export * from "./dtos|interfaces|schemas"`
```

Rules:

- A contracts package may depend on `@acme/shared` (for `Result`, `ValueObject`, `PALETTE_KEYS`, etc.) and `zod`. Nothing else from the project.
- It MUST NOT import `firebase-admin`, `@nestjs/*`, `next`, or `react`.
- `apps/api` and `apps/web` both import from `@acme/<bc>-contracts`. Neither redefines wire types locally.

See `examples/product.dto.ts` in this skill for a standalone end-to-end illustration.

---

## Closed-set values use enums (mandatory)

Every status, kind, layout, provider, palette key, or other closed set is modelled as a **string-backed TS enum** in `interfaces/`. The tuple, type, and predicate derive from the enum — never the other way around.

```ts
// libs/contracts/celebrations/src/interfaces/celebration-status.ts
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

### Discriminated unions reference enum members

```ts
// libs/contracts/celebrations/src/interfaces/section-content.ts
export enum SectionKindEnum {
  HERO = "hero",
  MESSAGE = "message",
  // ...
}

export interface HeroSectionContent {
  type: SectionKindEnum.HERO; // ← enum member, not "hero"
  headline: string;
}

export interface MessageSectionContent {
  type: SectionKindEnum.MESSAGE;
  body: string;
}

export type SectionContent = HeroSectionContent | MessageSectionContent;
```

### Zod usage by shape

| Use case                                      | Operator                              |
| --------------------------------------------- | ------------------------------------- |
| Discriminator branch of `discriminatedUnion`  | `z.literal(SectionKindEnum.HERO)`     |
| Full-set field validator                      | `z.nativeEnum(CelebrationStatusEnum)` |
| Closed set with no enum (e.g. `PALETTE_KEYS`) | `z.enum(PALETTE_KEYS)`                |

```ts
// libs/contracts/celebrations/src/schemas/section-content.schema.ts
export const sectionContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(SectionKindEnum.HERO),
    headline: z.string(),
    backgroundImage: imageRefSchema,
  }),
  z.object({
    type: z.literal(SectionKindEnum.MESSAGE),
    body: z.string(),
  }),
  // ...
]);
export type SectionContentDTO = z.infer<typeof sectionContentSchema>;
```

```ts
// libs/contracts/celebrations/src/schemas/enum.schemas.ts
export const celebrationStatusSchema = z.nativeEnum(CelebrationStatusEnum);
export type CelebrationStatusDTO = z.infer<typeof celebrationStatusSchema>;

export const celebrationKindSchema = z.nativeEnum(CelebrationKindEnum);
export type CelebrationKindDTO = z.infer<typeof celebrationKindSchema>;

export const paletteKeySchema = z.enum(PALETTE_KEYS);
export type PaletteKeyDTO = z.infer<typeof paletteKeySchema>;
```

Anti-pattern (do NOT do this):

```ts
// ❌ string literal instead of enum member
type: z.literal("hero");

// ❌ hand-written tuple as source of truth for a closed set
const STATUSES = ["draft", "published"] as const;
type Status = (typeof STATUSES)[number];

// ❌ hand-written interface mirroring a Zod schema (drifts)
export interface CreateCelebrationDTO {
  slug: string; /* ... */
}
```

### Where does the enum live?

The closed set might be local to one BC or shared across several. Pick the home by consumer count:

- **Single BC** (e.g. `CelebrationStatusEnum`, `SectionKindEnum`) → enum lives in that BC's `libs/contracts/<bc>/src/interfaces/`. Re-export from the package barrel.
- **Multiple BCs share the same closed set** (e.g. a generic `Region`, `Currency`, `Locale`, `PaletteKey` style primitive) → it belongs in `libs/shared` (cross-BC primitive). Contracts packages import it from `@acme/shared` and wrap it with `z.enum(SHARED_TUPLE)` or `z.nativeEnum(SharedEnum)`.
- **In doubt?** Start in the BC. Lift to `libs/shared` on the **second** consumer — never preemptively.
- **Web/api both need label vs wire value** (e.g. `"draft"` on the wire, `"Rascunho"` in the UI) → the enum value IS the wire string and stays in contracts. The label/translation map lives at the consumer (typically `apps/web`), never in the contracts package.

---

## DTO Triplet — input / output / read

Always: declare the schema, then derive the DTO type with `z.infer`.

### Input DTO — command

```ts
// libs/contracts/celebrations/src/dtos/create-celebration.dto.ts
import { z } from "zod";
import { celebrationKindSchema, paletteKeySchema } from "../schemas/enum.schemas";
import { slugSchema } from "../schemas/slug.schema";

export const createCelebrationDtoSchema = z.object({
  slug: slugSchema,
  kind: celebrationKindSchema,
  palette: paletteKeySchema,
  title: z.string().min(1),
  ownerId: z.string().min(1).nullish(),
});

export type CreateCelebrationDTO = z.infer<typeof createCelebrationDtoSchema>;
```

### Output DTO — response

```ts
// libs/contracts/celebrations/src/dtos/celebration-response.dto.ts
import { z } from "zod";
import {
  celebrationKindSchema,
  celebrationStatusSchema,
  paletteKeySchema,
} from "../schemas/enum.schemas";
import { slugSchema } from "../schemas/slug.schema";
import { sectionSchema } from "../schemas/section.schema";

export const celebrationResponseDtoSchema = z.object({
  slug: slugSchema,
  kind: celebrationKindSchema,
  palette: paletteKeySchema,
  title: z.string().min(1),
  status: celebrationStatusSchema,
  ownerId: z.string().min(1).nullable(),
  sections: z.array(sectionSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CelebrationResponseDTO = z.infer<typeof celebrationResponseDtoSchema>;
```

### Input DTO referencing a discriminated union

```ts
// libs/contracts/celebrations/src/dtos/section-input.dto.ts
import { z } from "zod";
import { sectionContentSchema } from "../schemas/section-content.schema";

export const sectionInputDtoSchema = z.object({
  content: sectionContentSchema,
});
export type SectionInputDTO = z.infer<typeof sectionInputDtoSchema>;

export const reorderSectionDtoSchema = z.object({
  newOrder: z.number().int().nonnegative(),
});
export type ReorderSectionDTO = z.infer<typeof reorderSectionDtoSchema>;
```

### Where enrichment happens

Signed URLs, formatted strings, expanded relations are mapped at the **api boundary** (`apps/api/src/<bc>/presentation/mappers/`), not in the DTO file. The DTO only declares the shape that crosses the wire.

---

## Pagination Contracts

Use the shared pagination primitives from `@acme/shared` for list endpoints — do not reinvent the shape inside a contracts package.

```ts
// Conceptual usage
export const findAllCelebrationsInputSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  status: celebrationStatusSchema.optional(),
});
export type FindAllCelebrationsInputDTO = z.infer<typeof findAllCelebrationsInputSchema>;

export type FindAllCelebrationsResponseDTO = {
  data: CelebrationListItemDTO[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
```

Keep `data` and `meta` separate. Never embed totals in the array.

---

## Naming Conventions

| Pattern                          | Example                      | When                                   |
| -------------------------------- | ---------------------------- | -------------------------------------- |
| `CreateXxxDTO`                   | `CreateCelebrationDTO`       | Create command input                   |
| `UpdateXxxDTO`                   | `UpdateCelebrationDTO`       | Update command input                   |
| `XxxResponseDTO`                 | `CelebrationResponseDTO`     | API response payload                   |
| `XxxFiltersDTO`                  | `CelebrationFiltersDTO`      | Query filters (may extend pagination)  |
| `XxxListItem` / `XxxListItemDTO` | `CelebrationListItemDTO`     | One item in a paginated list           |
| `XxxDTO`                         | `SectionContentDTO`          | Shared shape used across DTOs          |
| `XxxEnum`                        | `SectionKindEnum`            | String-backed TS enum for a closed set |
| `xxxSchema` / `xxxDtoSchema`     | `createCelebrationDtoSchema` | Zod schema bound to a DTO              |

---

## Boundaries

| Layer                                              | Responsibility                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `libs/contracts/<bc>/src/interfaces/`              | Pure TS types + `XxxEnum` definitions                             |
| `libs/contracts/<bc>/src/schemas/`                 | Zod 4 schemas; the validation source of truth                     |
| `libs/contracts/<bc>/src/dtos/`                    | DTO types paired with their schema (`z.infer`)                    |
| `apps/api/src/<bc>/presentation/mappers/`          | Map contract DTOs ↔ domain entities; enrich with signed URLs etc. |
| `apps/api/src/<bc>/presentation/<*>.controller.ts` | Validate via `ZodValidationPipe`, return contract DTOs            |
| `apps/web/...`                                     | Consume contract DTOs/schemas directly                            |

---

## Verification

A contracts change is a wire change. Run, in order:

```bash
pnpm --filter @acme/<bc>-contracts test
pnpm --filter @acme/<bc>-contracts build
pnpm --filter api typecheck && pnpm --filter api test
pnpm --filter web typecheck
```

Or, for cross-cutting confidence: `make check` from the repo root.

---

## Implementation Checklist

- [ ] DTO lives under `libs/contracts/<bc>/src/dtos/` — not inside `apps/api` or `apps/web`
- [ ] Schema declared first; DTO type derived via `z.infer`
- [ ] Every closed-set field references an `XxxEnum` (interfaces + schema)
- [ ] Discriminator branches use `z.literal(EnumName.MEMBER)`; full-set validators use `z.nativeEnum(EnumName)`
- [ ] Command input and response are separate DTOs (no field leakage)
- [ ] No `firebase-admin`, `@nestjs/*`, `next`, or `react` imports
- [ ] Paginated lists keep `data` and `meta` separate
- [ ] Enrichment (signed URLs, formatting, expansion) happens in `presentation/mappers/`, not in the DTO file
- [ ] Barrel `index.ts` re-exports the new file at each level
- [ ] `pnpm --filter @acme/<bc>-contracts build` succeeds and consumers (`api`, `web`) still typecheck
