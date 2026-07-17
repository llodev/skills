# TypeScript DDD Entity — Reference

## Decision Tree — Leaf Entity vs Aggregate Root

Pick the mutation style **before** writing `tryCreate`:

```
Does this entity own a collection that grows / shrinks / reorders at runtime?
│
├── NO  → Leaf entity (e.g. Product)
│        • Mutations return Result<T> via cloneWith({ field: newValue })
│        • Example: product.deactivate() → this.cloneWith({ status: ARCHIVED })
│        • Jump to → "Canonical Snippet" (leaf style at bottom) + cloneWith block
│
└── YES → Aggregate root with mutable children (e.g. Celebration ← Section[])
         • Private `_field` array + named domain methods (addSection / removeSection / reorder)
         • Each mutation calls this.touch() to bump updatedAt
         • Example: celebration.addSection(content)
         • Jump to → "Canonical Snippet — Entity with Enum Status, Owner FK, and Nested Children"
           and "Mutable Collection Pattern"
```

| Trait                               | Leaf entity                       | Aggregate root                              |
| ----------------------------------- | --------------------------------- | ------------------------------------------- |
| Owns a mutable collection?          | No                                | Yes (e.g. `Section[]`)                      |
| Mutation API                        | `cloneWith` returning `Result<T>` | named methods mutating `_field` + `touch()` |
| Identity stability across mutations | New instance per change           | Same instance, internal state evolves       |
| Example domain method               | `product.deactivate()`            | `celebration.addSection()`                  |

---

## Do NOT Load

Do not load `ts-ddd-repository` or `ts-ddd-use-case` references while implementing an entity. Invariants belong here; orchestration (find / save, transaction boundaries, calling other aggregates) belongs in the use case / repository skills. Loading them now pollutes context and tempts you to leak persistence concerns into the domain.

---

## Standard Structure

_When: setting up file layout for a new entity._

```
apps/api/src/<bc>/domain/entities/<name>.entity.ts        ← domain entity
apps/api/src/<bc>/domain/entities/index.ts                ← barrel
apps/api/test/<bc>/domain/entities/<name>.entity.test.ts  ← jest tests
libs/contracts/<bc>/src/interfaces/<closed-set>.ts        ← enums + type guards
libs/shared/src/{base,vo}/...                             ← Entity, Result, Id, Slug, PaletteKey, ImageRefValue
```

Real example paths:

- `apps/api/src/celebrations/domain/entities/celebration.entity.ts`
- `apps/api/src/celebrations/domain/entities/section.entity.ts`
- `apps/api/test/celebrations/domain/entities/celebration.entity.test.ts`
- `libs/contracts/celebrations/src/interfaces/celebration-status.ts`
- `libs/contracts/celebrations/src/interfaces/section-content.ts`

Imports you'll actually write:

```ts
import { Entity, type EntityProps, Id, PaletteKey, Result, Slug } from "@acme/shared";
import {
  CelebrationStatusEnum,
  SectionKindEnum,
  isCelebrationStatus,
  type CelebrationStatus,
  type SectionContent,
} from "@acme/celebrations-contracts";
```

Path aliases (`@celebrations/*`, `@shared/*`, `@/*`) are for cross-layer imports inside `apps/api`. **Never** import from `@ddd/shared` — that alias does not exist in this repo.

Base class API (`libs/shared/src/base/entity.ts`):

- `Entity<Type, Props>` — protected constructor; calls `Id.create(props.id!, { attribute: "id" })` and stamps `createdAt`/`updatedAt`/`deletedAt` automatically.
- `equals` / `notEquals` — compare by `id`.
- `cloneWith(overrides)` — deep-merges `structuredClone(this.props)` with `overrides`, then calls `(this.constructor as any).tryCreate(merged)`.

`Result` API (`libs/shared/src/base/result.ts`):

- `Result.ok(value?)`, `Result.fail("CODE")` or `Result.fail(["CODE_A", "CODE_B"])`.
- `result.isOk`, `result.isFailure`, `result.instance`, `result.errors`, `result.throwIfFailed()`, `result.withFail` (cast a failure to `Result<any>`).
- `Result.combine([r1, r2, ...])` — fail-fast aggregate.

---

## Enums for Closed-Set Fields

_When: validating any status / kind / layout / provider / palette field in `tryCreate` or comparing it inside a domain method._

Every status / kind / layout / provider / palette comes from a string-backed enum declared in the **contracts** package. Inside the entity:

1. Type guard validates the raw input (`isCelebrationStatus(props.status)`).
2. The entity stores the value typed as the union (`CelebrationStatus`).
3. Comparisons use enum members, never string literals.

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

Singleton / limit lookups reference enum members directly:

```ts
const SINGLETON_KINDS = [
  SectionKindEnum.HERO,
  SectionKindEnum.GALLERY,
  SectionKindEnum.SIGNATURE,
] as const;
```

In a domain method:

```ts
publish(): Result<void> {
  if (this._status === CelebrationStatusEnum.PUBLISHED) return Result.fail("ALREADY_PUBLISHED");
  this._status = CelebrationStatusEnum.PUBLISHED;
  this.touch();
  return Result.ok<void>(undefined);
}
```

A literal `"published"` anywhere in entity code is a bug.

---

## Canonical Snippet — Entity with Enum Status, Owner FK, and Nested Children

_When: building an aggregate root with mixed VO + type-guard validation and a nested-entity array._

This mirrors `celebration.entity.ts`. Two patterns sit side-by-side: a manual `errors[]` accumulator (needed when you have mixed VO + type-guard + numeric checks) and a private mutable collection updated by named methods.

```ts
import { Entity, type EntityProps, PaletteKey, Result, Slug } from "@acme/shared";
import {
  CelebrationStatusEnum,
  SectionKindEnum,
  isCelebrationKind,
  isCelebrationStatus,
  type CelebrationKind,
  type CelebrationStatus,
  type SectionContent,
} from "@acme/celebrations-contracts";
import { Section, type SectionProps } from "./section.entity";

export interface CelebrationProps extends EntityProps {
  slug: string;
  kind: string;
  palette: string;
  title: string;
  status: string;
  sections: SectionProps[];
  ownerId?: string | null;
}

const SINGLETON_KINDS = [
  SectionKindEnum.HERO,
  SectionKindEnum.GALLERY,
  SectionKindEnum.SIGNATURE,
] as const;

const LIMIT_CODE: Record<(typeof SINGLETON_KINDS)[number], string> = {
  [SectionKindEnum.HERO]: "HERO_LIMIT_EXCEEDED",
  [SectionKindEnum.GALLERY]: "GALLERY_LIMIT_EXCEEDED",
  [SectionKindEnum.SIGNATURE]: "SIGNATURE_LIMIT_EXCEEDED",
};

export class Celebration extends Entity<Celebration, CelebrationProps> {
  private _sections: Section[];
  private _slug: Slug;
  private _palette: PaletteKey;
  private _kind: CelebrationKind;
  private _status: CelebrationStatus;
  private _title: string;
  private _ownerId: string | null;

  private constructor(
    props: CelebrationProps,
    sections: Section[],
    slug: Slug,
    palette: PaletteKey,
    kind: CelebrationKind,
    status: CelebrationStatus,
    title: string,
    ownerId: string | null,
  ) {
    super(props);
    this._sections = sections;
    this._slug = slug;
    this._palette = palette;
    this._kind = kind;
    this._status = status;
    this._title = title;
    this._ownerId = ownerId;
  }

  public static tryCreate(props: CelebrationProps): Result<Celebration> {
    const slugResult = Slug.tryCreate(props.slug);
    const paletteResult = PaletteKey.tryCreate(props.palette);
    const title = typeof props.title === "string" ? props.title.trim() : "";
    const ownerId = props.ownerId === undefined ? null : props.ownerId;

    const errors: string[] = [];
    if (slugResult.isFailure) errors.push(...(slugResult.errors ?? []));
    if (paletteResult.isFailure) errors.push(...(paletteResult.errors ?? []));
    if (!isCelebrationKind(props.kind)) errors.push("INVALID_CELEBRATION_KIND");
    if (!isCelebrationStatus(props.status)) errors.push("INVALID_CELEBRATION_STATUS");
    if (!title) errors.push("INVALID_TITLE");
    if (ownerId !== null && (typeof ownerId !== "string" || ownerId.length === 0)) {
      errors.push("INVALID_OWNER_ID");
    }

    const sections: Section[] = [];
    for (const sp of props.sections ?? []) {
      const sr = Section.tryCreate(sp);
      if (sr.isFailure) errors.push(...(sr.errors ?? []));
      else sections.push(sr.instance);
    }

    sections.sort((a, b) => a.order - b.order);
    sections.forEach((s, i) => {
      if (s.order !== i) errors.push("INVALID_SECTION_SEQUENCE");
    });
    for (const kind of SINGLETON_KINDS) {
      if (sections.filter((s) => s.content.type === kind).length > 1) errors.push(LIMIT_CODE[kind]);
    }

    if (errors.length) return Result.fail(Array.from(new Set(errors)));

    return Result.ok(
      new Celebration(
        { ...props, title, ownerId },
        sections,
        slugResult.instance,
        paletteResult.instance,
        props.kind as CelebrationKind,
        props.status as CelebrationStatus,
        title,
        ownerId,
      ),
    );
  }

  public static create(props: CelebrationProps): Celebration {
    const r = Celebration.tryCreate(props);
    r.throwIfFailed();
    return r.instance;
  }

  get slug(): string {
    return this._slug.value;
  }
  get kind(): CelebrationKind {
    return this._kind;
  }
  get palette(): string {
    return this._palette.value;
  }
  get title(): string {
    return this._title;
  }
  get status(): CelebrationStatus {
    return this._status;
  }
  get sections(): readonly Section[] {
    return this._sections;
  }
  get ownerId(): string | null {
    return this._ownerId;
  }

  publish(): Result<void> {
    if (this._status === CelebrationStatusEnum.PUBLISHED) return Result.fail("ALREADY_PUBLISHED");
    this._status = CelebrationStatusEnum.PUBLISHED;
    this.touch();
    return Result.ok<void>(undefined);
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
```

---

## Two Validation Styles — Pick One Per Entity

_When: deciding how to aggregate field-level errors inside `tryCreate`._

**`Result.combine` (preferred when every check is a VO):**

```ts
const id = Id.tryCreate(props.id);
const name = Name.tryCreate(props.name, { attribute: "name" });
const sku = Sku.tryCreate(props.sku, { attribute: "sku" });
const categoryId = Id.required(props.categoryId, { attribute: "categoryId" });

const attrs = Result.combine([id, name, sku, categoryId]);
if (attrs.isFailure) return Result.fail(attrs.errors!);
```

**Manual `errors[]` accumulator (used when you mix VOs, enum guards, numeric / shape checks, nested-entity loops):** see `celebration.entity.ts` above. Always `Array.from(new Set(errors))` before failing, to avoid duplicate codes.

---

## Mutable Collection Pattern (children inside an aggregate)

_When: aggregate root mutating an owned array (add / remove / reorder children)._

When an entity owns a collection that grows / shrinks (e.g. `Section[]` inside `Celebration`), don't reach for `cloneWith` per mutation — keep a private array field and mutate via named methods that update `_field` and call `touch()`:

```ts
addSection(content: SectionContent): Result<Section> {
  if (SINGLETON_KINDS.includes(content.type as (typeof SINGLETON_KINDS)[number])) {
    if (this._sections.some((s) => s.content.type === content.type)) {
      return Result.fail(LIMIT_CODE[content.type as (typeof SINGLETON_KINDS)[number]]);
    }
  }
  const order = this._sections.length;
  const newSection = Section.tryCreate({ order, content });
  if (newSection.isFailure) return newSection.withFail;
  this._sections.push(newSection.instance);
  this.touch();
  return newSection;
}
```

For leaf-entity field updates (no internal collection), prefer `cloneWith`:

```ts
deactivate(): Result<Product> {
  return this.cloneWith({ status: ProductStatusEnum.ARCHIVED });
}
```

---

## `Id` Helpers

_When: validating the entity's own `id` or any FK reference (`ownerId`, `categoryId`, …)._

| Use case                             | Method                                                                                                                                    | Behaviour                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Own entity `id`                      | Let the `Entity` base call `Id.create(props.id!)`, or pre-validate with `Id.tryCreate(props.id)` if you want the error inside `tryCreate` | Generates UUID v4 when undefined; validates format otherwise |
| Required FK (`categoryId`, `userId`) | `Id.required(value, { attribute: "categoryId" })`                                                                                         | Fails on missing / blank / malformed                         |

---

## Snapshot for Persistence

_When: infra adapter (Firestore, Memory) or a DTO mapper needs the raw serializable shape._

When an infra adapter needs the raw shape (Firestore document, DTO mapper), expose a deliberate snapshot — never hand callers `this.props`:

```ts
toSnapshot(): CelebrationProps {
  return {
    ...this.props,
    slug: this._slug.value,
    kind: this._kind,
    palette: this._palette.value,
    title: this._title,
    status: this._status,
    ownerId: this._ownerId,
    sections: this._sections.map((s) => ({
      id: s.id,
      order: s.order,
      content: s.content,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  };
}
```

---

## Implementation Checklist

_When: about to mark the entity as done — walk this list before opening a PR._

- [ ] File at `apps/api/src/<bc>/domain/entities/<name>.entity.ts`, re-exported from sibling `index.ts`.
- [ ] `XxxProps extends EntityProps` declared in the same file.
- [ ] Class extends `Entity<Xxx, XxxProps>` with `private`/`protected` constructor.
- [ ] Every closed-set field uses a contracts-package enum + type guard; no string literals.
- [ ] `tryCreate(props): Result<Xxx>` validates all fields (`Result.combine` or `errors[]`).
- [ ] `create(props): Xxx` delegates to `tryCreate` + `throwIfFailed`.
- [ ] Own `id` handled by `Id.tryCreate` or by the base; FKs validated with `Id.required`.
- [ ] Normalized values spread into the props passed to `new Xxx(...)`.
- [ ] Arrays / nested children validated element-by-element, errors deduplicated before failing.
- [ ] Getters expose typed domain values; no public field, no public setter, no leaking `this.props`.
- [ ] State changes go through named domain methods (`publish`, `addSection`, `deactivate`); use `cloneWith` for immutable updates, mutable `_field` + `touch()` for owned collections.
- [ ] Optional `toSnapshot()` for persistence layers.

---

## Test Strategy

_When: writing or extending `*.entity.test.ts` for a domain entity._

Tests live at `apps/api/test/<bc>/domain/entities/<name>.entity.test.ts` and import via the path alias barrel (`@celebrations/domain/entities`). Run with `pnpm --filter api test`. Always import enums in fixtures — never type a string literal.

```ts
import { Celebration, type CelebrationProps } from "@celebrations/domain/entities";
import {
  CelebrationStatusEnum,
  SectionKindEnum,
  type SectionContent,
} from "@acme/celebrations-contracts";

const heroContent: SectionContent = {
  type: SectionKindEnum.HERO,
  headline: "Mãezinha",
  backgroundImage: { storagePath: "celebrations/mae/hero.jpg", alt: "hero" },
};

function validProps(overrides: Partial<CelebrationProps> = {}): CelebrationProps {
  return {
    id: "02f7c001-8e36-4f9a-bf9a-1a2b3c4d5e6f",
    slug: "mae",
    kind: "mothers-day",
    palette: "bordo",
    title: "Para a Mãezinha",
    status: CelebrationStatusEnum.DRAFT,
    sections: [],
    ...overrides,
  };
}

describe("Celebration.publish", () => {
  it("transitions draft → published", () => {
    const c = Celebration.tryCreate(validProps()).instance;
    const r = c.publish();
    expect(r.isOk).toBe(true);
    expect(c.status).toBe(CelebrationStatusEnum.PUBLISHED);
  });

  it("rejects re-publishing", () => {
    const c = Celebration.tryCreate(
      validProps({ status: CelebrationStatusEnum.PUBLISHED }),
    ).instance;
    const r = c.publish();
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("ALREADY_PUBLISHED");
  });
});
```

Coverage you must include for every entity:

- valid create (with and without an explicit `id`)
- each invalid field path returns the expected `errors[]` code
- `equals` true for same id, false for different ids
- every domain method: happy path + each rejection branch
- `cloneWith` re-validates (when used) — assert failure on invalid override
- `toSnapshot` round-trip (when defined)

---

## Common Pitfalls

_When: debugging a failing entity test or reviewing a PR for the patterns most often violated._

| Mistake                                                   | Why it breaks                        | Fix                                                    |
| --------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `import { Entity } from "@ddd/shared"`                    | Alias doesn't exist in this repo     | `@acme/shared`                                         |
| `if (status === "published")`                             | Magic string drifts from the enum    | `status === CelebrationStatusEnum.PUBLISHED`           |
| `status: "draft"` in a fixture                            | Same drift risk in tests             | `status: CelebrationStatusEnum.DRAFT`                  |
| `new Product({ ...props, name: props.name })`             | Stores raw input                     | `name: nameVo.instance.value`                          |
| `product.name = "new"`                                    | Bypasses invariants                  | named domain method (`cloneWith` or mutate + `touch`)  |
| Skipping per-element validation on an array               | Silent partial failure               | loop + push to `errors[]` or per-item `Result.combine` |
| Setting `createdAt` / `updatedAt` inside `tryCreate`      | Base constructor already stamps them | drop the fields; use `this.touch()` for updates        |
| Calling `this.tryCreate(...)` from inside a domain method | Duplicates what `cloneWith` does     | `return this.cloneWith({ ...overrides })`              |
| Returning `this.props` to a caller                        | Leaks mutable internal state         | expose typed getters or a `toSnapshot()` method        |
| Pushing the same error twice across nested loops          | Noisy test assertions                | `Result.fail(Array.from(new Set(errors)))`             |
