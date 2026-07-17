# TypeScript DDD Use Case — Reference

## Decide First: Use Case or Application Service?

Before opening a file, pick the right slot:

```
        ┌──────────────────────────────────────────┐
        │  Is the intent a single verb (IN → OUT)? │
        │  e.g. Create<Noun>, Publish<Noun>,       │
        │       Add<Child>, List<Noun>             │
        └──────────────────────────────────────────┘
              │                              │
            YES                             NO
              │                              │
              ▼                              ▼
   ┌────────────────────┐      ┌────────────────────────────┐
   │ Use case           │      │ Application service        │
   │ application/       │      │ application/services/      │
   │   usecases/        │      │   <name>.service.ts        │
   │   <verb>-<noun>    │      │ Stateful orchestration,    │
   │   .usecase.ts      │      │ retry loops, multi-attempt │
   │ implements         │      │ allocation, future saga    │
   │ UseCase<IN, OUT>   │      │ coordinators (e.g.         │
   │                    │      │ SlugAllocator).            │
   └────────────────────┘      └────────────────────────────┘
```

- **Single-verb IN → OUT** → use case at `apps/api/src/<bc>/application/usecases/<verb>-<noun>.usecase.ts` implementing `UseCase<IN, OUT>`. Read [Standard Structure](#standard-structure) and the canonical snippets below.
- **Stateful orchestration / retry loop / multi-attempt allocation** (e.g. `SlugAllocator` that retries on collision; future `SagaCoordinator`-style classes) → application service at `apps/api/src/<bc>/application/services/<name>.service.ts`. Skip to [When to use `application/services/` instead](#when-to-use-applicationservices-instead).

Pick wrong and you'll either bloat a use case past one verb or scatter retry/allocation logic across N use cases. The choice gates every other decision in this file.

---

## File Paths in This Codebase

Base contract (real, exists today):

- `libs/shared/src/base/use-case.ts` — `UseCase<IN, OUT>` interface from `@acme/shared`.

Real use cases (canonical examples):

- `apps/api/src/celebrations/application/usecases/create-celebration.usecase.ts` — happy-path create.
- `apps/api/src/celebrations/application/usecases/publish-celebration.usecase.ts` — state transition on existing aggregate.
- `apps/api/src/celebrations/application/usecases/add-section.usecase.ts` — mutating a nested entity inside an aggregate.
- `apps/api/src/celebrations/application/usecases/list-published-celebrations.usecase.ts` — read query shape returning entities.
- `apps/api/src/celebrations/application/services/slug-allocator.service.ts` — orchestrator that does **not** fit `UseCase<IN, OUT>` (multi-attempt allocation loop).

Repository port (always imported by use cases):

- `apps/api/src/celebrations/domain/repositories/celebration.repository.ts` — exports `CELEBRATION_REPOSITORY` (symbol) + `CelebrationRepository` (interface).

Tests (canonical):

- `apps/api/test/celebrations/application/usecases/create-celebration.usecase.test.ts`
- `apps/api/test/celebrations/application/usecases/publish-celebration.usecase.test.ts`

Module registration:

- `apps/api/src/celebrations/celebrations.module.ts` lists every use case as a provider; the controller imports them via `@<bc>/application/usecases`.

---

## Standard Structure

Every use case lives at:

```
apps/api/src/<bc>/application/usecases/<verb>-<noun>.usecase.ts
```

Conventions:

- File name: kebab-case verb-noun (`create-celebration`, `publish-celebration`, `add-section`, `list-published-celebrations`).
- Class name: PascalCase verb-noun **without** the `UseCase` suffix (`CreateCelebration`, `PublishCelebration`). The file extension `.usecase.ts` already encodes the role; doubling it in the class name is noise. Constructor injection sites read better as `private readonly create: CreateCelebration`.
- One use case per file. Export it from the `index.ts` barrel.
- Input interface: `<ClassName>Input` (e.g. `CreateCelebrationInput`). Declared in the same file.

When the orchestration is not a single IN→OUT verb (e.g. retry loops, cross-aggregate coordination, deferred allocators), it goes to:

```
apps/api/src/<bc>/application/services/<name>.service.ts
```

See the [When to use `application/services/` instead](#when-to-use-applicationservices-instead) section below.

---

## Base Contract

```typescript
// libs/shared/src/base/use-case.ts
export interface UseCase<IN, OUT> {
  execute(input: IN): Promise<Result<OUT>>;
}
```

---

## Canonical Snippet — Create

Mirrors `apps/api/src/celebrations/application/usecases/create-celebration.usecase.ts`.

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { Result, type UseCase } from "@acme/shared";
import { CelebrationStatusEnum, type CelebrationKind } from "@acme/celebrations-contracts";
import { Celebration } from "@celebrations/domain/entities";
import {
  CELEBRATION_REPOSITORY,
  type CelebrationRepository,
} from "@celebrations/domain/repositories";

export interface CreateCelebrationInput {
  slug: string;
  kind: CelebrationKind; // enum-typed union, never `string`
  palette: string;
  title: string;
  ownerId?: string | null;
}

@Injectable()
export class CreateCelebration implements UseCase<CreateCelebrationInput, Celebration> {
  constructor(
    @Inject(CELEBRATION_REPOSITORY)
    private readonly repo: CelebrationRepository,
  ) {}

  async execute(input: CreateCelebrationInput): Promise<Result<Celebration>> {
    // 1. Build the aggregate — entity owns every invariant.
    const built = Celebration.tryCreate({
      slug: input.slug,
      kind: input.kind,
      palette: input.palette,
      title: input.title,
      status: CelebrationStatusEnum.DRAFT, // enum member, never the literal "draft"
      sections: [],
      ownerId: input.ownerId ?? null,
    });
    if (built.isFailure) return built.withFail;

    // 2. Pre-condition: slug uniqueness.
    const existing = await this.repo.findBySlug(built.instance.slug);
    if (existing.isFailure) return existing.withFail;
    if (existing.instance) return Result.fail("SLUG_ALREADY_EXISTS");

    // 3. Persist + return the saved aggregate.
    const saved = await this.repo.save(built.instance);
    if (saved.isFailure) return saved.withFail;
    return Result.ok(built.instance);
  }
}
```

Why each piece matters:

- `@Injectable()` makes the class a NestJS provider — required for DI.
- `@Inject(CELEBRATION_REPOSITORY)` binds to the symbol token. Without it, Nest can't resolve an interface (interfaces are erased at runtime).
- `Celebration.tryCreate(...)` is the only place VO/entity validation runs. The use case never re-validates.
- `built.withFail` propagates the entity-level errors unchanged — controller can map them with `result-to-http`.
- `Result.fail("SLUG_ALREADY_EXISTS")` is the domain error string. Use codes the controller can branch on; never plain English sentences.
- Return `built.instance`, not `saved.instance` — `save` is `Result<void>`.

---

## Canonical Snippet — State Transition

Mirrors `publish-celebration.usecase.ts`.

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { Result, type UseCase } from "@acme/shared";
import type { Celebration } from "@celebrations/domain/entities";
import {
  CELEBRATION_REPOSITORY,
  type CelebrationRepository,
} from "@celebrations/domain/repositories";

export interface PublishCelebrationInput {
  slug: string;
}

@Injectable()
export class PublishCelebration implements UseCase<PublishCelebrationInput, Celebration> {
  constructor(
    @Inject(CELEBRATION_REPOSITORY)
    private readonly repo: CelebrationRepository,
  ) {}

  async execute(input: PublishCelebrationInput): Promise<Result<Celebration>> {
    const found = await this.repo.findBySlug(input.slug);
    if (found.isFailure) return found.withFail;
    if (!found.instance) return Result.fail("CELEBRATION_NOT_FOUND");

    const c = found.instance;
    const r = c.publish(); // domain method enforces the state machine
    if (r.isFailure) return r.withFail;

    const saved = await this.repo.save(c);
    if (saved.isFailure) return saved.withFail;
    return Result.ok(c);
  }
}
```

Update pattern in this codebase = **load → call a named domain method → persist**. There is no generic `cloneWith` flow in use cases; the entity exposes `publish()`, `addSection()`, etc., which internally use `cloneWith`. Use cases never call `cloneWith` directly.

---

## Canonical Snippet — Nested Entity Mutation

Mirrors `add-section.usecase.ts`.

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { Result, type UseCase } from "@acme/shared";
import type { SectionContent } from "@acme/celebrations-contracts";
import type { Section } from "@celebrations/domain/entities";
import {
  CELEBRATION_REPOSITORY,
  type CelebrationRepository,
} from "@celebrations/domain/repositories";

export interface AddSectionInput {
  slug: string;
  content: SectionContent; // tagged union from contracts
}

@Injectable()
export class AddSection implements UseCase<AddSectionInput, Section> {
  constructor(
    @Inject(CELEBRATION_REPOSITORY)
    private readonly repo: CelebrationRepository,
  ) {}

  async execute(input: AddSectionInput): Promise<Result<Section>> {
    const found = await this.repo.findBySlug(input.slug);
    if (found.isFailure) return found.withFail;
    if (!found.instance) return Result.fail("CELEBRATION_NOT_FOUND");

    const c = found.instance;
    const r = c.addSection(input.content); // returns Result<Section>
    if (r.isFailure) return r.withFail;

    const saved = await this.repo.save(c);
    if (saved.isFailure) return saved.withFail;
    return r; // already a Result<Section>
  }
}
```

The aggregate is saved as a whole — even when only a child entity changed. Reach for `repo.saveSection` only when an aggregate-wide save would be wasteful or racy; both methods exist on `CelebrationRepository`.

---

## Canonical Snippet — Read / List

Mirrors `list-published-celebrations.usecase.ts`.

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { Result, type UseCase } from "@acme/shared";
import { CelebrationStatusEnum } from "@acme/celebrations-contracts";
import type { Celebration } from "@celebrations/domain/entities";
import {
  CELEBRATION_REPOSITORY,
  type CelebrationRepository,
} from "@celebrations/domain/repositories";

@Injectable()
export class ListPublishedCelebrations implements UseCase<void, Celebration[]> {
  constructor(
    @Inject(CELEBRATION_REPOSITORY)
    private readonly repo: CelebrationRepository,
  ) {}

  async execute(_input?: void): Promise<Result<Celebration[]>> {
    return this.repo.listByStatus(CelebrationStatusEnum.PUBLISHED);
  }
}
```

Notes:

- `void` input is allowed when the use case takes no parameters; declare the parameter as `_input?: void` so the signature still matches `execute(input: IN)`.
- `CelebrationStatusEnum.PUBLISHED` again — never the literal `"published"`.
- When the response needs a projection different from the entity (paginated lists, joined data, public endpoints), reach for a CQRS query under `application/queries/` instead. The list-by-status case above is borderline; the read still returns full entities and the controller maps to DTOs.

---

## When to use `application/services/` instead

A use case is a single IN→OUT command/query. When the orchestration is reusable across multiple use cases (e.g. an allocator, a coordinator across aggregates, a deferred policy), promote it to an application service. The canonical pattern is `apps/api/src/celebrations/application/services/slug-allocator.service.ts`:

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { Result, Slug } from "@acme/shared";
import {
  CELEBRATION_REPOSITORY,
  type CelebrationRepository,
} from "@celebrations/domain/repositories";

@Injectable()
export class SlugAllocator {
  static readonly DEFAULT_MAX_ATTEMPTS = 5;

  constructor(
    @Inject(CELEBRATION_REPOSITORY)
    private readonly repo: CelebrationRepository,
  ) {}

  async allocate(
    rawName: string,
    maxAttempts = SlugAllocator.DEFAULT_MAX_ATTEMPTS,
  ): Promise<Result<Slug>> {
    const base = Slug.fromName(rawName);
    if (base.isFailure) return base.withFail;

    let candidate = base.instance;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const existing = await this.repo.findBySlug(candidate.value);
      if (existing.isFailure) return existing.withFail;
      if (existing.instance === null) return Result.ok(candidate);
      candidate = Slug.withRandomSuffix(base.instance);
    }
    return Result.fail("SLUG_ALLOCATION_EXHAUSTED");
  }
}
```

Differences from a use case:

- Does **not** implement `UseCase<IN, OUT>` — the API may expose several methods, take varying inputs, or maintain internal config (here, `DEFAULT_MAX_ATTEMPTS`).
- Lives in `application/services/`, registered as its own provider in the BC module.
- Still framework-thin: `@Injectable()` + `@Inject(<TOKEN>)` only; still returns `Result`; still never throws for domain failures.
- Consumed by use cases via constructor injection (use cases pull in the service instead of duplicating loops).

Trigger for promotion: the same multi-step pattern appears in two or more use cases, or the loop/retry/composition cannot be expressed as a single linear `execute`.

---

## Result API — `withFail` shortcut

`withFail` is a getter on a failed `Result<A>` that re-wraps the failure into `Result<B>` without recomputing it. Use it whenever the upstream error format is already correct:

```typescript
const found = await this.repo.findBySlug(input.slug);
if (found.isFailure) return found.withFail; // Result<Celebration | null> → Result<OUT>
```

When the upstream is fine but you want a different code, use `Result.fail("NEW_CODE")` instead:

```typescript
if (!found.instance) return Result.fail("CELEBRATION_NOT_FOUND");
```

Two situations where `withFail` is the wrong tool:

- The upstream returned `Result.ok(null)` (success carrying `null`). That is **not** a failure — you must branch on `.instance` and decide whether `null` should become a `NOT_FOUND` failure.
- You need to translate the error to a more specific domain code (e.g. repo returned `"FIRESTORE_TIMEOUT"`, you want `"CELEBRATION_LOOKUP_FAILED"`).

---

## Error Mapping

Use domain error codes that the controller can branch on via `result-to-http`. Codes are SCREAMING_SNAKE_CASE, short, stable:

```typescript
// Good — controller maps each code to an HTTP status.
return Result.fail("CELEBRATION_NOT_FOUND");
return Result.fail("SLUG_ALREADY_EXISTS");
return Result.fail("ALREADY_PUBLISHED");

// Wrong — human sentence, controller cannot branch.
return Result.fail("the celebration does not exist");
```

If the domain code lives in a constants module (`CelebrationErrors.NOT_FOUND`), prefer that over the inline string — but as of today these constants are not yet centralised in this BC; inline string codes are the working norm.

---

## Enum Rule (use case inputs + tests)

Closed-set fields use the enum-typed union from `@acme/<bc>-contracts`, never `string`. Two consequences for use cases:

1. **Input typing.** A use case that takes a discriminator or status types it with the union, not `string`:

   ```typescript
   import type { CelebrationKind } from "@acme/celebrations-contracts";

   export interface CreateCelebrationInput {
     kind: CelebrationKind; // not: kind: string
     // ...
   }
   ```

   The Zod schema in the controller already narrows to that union, so the use case receives a validated value.

2. **Internal literals.** Any time the use case writes one of these values itself, it goes through the enum member:

   ```typescript
   import { CelebrationStatusEnum } from "@acme/celebrations-contracts";

   status: CelebrationStatusEnum.DRAFT; // ok
   status: "draft"; // forbidden
   ```

3. **Test fixtures.** Use-case tests build inputs and seed entities with enum members from contracts:

   ```typescript
   import { CelebrationKindEnum, CelebrationStatusEnum } from "@acme/celebrations-contracts";

   const validInput = {
     slug: "mae",
     kind: CelebrationKindEnum.MOTHERS_DAY,
     palette: "bordo",
     title: "Mãe",
   };
   ```

   The only time a test passes a raw string is to exercise the rejection path:
   `kind: "bogus" as never` → expect `INVALID_CELEBRATION_KIND`.

---

## Implementation Checklist

- [ ] File at `apps/api/src/<bc>/application/usecases/<verb>-<noun>.usecase.ts`.
- [ ] Class is `@Injectable()`; class name omits the `UseCase` suffix.
- [ ] Implements `UseCase<IN, OUT>` from `@acme/shared`.
- [ ] `Input` interface declared in the same file, exported.
- [ ] Repository port injected via `@Inject(<REPO_TOKEN>)`; typed as the interface, not the adapter.
- [ ] Enum-typed inputs (`CelebrationKind`, `CelebrationStatus`) — no `string` discriminators.
- [ ] Every `await` followed by `if (X.isFailure) return X.withFail;`.
- [ ] Entity creation/mutation via `Entity.tryCreate` / named domain method; no inline VO checks.
- [ ] Domain error codes are SCREAMING_SNAKE_CASE.
- [ ] Returns `Result<OUT>` — never throws, never maps to HTTP.
- [ ] Use case exported from `application/usecases/index.ts`.
- [ ] Registered as provider in `<bc>.module.ts`.
- [ ] Test in `apps/api/test/<bc>/application/usecases/<name>.test.ts` covers happy path, dependency failure, domain-rule violation, and at least one VO rejection.

---

## Test Strategy

Use the real `InMemoryCelebrationRepository` from `@celebrations/infra/memory` — **not** Jest mocks. Real-class substitution keeps tests truthful: persistence semantics, slug uniqueness, status filters all behave like production. Mocks drift; the in-memory adapter is verified by the repository contract suite.

Canonical test (mirrors `create-celebration.usecase.test.ts`):

```typescript
import { CelebrationKindEnum, CelebrationStatusEnum } from "@acme/celebrations-contracts";
import { InMemoryCelebrationRepository } from "@celebrations/infra/memory";
import { Celebration } from "@celebrations/domain/entities";
import { CreateCelebration } from "@celebrations/application/usecases";

describe("CreateCelebration", () => {
  const validInput = {
    slug: "mae",
    kind: CelebrationKindEnum.MOTHERS_DAY,
    palette: "bordo",
    title: "Mãe",
  };

  it("creates a fresh draft celebration", async () => {
    const repo = new InMemoryCelebrationRepository();
    const r = await new CreateCelebration(repo).execute(validInput);
    expect(r.isOk).toBe(true);
    if (r.isFailure) return;
    expect(r.instance.slug).toBe("mae");
    expect(r.instance.status).toBe(CelebrationStatusEnum.DRAFT);
  });

  it("rejects duplicate slugs", async () => {
    const repo = new InMemoryCelebrationRepository();
    await repo.save(
      Celebration.create({
        slug: "mae",
        kind: CelebrationKindEnum.MOTHERS_DAY,
        palette: "bordo",
        title: "T",
        status: CelebrationStatusEnum.DRAFT,
        sections: [],
      }),
    );
    const r = await new CreateCelebration(repo).execute(validInput);
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("SLUG_ALREADY_EXISTS");
  });

  it("propagates VO errors (invalid kind)", async () => {
    const repo = new InMemoryCelebrationRepository();
    const r = await new CreateCelebration(repo).execute({
      ...validInput,
      kind: "bogus" as never,
    });
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("INVALID_CELEBRATION_KIND");
  });
});
```

Test scenarios to always cover:

| Scenario                                | What to verify                                                    |
| --------------------------------------- | ----------------------------------------------------------------- |
| Happy path                              | `result.isOk`; aggregate state matches expectation                |
| Domain pre-condition violated           | `result.isFailure`; `result.errors` contains the right code       |
| VO/entity rejects an input field        | `result.isFailure`; entity error code propagated                  |
| Repo `findBySlug` returns `Result.fail` | Use case propagates via `withFail`                                |
| State-transition method rejects         | e.g. publish an already-published aggregate → `ALREADY_PUBLISHED` |
| Persisted state visible after re-read   | `repo.findBySlug(...)` shows the mutation                         |

Construction pattern in tests: `new <UseCase>(repo)` directly — no Nest container needed. Repository fixtures are seeded by calling `repo.save(Celebration.create({...}))` with `Celebration.create` (the throwing variant) so the test reads top-down.

---

## Commands

| Goal                               | Command                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| Run all api tests                  | `pnpm --filter api test`                                 |
| Run one use-case test file         | `pnpm --filter api test create-celebration.usecase.test` |
| Type-check api only                | `pnpm --filter api typecheck`                            |
| Full gate (typecheck + tests, all) | `make check`                                             |
| Api-only gate                      | `make check-api`                                         |

Never invoke `tsc` or `jest` directly — always through `pnpm --filter` or the Makefile so paths and configs resolve correctly.

---

## Common Pitfalls

| Mistake                                                    | Why it breaks                                                               | Fix                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `throw new Error(...)` inside `execute`                    | Breaks the `Result` contract; controller gets an unhandled exception        | `return Result.fail("CODE")` or `return x.withFail`                          |
| `status: "draft"` instead of `CelebrationStatusEnum.DRAFT` | Silent rename breaks; type checker can't catch typos                        | Always import and use enum members from contracts                            |
| Re-implementing VO validation in the use case              | Diverges from entity invariants; duplicates logic                           | Call `Entity.tryCreate` / domain method; check `isFailure`                   |
| `Repository.findAll()` for an API response                 | Returns full domain entities, slow, no projection control                   | Either use the existing `listBy*` method on the port or add a CQRS `*Query`  |
| Update without `findBySlug`/`findById` first               | Partial merge wipes existing fields                                         | Always load, then mutate via the entity's named method, then `save`          |
| Injecting `FirestoreCelebrationRepository` directly        | Couples application to infra; tests can't use the in-memory adapter         | `@Inject(CELEBRATION_REPOSITORY)` + type the field as the interface          |
| Class name `CreateCelebrationUseCase`                      | File extension `.usecase.ts` already encodes the role; doubling it is noise | `CreateCelebration` (reads as `private readonly create: CreateCelebration`)  |
| Returning `Result<void>` and losing the aggregate          | Callers re-read just to get the new id/slug                                 | Return `Result<Entity>` so the controller can serialise without an extra hop |
| Catching repo failures and re-emitting plain English       | Loses the code the controller needs                                         | Propagate with `withFail`, or map to a SCREAMING_SNAKE_CASE domain code      |
| Stuffing a multi-step retry loop into a use case           | Use case grows beyond one verb; pattern becomes unreusable                  | Promote to `application/services/<name>.service.ts` and inject the service   |
