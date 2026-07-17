# TypeScript DDD Domain Service — Reference

## Is this a Domain Service or an Application Service?

Walk these three questions **in order**. Stop at the first YES.

1. **Q1 — Does the logic need a repository, storage, HTTP call, or any other I/O?**
   - **YES →** Application Service. Put it in `apps/api/src/<bc>/application/services/<name>.service.ts`, mark `@Injectable()`, inject ports via DI. **Not** a domain service. Stop here.
   - **NO →** continue to Q2.

2. **Q2 — Does the logic cross multiple entities/VOs and encode a rule the entity itself can't own (because the rule needs more than one aggregate)?**
   - **YES →** Domain Service. Put it in `apps/api/src/<bc>/domain/services/<name>.service.ts` as a pure class (static methods preferred). Continue reading this reference.
   - **NO →** continue to Q3.

3. **Q3 — Is the rule a single-aggregate invariant?**
   - **YES →** it belongs **inside the entity** (`*.entity.ts`) as a method + `cloneWith`, not as a separate service. See the `ts-ddd-entity` skill. Do not create a service file.

Visual flow:

```
I/O needed? ──YES──▶ application/services/  (Application Service, @Injectable)
     │
     NO
     ▼
Crosses 2+ aggregates? ──YES──▶ domain/services/  (Domain Service, pure)
     │
     NO
     ▼
Single-aggregate rule ──────▶ entity method + cloneWith  (see ts-ddd-entity)
```

---

## Standard Structure

```
apps/api/src/<bc>/domain/services/<name>.service.ts          ← pure Domain Service
apps/api/src/<bc>/domain/services/index.ts                   ← barrel — re-export
apps/api/test/<bc>/domain/services/<name>.test.ts            ← Jest test, no DI
```

Concrete BC example (`<bc>` = `celebrations`):

```
apps/api/src/celebrations/domain/services/celebration-publishing.policy.ts
apps/api/src/celebrations/domain/services/index.ts
apps/api/test/celebrations/domain/services/celebration-publishing.policy.test.ts
```

**Never** place a Domain Service in:

- `apps/api/src/<bc>/application/**` — orchestration (use cases / application services live there).
- `apps/api/src/<bc>/infra/**` — Firestore/HTTP adapters.
- `apps/api/src/<bc>/presentation/**` — NestJS controllers / pipes.
- `libs/contracts/<bc>/**` — pure wire schemas, no behavior.
- `libs/shared/**` — only generic, BC-agnostic primitives.

Allowed imports inside a Domain Service:

- `@acme/shared` — `Result`, `Entity`, `ValueObject`, generic VOs (`Slug`, `PaletteKey`, `Id`).
- `@acme/<bc>-contracts` — enums (`CelebrationStatusEnum`), interfaces, catalogs (`CELEBRATION_STATUSES`).
- Sibling entities/VOs in the same BC (`Celebration`, `Section`, …).

Forbidden imports: `@nestjs/*`, `firebase-admin`, `zod`, `next`, `react`, any `*Repository`/`*Query` port, any DTO under `presentation/dto/`.

See `examples/` directory in this skill for complete standalone examples.

---

## Canonical Snippet — `*Policy` (boolean rule over a collection)

Use when the rule is a stateless check on a set of domain objects.
Pattern below mirrors `Celebration.tryCreate`'s error-aggregation style and the project's `Result` API (`Result.ok`, `Result.fail`, `withFail`).

```typescript
// apps/api/src/celebrations/domain/services/celebration-publishing.policy.ts
import { Result } from "@acme/shared";
import { CelebrationStatusEnum, SectionKindEnum } from "@acme/celebrations-contracts";
import type { Celebration } from "../entities/celebration.entity";

const ALREADY_PUBLISHED = "ALREADY_PUBLISHED";
const MISSING_HERO_SECTION = "MISSING_HERO_SECTION";
const NO_SECTIONS = "NO_SECTIONS";

export class CelebrationPublishingPolicy {
  /**
   * Decides whether a celebration is eligible to publish.
   * Pure function — no I/O, no side effects, no Date.now().
   */
  static check(celebration: Celebration): Result<void> {
    const errors: string[] = [];

    if (celebration.status === CelebrationStatusEnum.PUBLISHED) {
      errors.push(ALREADY_PUBLISHED);
    }
    if (celebration.sections.length === 0) {
      errors.push(NO_SECTIONS);
    } else if (!celebration.sections.some((s) => s.content.type === SectionKindEnum.HERO)) {
      errors.push(MISSING_HERO_SECTION);
    }

    if (errors.length) return Result.fail(errors);
    return Result.ok<void>(undefined);
  }
}
```

Usage in a Use Case:

```typescript
// apps/api/src/celebrations/application/usecases/publish-celebration.usecase.ts (excerpt)
const check = CelebrationPublishingPolicy.check(celebration);
if (check.isFailure) return check.withFail;

const transition = celebration.publish();
if (transition.isFailure) return transition.withFail;
```

The use case is what loaded `celebration` from the repository — the policy never touches I/O.

---

## Canonical Snippet — `*Calculator` (numeric computation)

Use when the rule produces a computed value from multiple domain objects.

```typescript
// apps/api/src/celebrations/domain/services/celebration-completeness.calculator.ts
import { Result } from "@acme/shared";
import { SectionKindEnum } from "@acme/celebrations-contracts";
import type { Celebration } from "../entities/celebration.entity";

const REQUIRED_SECTIONS = [SectionKindEnum.HERO, SectionKindEnum.GALLERY] as const;
const INVALID_INPUT = "INVALID_CELEBRATION";

export class CelebrationCompletenessCalculator {
  /**
   * Returns the share (0..1) of required section kinds the celebration already has.
   * Deterministic: same celebration snapshot → same value.
   */
  static calculate(celebration: Celebration): Result<number> {
    if (!celebration) return Result.fail(INVALID_INPUT);

    const present = REQUIRED_SECTIONS.filter((kind) =>
      celebration.sections.some((s) => s.content.type === kind),
    ).length;

    return Result.ok(present / REQUIRED_SECTIONS.length);
  }
}
```

---

## Branching on closed sets (enum rule)

Whenever the rule depends on a closed-set field — `status`, `kind`, `palette`, `role`, `provider`, etc. — compare against an **enum member** from `@acme/<bc>-contracts`. Never against a raw string literal.

Right:

```typescript
import { CelebrationStatusEnum } from "@acme/celebrations-contracts";

if (celebration.status === CelebrationStatusEnum.PUBLISHED) {
  /* … */
}
```

Wrong:

```typescript
if (celebration.status === "published") {
  /* drifts if the enum value changes */
}
```

When you need to iterate over every valid value, use the catalog tuple exported next to the enum:

```typescript
import { CELEBRATION_STATUSES, type CelebrationStatus } from "@acme/celebrations-contracts";
// or, when no catalog is exported yet:
// const statuses = Object.values(CelebrationStatusEnum);

for (const status of CELEBRATION_STATUSES) {
  // …
}
```

The same rule applies to `switch` statements — every `case` is `XxxEnum.MEMBER`, and the `default` returns `Result.fail("UNKNOWN_<FIELD>")` so a future enum addition fails loudly during tests instead of silently falling through.

---

## Static vs Instance

| When to use                                                | Pattern                       | Example                                |
| ---------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| Service is stateless — no shared config                    | Static method                 | `CelebrationPublishingPolicy.check(c)` |
| Service needs constructor config (e.g., thresholds, clock) | Instance with injected config | `new FeeResolver(config).resolve(p)`   |

Prefer static. Reach for an instance only when configuration genuinely varies per call site (e.g., a tenant-specific threshold). Even then: pass the config through the constructor, do not pull it from `process.env` — that would be I/O.

---

## Test Strategy

Domain Services are the easiest code to test — no mocks, no DI, no NestJS `Test.createTestingModule`. Tests live next to other api tests so `pnpm --filter api test` picks them up.

```typescript
// apps/api/test/celebrations/domain/services/celebration-publishing.policy.test.ts
import { CelebrationPublishingPolicy } from "@celebrations/domain/services/celebration-publishing.policy";
import { Celebration } from "@celebrations/domain/entities/celebration.entity";
import { CelebrationStatusEnum, SectionKindEnum } from "@acme/celebrations-contracts";

function buildCelebration(overrides: Partial<Parameters<typeof Celebration.create>[0]> = {}) {
  return Celebration.create({
    id: "celeb-1",
    slug: "ana-25",
    kind: "birthday",
    palette: "rose",
    title: "Ana 25",
    status: CelebrationStatusEnum.DRAFT,
    sections: [{ id: "s-1", order: 0, content: { type: SectionKindEnum.HERO, title: "Hi" } }],
    ...overrides,
  });
}

describe("CelebrationPublishingPolicy.check", () => {
  it("passes for a draft celebration that has a hero section", () => {
    const result = CelebrationPublishingPolicy.check(buildCelebration());
    expect(result.isOk).toBe(true);
  });

  it("fails when already published", () => {
    const result = CelebrationPublishingPolicy.check(
      buildCelebration({ status: CelebrationStatusEnum.PUBLISHED }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining(["ALREADY_PUBLISHED"]));
  });

  it("fails when no hero section is present", () => {
    const result = CelebrationPublishingPolicy.check(
      buildCelebration({
        sections: [{ id: "s-1", order: 0, content: { type: SectionKindEnum.GALLERY, images: [] } }],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining(["MISSING_HERO_SECTION"]));
  });
});
```

Test coverage targets:

- Happy path (rule passes, `Result.ok`).
- Failure path (rule fails with the exact `Result.fail` codes — assert against `result.errors`, not `result.error`).
- Edge: empty collections (`sections: []`).
- Edge: boundary values for numeric calculators (exactly 0, exactly negative).
- Determinism: same inputs across two calls → same `isOk` and same payload.
- Every enum branch is exercised (one test per `XxxEnum` member that the service inspects).

---

## Implementation Checklist

- [ ] File path is `apps/api/src/<bc>/domain/services/<name>.service.ts` — not `application/`, `infra/`, `presentation/`, or `libs/**`.
- [ ] Added to the `domain/services/index.ts` barrel.
- [ ] No framework imports (`@nestjs`, `firebase-admin`, `react`, `zod`, etc.).
- [ ] No I/O — no repository, no query, no HTTP, no filesystem, no `process.env`, no `Date.now()`/`Math.random()` unless injected.
- [ ] Imports come only from `@acme/shared`, `@acme/<bc>-contracts`, or sibling domain files.
- [ ] Returns `Result<T>` for failable rules, plain value for infallible ones.
- [ ] All failure codes are UPPER_SNAKE string constants, declared near the top of the file.
- [ ] Named by rule intent: `*Policy`, `*Calculator`, `*Resolver`, `*Specification`. No `execute()` method (reserved for `UseCase`).
- [ ] Static method for stateless rules; instance only when config is needed.
- [ ] Every closed-set comparison uses an enum from `@acme/<bc>-contracts` (no raw `"published"`/`"hero"`).
- [ ] Tests in `apps/api/test/<bc>/domain/services/` cover happy + failure + edges + every enum branch.
- [ ] `pnpm --filter api typecheck && pnpm --filter api test` passes.

---

## Common Pitfalls

| Mistake                                   | Why it breaks                                                                  | Fix                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Injecting a repository into the service   | Makes the domain layer depend on infra; impossible to unit-test without mocks  | Use Case (or Application Service) loads data, passes it as an argument          |
| Returning `null`/`undefined` on failure   | Callers must handle `null` separately from `Result`, breaking uniformity       | Return `Result.fail("CODE")`                                                    |
| Duplicating an entity method              | Two sources of truth diverge silently over time                                | Call the entity's own method (`celebration.publish()`); add it there if missing |
| Putting orchestration in the service      | Service decides which repo to call next — mixes orchestration with domain rule | Keep the service pure; orchestration belongs in Use Case / App Service          |
| Branching on `"published"` string literal | Drifts the day someone renames the enum value                                  | Use `CelebrationStatusEnum.PUBLISHED`                                           |
| Placing file outside `domain/services/`   | Service becomes visible to infra and accidentally couples to framework code    | Move to `apps/api/src/<bc>/domain/services/<name>.service.ts`                   |
| Naming the method `execute`               | Collides with `UseCase<IN, OUT>.execute` convention; readers misclassify       | Name after the rule: `check`, `calculate`, `resolve`, `isSatisfiedBy`           |
| Importing a DTO from `presentation/dto/`  | Couples domain to wire shape; reverse dependency                               | Take entity/VO arguments; mappers in `presentation/` convert DTOs in/out        |

---

## When you need I/O: `application/services/` instead

If the candidate "service" needs to load by slug, retry against the database, fan out to a queue, or otherwise touch the outside world, it is **not** a Domain Service. Put it in:

```
apps/api/src/<bc>/application/services/<name>.service.ts
```

Differences from a Domain Service:

- Decorated with `@Injectable()` and uses constructor injection (`@Inject(<REPO_TOKEN>)`).
- May depend on **repository ports** (`CelebrationRepository`) and other application services — never on Firestore SDK directly.
- Methods can be `async` and still return `Result<T>`.
- Does **not** belong in `domain/`; it stays in the application layer alongside use cases.

Canonical example in this repo:

```
apps/api/src/celebrations/application/services/slug-allocator.service.ts
```

It allocates a unique `Slug` by trying the requested name first and, on collision, retrying with `Slug.withRandomSuffix(...)` against the `CelebrationRepository`. That retry loop is exactly the kind of multi-step I/O flow that does not fit the clean `UseCase<IN, OUT>` shape — and exactly why it cannot live in `domain/services/`.

If you find yourself adding `@Injectable()` or a repository import to a file under `domain/services/`, stop and move it to `application/services/` first.
