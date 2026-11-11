---
name: ts-ddd-value-object
description: >-
  Create, review, or guide Value Object implementation in a TypeScript + DDD
  codebase. Use when the request involves 'value object', 'VO', `*.vo.ts` files
  (either in a shared kernel package such as `libs/shared/src/vo/...` or
  BC-local at `src/<bc>/domain/value-objects/...`), domain attribute
  validation/normalization, closed-set VOs derived from string enums
  (PaletteKey-style), composite-value VOs (ImageRef-style), `ValueObject` +
  `Result` pattern, `ValueObjectConfig`, `tryCreate`/`create` dual API, or VO
  test coverage.
metadata:
  version: 0.2.0
---

# TypeScript DDD Value Object

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/vo-pattern.md`](references/vo-pattern.md) completely.
**Do NOT load** other DDD skills (entity, use-case) unless explicitly requested.

---

## Where VOs live

Example layout for a monorepo with a shared kernel package (`libs/shared`, published as `@acme/shared`) and an API package (paths relative to its root). Package names and paths are examples; adapt them to your project.

| Scope                               | Path                                         | Import from                                         | Tests                                              |
| ----------------------------------- | -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Shared, cross-BC primitive          | `libs/shared/src/vo/<name>.vo.ts`            | `../base` (inside lib) / `@acme/shared` (consumers) | `libs/shared/test/vo/<name>.vo.test.ts`            |
| BC-local (one bounded context only) | `src/<bc>/domain/value-objects/<name>.vo.ts` | `@acme/shared`                                      | `test/<bc>/domain/value-objects/<name>.vo.test.ts` |

- Add a new shared VO to the shared kernel's VO barrel (e.g. `libs/shared/src/vo/index.ts`).
- Inside the shared kernel package always import the base via the relative `../base` barrel — not via `@acme/shared` (self-import).
- BC-local VOs live in the API package because the shared kernel must stay framework- and BC-vocabulary-free.
- After a shared change, rebuild the shared kernel package and run the consumers' typecheck and tests (e.g. `pnpm --filter @acme/shared build`, then `pnpm --filter <api-package> typecheck && pnpm --filter <api-package> test`).

---

## Before You Start

Answer first:

- **Reuse or create?** Can `Text` (with `minLength`/`maxLength`) or `Number` (with `minValue`/`maxValue`) cover this through config? Then no new VO — just call `Text.tryCreate(v, { minLength: 2, maxLength: 50 })` inside the entity.
- **Closed set of allowed values?** (e.g. palette key, kind, status, provider, layout). Then it is an **enum-backed VO** — see "Closed-set VOs use enums" below. Never represent a closed set as a raw-string `as const` tuple.
- **Shape**: scalar string/number/Date, or **composite object** (like `ImageRef`)? Composite VOs collect errors and return `Result.fail(string[])` instead of throwing.
- **Subclassable?** Will other VOs extend this? → `protected` constructor. Leaves → `private`.
- **Config**: are constraints fixed or caller-configurable? → extend `ValueObjectConfig` with a typed interface.
- **Normalization**: trim, lowercase, strip accents? → always normalize **before** validating, inside `tryCreate`.

---

## Constructor Visibility Decision

| VO intent                                     | Constructor               | Reason                                        |
| --------------------------------------------- | ------------------------- | --------------------------------------------- |
| Leaf VO — no subclasses needed                | `private`                 | Prevents unintended extension                 |
| Base VO — other VOs extend it                 | `protected`               | Subclasses call `super(value, config)`        |
| Specialization — inherits error constant only | `protected` (from parent) | Uses parent's `tryCreate`, overrides constant |

`Text` and `Id` both use `protected` — anything that might need specialization should too. `Slug`, `PaletteKey`, `ImageRef`, `DotSeparatedName`, `Number` are leaves and use `private`.

---

## Closed-set VOs use enums (mandatory)

Every closed set of allowed values is a **string-backed TS enum**; the catalog tuple and the VO's stored type are **derived** from the enum. Never declare the set as a raw-string `as const` tuple, and never compare against string literals at call sites.

```typescript
// <shared kernel>/src/vo/palette-key.vo.ts
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

Call sites always compare via the enum:

```typescript
if (palette.value === PaletteKeyEnum.BORDO) { ... }     // OK
if (palette.value === "bordo") { ... }                  // FORBIDDEN
```

> If an existing closed-set VO still uses the older `PALETTE_KEYS as const` form, leave it working but migrate it when it is next touched. New closed-set VOs **must** follow the enum pattern above.

---

## Config Pattern

When constraints are caller-configurable, define a typed config interface:

```typescript
import { Result, ValueObject, ValueObjectConfig } from "../base";

export interface MyVoConfig extends ValueObjectConfig {
  minLength?: number;
  maxLength?: number;
}

export class MyVo extends ValueObject<string, MyVoConfig> { ... }
```

Never pass raw `ValueObjectConfig` when your VO has domain-specific constraints — the type information is lost and callers can't discover options.

---

## Core Rules

- Error codes are `private`/`protected static readonly` string constants — never inline strings in `throw`/`Result.fail`.
- Always normalize (trim, lowercase, NFD-strip accents) **before** checking invariants inside `tryCreate`.
- `create(value)` is a thin wrapper: call `tryCreate` → `throwIfFailed()` → return `.instance`. No logic there.
- Scalar VOs may use `try/catch` + `Result.fail(error.message)`. Composite VOs (object value) collect errors into an array and `return Result.fail(errors)` — see `ImageRef`.
- Closed-set VO → enum + `Object.values` + `(typeof Enum)[keyof typeof Enum]`. No `as const` tuples for new VOs.
- Expose extra static methods (e.g. `normalize()`, `fromName()`, `withRandomSuffix()`, `required()`) only when callers genuinely need them.

## NEVER

- **NEVER** use a `private` constructor on a VO designed to be extended — subclass `super()` will break at runtime.
- **NEVER** inline error strings in `throw new Error("INVALID_X")` or `Result.fail("INVALID_X")` — always reference a static constant.
- **NEVER** validate before normalizing — `" Email@Example.com "` must become `"email@example.com"` before the regex runs.
- **NEVER** skip the `typeof + isNaN` double guard on numeric VOs — `typeof NaN === 'number'` is `true`.
- **NEVER** model a closed value set as `["a", "b"] as const` in a new VO — use a string enum + `Object.values`.
- **NEVER** compare a VO's value against a string literal at the call site — compare against the enum member.
- **NEVER** duplicate a VO that `Text` or `Number` already covers via config — prefer `Text.tryCreate(v, { minLength: 2, maxLength: 50 })`.
- **NEVER** import a shared VO via `@acme/shared` from inside the shared kernel package itself — use the relative `../base` barrel.

## References

See [`references/vo-pattern.md`](references/vo-pattern.md) for: example file paths, annotated code for each VO flavor (simple, parametric, numeric, canonical-form, closed-set/enum, composite, ID with `required()`), the import rules per scope, and the test coverage checklist.

See [`examples/`](examples/) for a normalizing scalar VO (`slug.vo.ts`), a closed-set enum-backed VO (`palette-key.vo.ts`) with its test file (`palette-key.vo.test.ts`), and a **BC-local** numeric VO for a sample `celebrations` bounded context, placed under `src/celebrations/domain/value-objects/` (`celebration-slot-index.vo.ts` + `celebration-slot-index.vo.test.ts`) demonstrating the dual API, config overrides, and the BC-local path placement rule.
