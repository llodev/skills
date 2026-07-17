# TypeScript DDD Value Object — Reference

## Standard Structure (this monorepo)

| Scope                      | Source path                                           | Test path                                                   | Import (consumers)     |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| Shared, cross-BC primitive | `libs/shared/src/vo/<name>.vo.ts`                     | `libs/shared/test/vo/<name>.vo.test.ts`                     | `@acme/shared`         |
| BC-local (single BC only)  | `apps/api/src/<bc>/domain/value-objects/<name>.vo.ts` | `apps/api/test/<bc>/domain/value-objects/<name>.vo.test.ts` | `@acme/shared` + local |

Conventions:

- Filenames are `kebab-case.vo.ts`.
- Inside `libs/shared/src/vo/*` import the base via `../base` (relative). Do **not** self-import `@acme/shared`.
- Inside `apps/api/src/<bc>/domain/value-objects/*` import the base via `@acme/shared`.
- Add new shared VOs to `libs/shared/src/vo/index.ts`.
- BC-local VOs are exported through the BC's own `domain/value-objects/index.ts` barrel.

### Shared vs BC-local VOs — when each belongs

Project rule (from `CLAUDE.md`): _"New primitive must be reusable across ≥ 2 BCs; otherwise it belongs in the BC's `domain/` or its contracts package."_

| Signal                                                                     | Decision                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| The concept appears (or plausibly will appear) in ≥ 2 BCs                  | **Shared** — `libs/shared/src/vo/<name>.vo.ts`                       |
| The vocabulary is BC-specific (e.g. `CelebrationSlotIndex`, `CampaignTag`) | **BC-local** — `apps/api/src/<bc>/domain/value-objects/<name>.vo.ts` |
| It mixes a shared shape with a BC-specific catalog                         | Keep the shared base in `libs/shared`; specialize in the BC          |

Why the rule matters:

- `libs/shared` must stay **framework-free and BC-vocabulary-free**. A celebrations-only VO sitting there pollutes the cross-BC layer and silently invites other BCs to couple to celebrations terms.
- BC-local VOs still import `ValueObject` + `Result` from `@acme/shared` — the **base classes** are shared; the **concept** is not.
- Promote a BC-local VO to shared only when a second BC genuinely needs it; at that point, strip the original BC's vocabulary first.

See [`examples/celebration-slot-index.vo.ts`](../examples/celebration-slot-index.vo.ts) + its [test file](../examples/celebration-slot-index.vo.test.ts) for the BC-local shape (numeric VO with a typed config, base imported from `@acme/shared`, paired test under `apps/api/test/<bc>/domain/value-objects/`).

## Base Classes (`@acme/shared`)

- `ValueObject<T, Config>` — base class; exposes `readonly value: T`, `readonly config?: Config`, `equals`, `notEquals`.
- `ValueObjectConfig` — empty marker interface; extend for domain-specific constraints.
- `Result<T>` — `Result.ok(value)` / `Result.fail(string | string[])` / `result.isOk` / `result.isFailure` / `result.instance` / `result.errors` / `result.throwIfFailed()` / `result.withFail` / `Result.combine([...])`.

Base signature (`libs/shared/src/base/vo.ts`):

```typescript
export abstract class ValueObject<T, Config extends ValueObjectConfig> {
  constructor(
    readonly value: T,
    readonly config?: Config,
  ) {}
  equals(vo: ValueObject<T, Config>): boolean {
    return this.value === vo.value;
  }
  notEquals(vo: ValueObject<T, Config>): boolean {
    return !this.equals(vo);
  }
}
```

---

## VO Type Catalogue

### 1. Simple string VO (leaf)

Validates a single constraint with a fixed rule. Constructor `private` — not designed for extension.

```typescript
// libs/shared/src/vo/alias.vo.ts
import { Result, ValueObject, ValueObjectConfig } from "../base";

export class Alias extends ValueObject<string, ValueObjectConfig> {
  private static readonly INVALID_ALIAS = "INVALID_ALIAS";

  private constructor(value: string, config?: ValueObjectConfig) {
    super(value, config);
  }

  public static create(value: string, config?: ValueObjectConfig): Alias {
    const result = Alias.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  public static tryCreate(value: string, config?: ValueObjectConfig): Result<Alias> {
    try {
      const normalized = value?.trim().toLowerCase() ?? "";
      if (!normalized || !/^[a-z0-9_-]+$/.test(normalized)) {
        throw new Error(Alias.INVALID_ALIAS);
      }
      return Result.ok(new Alias(normalized, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
```

---

### 2. Parametric string VO (subclassable)

Constraints are caller-configurable via typed `Config`. Constructor `protected` to allow specialization. This is the shape of `Text` (`libs/shared/src/vo/text.vo.ts`).

```typescript
import { Result, ValueObject, ValueObjectConfig } from "../base";

export interface NameConfig extends ValueObjectConfig {
  minLength?: number;
  maxLength?: number;
}

export class Name extends ValueObject<string, NameConfig> {
  protected static readonly TOO_SHORT = "NAME_TOO_SHORT";
  protected static readonly TOO_LONG = "NAME_TOO_LONG";
  protected static readonly DEFAULT_MIN = 2;
  protected static readonly DEFAULT_MAX = 100;

  protected constructor(value: string, config?: NameConfig) {
    super(value, config);
  }

  public static create(value: string, config?: NameConfig): Name {
    const result = Name.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  public static tryCreate(value: string, config?: NameConfig): Result<Name> {
    try {
      const normalized = value?.trim() ?? "";
      const min = config?.minLength ?? Name.DEFAULT_MIN;
      const max = config?.maxLength ?? Name.DEFAULT_MAX;
      if (normalized.length < min) throw new Error(Name.TOO_SHORT);
      if (normalized.length > max) throw new Error(Name.TOO_LONG);
      return Result.ok(new Name(normalized, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
```

---

### 3. Numeric VO

Must guard both `typeof` **and** `isNaN` — `typeof NaN === 'number'` is `true`. Mirrors `Number` (`libs/shared/src/vo/number.vo.ts`).

```typescript
import { Result, ValueObject, ValueObjectConfig } from "../base";

export interface PriceConfig extends ValueObjectConfig {
  minValue?: number;
  maxValue?: number;
}

export class Price extends ValueObject<number, PriceConfig> {
  private static readonly INVALID_PRICE = "INVALID_PRICE";
  private static readonly TOO_SMALL = "PRICE_TOO_SMALL";
  private static readonly TOO_LARGE = "PRICE_TOO_LARGE";

  private constructor(value: number, config?: PriceConfig) {
    super(value, config);
  }

  public static create(value: number, config?: PriceConfig): Price {
    const result = Price.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  public static tryCreate(value: number, config?: PriceConfig): Result<Price> {
    try {
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(Price.INVALID_PRICE);
      }
      if (config?.minValue !== undefined && value < config.minValue) {
        throw new Error(Price.TOO_SMALL);
      }
      if (config?.maxValue !== undefined && value > config.maxValue) {
        throw new Error(Price.TOO_LARGE);
      }
      return Result.ok(new Price(value, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
```

---

### 4. Canonical-form VO (normalize then validate)

When the stored value must always be in a canonical form, extract normalization into a public static method. `Slug` (`libs/shared/src/vo/slug.vo.ts`) and `DotSeparatedName` follow this shape; `Slug` also exposes derived factories `fromName` and `withRandomSuffix`.

```typescript
import { Result, ValueObject, ValueObjectConfig } from "../base";

export class Email extends ValueObject<string, ValueObjectConfig> {
  private static readonly INVALID_EMAIL = "INVALID_EMAIL";

  private constructor(value: string, config?: ValueObjectConfig) {
    super(value, config);
  }

  static normalize(raw: string): string {
    return raw?.trim().toLowerCase() ?? "";
  }

  public static create(value: string, config?: ValueObjectConfig): Email {
    const result = Email.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  public static tryCreate(value: string, config?: ValueObjectConfig): Result<Email> {
    try {
      const normalized = Email.normalize(value);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalized)) {
        throw new Error(Email.INVALID_EMAIL);
      }
      return Result.ok(new Email(normalized, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }

  get local(): string {
    return this.value.split("@")[0];
  }
  get domain(): string {
    return this.value.split("@")[1];
  }
}
```

Rule: `normalize()` runs first, then validation runs on the normalized form — never on the raw input.

---

### 5. Closed-set VOs use enums (mandatory)

Every closed set of allowed values (palette key, kind, status, provider, layout) is a **string-backed TS enum**; the catalog tuple and the VO's stored type are **derived** from the enum. Never declare the set as a raw-string `as const` tuple, and never compare against string literals at call sites.

```typescript
// libs/shared/src/vo/palette-key.vo.ts
import { Result, ValueObject, ValueObjectConfig } from "../base";

export enum PaletteKeyEnum {
  BORDO = "bordo",
  ROSE = "rose",
}
export const PALETTE_KEYS = Object.values(PaletteKeyEnum);
export type PaletteKey = (typeof PaletteKeyEnum)[keyof typeof PaletteKeyEnum];

export class PaletteKeyVO extends ValueObject<PaletteKey, ValueObjectConfig> {
  private static readonly INVALID_PALETTE_KEY = "INVALID_PALETTE_KEY";

  private constructor(value: PaletteKey, config?: ValueObjectConfig) {
    super(value, config);
  }

  public static create(value: string, config?: ValueObjectConfig): PaletteKeyVO {
    const r = PaletteKeyVO.tryCreate(value, config);
    r.throwIfFailed();
    return r.instance;
  }

  public static tryCreate(value: string, config?: ValueObjectConfig): Result<PaletteKeyVO> {
    if (typeof value !== "string" || !PALETTE_KEYS.includes(value as PaletteKey)) {
      return Result.fail(PaletteKeyVO.INVALID_PALETTE_KEY);
    }
    return Result.ok(new PaletteKeyVO(value as PaletteKey, config));
  }
}
```

Call sites:

```typescript
if (palette.value === PaletteKeyEnum.BORDO) { ... } // OK
if (palette.value === "bordo") { ... }              // FORBIDDEN
```

Why enum instead of `as const`:

- One source of truth for both the runtime catalog (`Object.values`) and the type (`(typeof Enum)[keyof typeof Enum]`).
- Refactor-safe: rename the enum member and IDEs propagate to every comparison; renaming a string literal at one site silently leaves stale literals at others.
- The PT-BR product copy stays decoupled from the English identifier — UI maps the enum key to a label; persistence stores the enum value.

> The live `libs/shared/src/vo/palette-key.vo.ts` is currently on the older `as const` form (`PALETTE_KEYS = ["bordo"] as const`). It works, but new closed-set VOs **must** follow the enum pattern above; migrate `PaletteKey` the next time it is touched.

---

### 6. Composite-value VO (object value, error collection)

When the VO's value is an object, collect all failures into an array and return `Result.fail(errors)` — no `try/catch`. Mirrors `ImageRef` (`libs/shared/src/vo/image-ref.vo.ts`).

```typescript
import { Result, ValueObject, ValueObjectConfig } from "../base";

export interface ImageRefValue {
  storagePath: string;
  alt: string;
  width?: number;
  height?: number;
}

export class ImageRef extends ValueObject<ImageRefValue, ValueObjectConfig> {
  private static readonly INVALID_PATH = "INVALID_IMAGE_REF_PATH";
  private static readonly INVALID_ALT = "INVALID_IMAGE_REF_ALT";
  private static readonly INVALID_DIMENSIONS = "INVALID_IMAGE_REF_DIMENSIONS";

  private constructor(value: ImageRefValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  public static create(value: ImageRefValue, config?: ValueObjectConfig): ImageRef {
    const r = ImageRef.tryCreate(value, config);
    r.throwIfFailed();
    return r.instance;
  }

  public static tryCreate(value: ImageRefValue, config?: ValueObjectConfig): Result<ImageRef> {
    const errors: string[] = [];
    const storagePath = typeof value?.storagePath === "string" ? value.storagePath.trim() : "";
    const alt = typeof value?.alt === "string" ? value.alt.trim() : "";

    if (!storagePath) errors.push(ImageRef.INVALID_PATH);
    if (!alt) errors.push(ImageRef.INVALID_ALT);
    if (value?.width !== undefined && !ImageRef.isPositiveInt(value.width)) {
      errors.push(ImageRef.INVALID_DIMENSIONS);
    }
    if (value?.height !== undefined && !ImageRef.isPositiveInt(value.height)) {
      errors.push(ImageRef.INVALID_DIMENSIONS);
    }
    if (errors.length) return Result.fail(errors);

    return Result.ok(
      new ImageRef({ storagePath, alt, width: value.width, height: value.height }, config),
    );
  }

  private static isPositiveInt(n: unknown): boolean {
    return typeof n === "number" && Number.isInteger(n) && n > 0;
  }
}
```

---

### 7. ID VO with auto-generation and `required()`

`Id.tryCreate(value?)` generates a UUID v4 when the value is empty. `Id.required(value)` fails explicitly on blank — use it for foreign-key fields. From `libs/shared/src/vo/id.vo.ts`.

```typescript
// In an entity tryCreate:
const id = Id.tryCreate(props.id); // own id — generates UUID if absent
const categoryId = Id.required(props.categoryId); // required FK — fails if blank
```

---

### 8. Custom rule VO (fallback — none of the above fit)

When the invariant is neither length/range nor a closed set nor a composite — e.g. an arbitrary regex, a checksum, a structural rule — keep the same skeleton: extend `ValueObject<TValue, ValueObjectConfig>` from `@acme/shared`, validate via a custom predicate inside `tryCreate`, and return `Result.fail("INVALID_<NAME>")` on failure.

```typescript
import { Result, ValueObject, ValueObjectConfig } from "@acme/shared";

export class IsoCountryCode extends ValueObject<string, ValueObjectConfig> {
  private static readonly INVALID_ISO_COUNTRY_CODE = "INVALID_ISO_COUNTRY_CODE";
  private static readonly PATTERN = /^[A-Z]{2}$/; // ISO 3166-1 alpha-2

  private constructor(value: string, config?: ValueObjectConfig) {
    super(value, config);
  }

  public static create(value: string, config?: ValueObjectConfig): IsoCountryCode {
    const r = IsoCountryCode.tryCreate(value, config);
    r.throwIfFailed();
    return r.instance;
  }

  public static tryCreate(value: string, config?: ValueObjectConfig): Result<IsoCountryCode> {
    const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (!IsoCountryCode.PATTERN.test(normalized)) {
      return Result.fail(IsoCountryCode.INVALID_ISO_COUNTRY_CODE);
    }
    return Result.ok(new IsoCountryCode(normalized, config));
  }
}
```

Use this fallback only after ruling out `Text`/`Number` config, the closed-set enum pattern, and the composite pattern — those cover the common cases.

---

## When to reuse vs. create a new VO

| Situation                                                            | Decision                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Bounded string field in an entity                                    | Use `Text.tryCreate(v, { minLength, maxLength })` directly — no new VO |
| Bounded numeric field                                                | Use `Number.tryCreate(v, { minValue, maxValue })` directly             |
| Closed set of allowed values                                         | Enum-backed VO (Section 5)                                             |
| Composite object value (multiple fields validated together)          | Composite VO with error array (Section 6)                              |
| Canonical normalization (lowercase, NFD-strip, kebab/dotcase)        | Canonical-form VO with `normalize()` (Section 4)                       |
| Arbitrary regex / checksum / structural rule (no other section fits) | Custom rule VO (Section 8)                                             |
| Concept shared by multiple BCs                                       | Put it in `libs/shared/src/vo/`                                        |
| Concept meaningful only inside one BC                                | Put it in `apps/api/src/<bc>/domain/value-objects/`                    |
| Multiple VOs share the same constraint structure                     | Create a base VO with `protected` constructor                          |

---

## Common Pitfalls

- **`as const` for closed sets** — switch to a string enum (Section 5). New VOs must not introduce another `["a", "b"] as const`.
- **String-literal comparisons at call sites** — `value === "bordo"` instead of `value === PaletteKeyEnum.BORDO`. Always compare against an enum member.
- **Validation before normalization** — regex on raw `" Email@Example.com "` will reject valid input. Normalize first.
- **Numeric VO missing `isNaN`** — `typeof NaN === 'number'` is `true`; both guards are required.
- **Inline error strings** — `throw new Error("INVALID_X")` blocks discovery. Always reference a `private static readonly` constant.
- **`private` constructor on a base VO** — subclasses can't call `super()`. Anything that may be extended is `protected`.
- **Self-import inside `libs/shared`** — `import { Result } from "@acme/shared"` from within `libs/shared/src/vo/*` creates a cycle/build issue. Use `../base`.
- **Forgetting `index.ts`** — a new VO under `libs/shared/src/vo/` must be re-exported from `libs/shared/src/vo/index.ts` (and the base barrel re-exports it).
- **Duplicating `Text`/`Number`** — if all the constraints boil down to length/min-max, configure `Text`/`Number` instead of cloning them.

---

## Test Coverage Checklist

Tests live in `libs/shared/test/vo/<name>.vo.test.ts` (or the BC-local mirror under `apps/api/test/<bc>/domain/value-objects/`). Run with `pnpm --filter @acme/shared test`. After changing a shared VO, also run `pnpm --filter api typecheck && pnpm --filter api test`.

```typescript
import { MyVo } from "../../src";

describe("MyVo", () => {
  it("creates with valid input", () => {
    const r = MyVo.tryCreate("valid");
    expect(r.isOk).toBe(true);
    if (r.isFailure) return;
    expect(r.instance.value).toBe("valid");
  });

  it("normalizes input before storing", () => {
    const r = MyVo.tryCreate("  VALID  ");
    expect(r.isOk).toBe(true);
    if (r.isFailure) return;
    expect(r.instance.value).toBe("valid");
  });

  it("fails when input is empty", () => {
    const r = MyVo.tryCreate("");
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("INVALID_MY_VO");
  });

  it("create() throws on invalid input", () => {
    expect(() => MyVo.create("")).toThrow();
  });
});
```

| Scenario                | What to assert                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Valid input             | `isOk`, `instance.value` equals the **normalized** form                                            |
| Each invalid case       | `isFailure`, `errors` contains the specific error constant                                         |
| `create()` with invalid | `.toThrow()`                                                                                       |
| Normalization           | Input differs from stored `value` by the expected transform                                        |
| Config boundaries       | Test both sides of min/max limits                                                                  |
| Closed-set / enum VO    | Iterate `Object.values(MyEnum)` for happy path; assert membership via the enum, not string literal |
| Composite VO            | Multiple invalid fields → `errors` contains every triggered constant in one `Result`               |
| Derived getters         | Correct decomposition of normalized value (e.g. `Email.local`, `Email.domain`)                     |
