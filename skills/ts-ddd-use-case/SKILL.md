---
name: ts-ddd-use-case
description: >-
  Create, review, or guide use case (application service) implementation in a
  TypeScript + DDD codebase. Use when the request involves `*.usecase.ts` files
  under `apps/api/src/<bc>/application/usecases/`,
  `application/services/<name>.service.ts` orchestrators, `UseCase<IN,OUT>` from
  `@acme/shared`, NestJS `@Injectable()` + `@Inject(<REPO_TOKEN>)` wiring,
  `Result.ok` / `Result.fail` / `withFail` / `Result.combine`, repository-port
  orchestration (`findBySlug`, `save`, `listByStatus`), aggregate
  state-transitions (`publish`, `addSection`), enum-typed inputs
  (`CelebrationKind`, `CelebrationStatusEnum.DRAFT`), or use-case tests under
  `apps/api/test/<bc>/application/usecases/` using
  `InMemoryCelebrationRepository`.
metadata:
  version: 0.1.0
---

# TypeScript DDD Use Case

**MANDATORY — READ ENTIRE FILE**: Before any implementation step, read
[`references/use-case-pattern.md`](references/use-case-pattern.md) completely.
**Do NOT load** other DDD skills (entity, repository, dto, controller) unless explicitly requested.

A use case orchestrates one application intent. It is the only layer allowed to talk to repository ports, domain entities, and other application services in the same bounded context. It **never** throws for expected failures, **never** maps to HTTP, **never** validates VO invariants itself.

---

## Before You Start

Answer these before touching code:

- **Is this an IN→OUT verb (`create-*`, `publish-*`, `add-*`, `list-*`)?** → `application/usecases/<verb>-<noun>.usecase.ts` implementing `UseCase<IN, OUT>`.
- **Is this a reusable orchestrator without a clean IN→OUT shape (allocator, coordinator, resolver)?** → `application/services/<name>.service.ts` exposing one or more domain methods, no `UseCase` interface. See `SlugAllocator` for the canonical pattern.
- **Command or query?** Write/mutation → repository port + domain entity. Read/projection → query port (or `repo.listByX` when the read still returns entities).
- **What fails?** Which pre-conditions must hold? What does each `await` return on `isFailure`?
- **Update or create?** Update requires loading current state first (`findBySlug`/`findById`) and mutating via a named domain method (`publish`, `addSection`, `cloneWith`). Never merge raw input blind.
- **Does the input carry a discriminator/status/kind?** Type it with the **enum-typed union** from contracts (`CelebrationKind`), never `string`. Pass enum members (`CelebrationStatusEnum.DRAFT`), never literals.

---

## Dependency Decision Table

| Goal                                   | Dependency type                          | Returns                                |
| -------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Create a new aggregate                 | `CelebrationRepository.save`             | `Result<void>` → return the entity     |
| State transition on existing aggregate | `findBySlug` + `save`                    | `Result<Celebration>`                  |
| Mutate a nested entity (section, item) | `findBySlug` + `save` (or `saveSection`) | `Result<Section>` (the new sub-entity) |
| List by status / filter                | `listByStatus`                           | `Result<Celebration[]>`                |
| Allocate unique slug across retries    | `SlugAllocator` (application service)    | `Result<Slug>`                         |
| Existence check before write           | `findBySlug` → `Result.fail(NOT_FOUND)`  | Domain error code                      |
| Aggregate across multiple BCs (rare)   | Cross-BC contract or domain event        | Combined DTO                           |

---

## Core Rules

- Implement `UseCase<IN, OUT>` from `@acme/shared`: `execute(input: IN): Promise<Result<OUT>>`.
- Decorate the class with `@Injectable()` from `@nestjs/common`. Use cases are providers, registered in the BC module.
- Inject repository ports via `@Inject(<TOKEN>)` using the symbol token from `@<bc>/domain/repositories` (e.g. `CELEBRATION_REPOSITORY`). Never inject the concrete adapter class.
- Type the constructor field with the **port interface** (`CelebrationRepository`), not the Firestore/InMemory class.
- Fail early: every `await` is followed by `if (X.isFailure) return X.withFail;`. Domain error codes go through `Result.fail("CODE")`.
- Delegate every invariant to the entity: call `Entity.tryCreate(...)`, `entity.publish()`, `entity.addSection(...)`, etc. The use case checks `isFailure` and forwards; it does **not** re-validate VOs.
- For enum-backed fields (status / kind / palette / layout / provider) pass enum members from contracts. Literal strings are a bug even when they match — they break refactors and silent renames.
- Imports use workspace aliases: `@acme/shared`, `@acme/<bc>-contracts`, `@<bc>/domain/...`, `@<bc>/application/...`. No relative paths across layers.
- The barrel `apps/api/src/<bc>/application/usecases/index.ts` re-exports every use case; update it the moment a new file lands.
- Class name **drops** the `UseCase` suffix (`CreateCelebration`, not `CreateCelebrationUseCase`). The file extension `.usecase.ts` already encodes the role; doubling it in the class name is noise. Constructor injection sites read better as `private readonly create: CreateCelebration`.

## NEVER

- **NEVER** `throw` inside `execute` for expected failures. Return `Result.fail(...)` or `result.withFail`. Throwing breaks `result-to-http` mapping and lets unhandled exceptions reach NestJS.
- **NEVER** map errors to HTTP status codes here. That is the controller's job (`presentation/<bc>.controller.ts` via `result-to-http`).
- **NEVER** import from `@nestjs/common` other than `Inject` + `Injectable`. No `HttpException`, no `Logger` (use injected logger if needed). No Firebase, no Zod, no DTO classes — those live in `presentation/` and `infra/`.
- **NEVER** re-implement VO validation (slug shape, kind whitelist, palette lookup). Call `Celebration.tryCreate` / `Section.tryCreate`; propagate `withFail`.
- **NEVER** inject the concrete repository (`FirestoreCelebrationRepository`, `InMemoryCelebrationRepository`). Only the symbol token + port interface.
- **NEVER** type a status/kind field as `string`. Use `CelebrationKind` / `CelebrationStatus` from contracts. Never write `status: "draft"`; write `status: CelebrationStatusEnum.DRAFT`.
- **NEVER** update without loading the aggregate first (`findBySlug`). Partial merges destroy existing props.
- **NEVER** put cross-cutting orchestration that doesn't fit IN→OUT into a use case. Promote it to `application/services/<name>.service.ts` (e.g. `SlugAllocator`).

## Result API — project-specific bits

- `result.withFail` — getter that re-wraps a failed `Result<A>` as `Result<B>` without recomputing. Use it for every `if (x.isFailure) return x.withFail;` step. Not the generic `Result` API — this is our shortcut.
- Domain error codes are **SCREAMING_SNAKE_CASE** and catalogued in `apps/api/src/shared/http/error-codes.ts`. Add new codes there before using them in a use case.

## References

See [`references/use-case-pattern.md`](references/use-case-pattern.md) for: real file layout, the canonical create / state-transition / nested-mutation / list snippets, the `application/services/` exception, the test strategy with `InMemoryCelebrationRepository`, enum-fixture rules, and the implementation checklist.

See [`examples/create-greeting.usecase.example.ts`](examples/create-greeting.usecase.example.ts) for a self-contained use case + fake repo + Jest test using enum members.
