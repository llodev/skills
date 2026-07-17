---
name: ts-ddd-controller
description: "Create, review, or guide HTTP controllers in a TypeScript + DDD api. Use when the request involves `*.controller.ts` under `apps/api/src/<bc>/presentation/controllers/`, route definition, `ApiKeyGuard` on mutations, `ZodValidationPipe` against `@acme/<bc>-contracts` schemas, use case orchestration, mapping `Result` to HTTP via `mapResultToHttp`, signed-URL enrichment through a response mapper, HTTP status conventions (200/201/204), or controller tests using `@nestjs/testing` + `supertest` with an in-memory repository."
---

# TypeScript DDD Controller

**MANDATORY — READ ENTIRE FILE**: before writing or reviewing any controller, read
[`references/controller-pattern.md`](references/controller-pattern.md) completely.

Then load the framework reference:

- **NestJS 11** (this repo) → also read [`references/nestjs.md`](references/nestjs.md) completely.
- Other frameworks (Express, Fastify, Hono…) are not yet documented; apply the principles from `controller-pattern.md`.

**Do NOT load** sibling DDD skills (`ts-ddd-entity`, `ts-ddd-use-case`, `ts-ddd-repository`, `ts-ddd-dto`, `ts-ddd-value-object`) unless the request explicitly asks for them.

---

## When to trigger this skill

- File path matches `apps/api/src/<bc>/presentation/controllers/*.controller.ts`.
- Request mentions `@Controller`, `@Get/@Post/@Put/@Delete`, `@UseGuards(ApiKeyGuard)`, `ZodValidationPipe`, `mapResultToHttp`, or a response mapper.
- Adding/changing routes for a bounded context (e.g. `celebrations`).
- Wiring controllers into a `<bc>.module.ts`.
- Writing a controller test under `apps/api/test/<bc>/presentation/controllers/*.controller.test.ts`.

## Where controllers live

```
apps/api/src/<bc>/
  presentation/
    controllers/<name>.controller.ts
    guards/api-key.guard.ts
    mappers/<name>-response.mapper.ts
    index.ts                  ← barrel per leaf folder
  application/
    usecases/                 ← injected here
  <bc>.module.ts              ← registers controllers, mappers, guard, use cases
```

Every leaf folder exports through an `index.ts` barrel. Imports across layers use the path aliases `@<bc>/*` (e.g. `@celebrations/application/usecases`) and `@shared/*` (`apps/api/src/shared/*`); inside the same folder use relative paths. Cross-package types come from `@acme/<bc>-contracts` and `@acme/shared` — never `@ddd/shared` or any older name.

## Before You Start

Answer these before writing a handler:

- **Contract**: status + payload? (`200` payload, `201 CREATED`, `204 NO_CONTENT`, `200` for explicit OK on actions like `/publish`).
- **Mutation?**: If yes, `@UseGuards(ApiKeyGuard)` is required (writes are 401 without `x-api-key`, 503 `MUTATIONS_DISABLED` when `API_WRITE_KEY` is unset — see `references/controller-pattern.md`).
- **Wire shape**: Which Zod schema in the contracts package validates `@Body` / `@Param`? Don't redefine wire types locally.
- **Failure mapping**: Is the error code already in `apps/api/src/shared/http/error-codes.ts`? If new, add it there with the right HTTP status before throwing it from a use case.
- **Response shape**: Does the entity need enrichment (signed Storage URLs, ISO dates)? Then go through the response mapper, not raw entity props.

---

## Core Rules

- Controllers are **thin translators** between HTTP and the application layer. No business logic, no domain conditionals, no repository calls.
- **Inject** use cases and mappers via the constructor — never `new UseCase(...)`.
- **Validate at the boundary** with `ZodValidationPipe(schema)` over schemas exported by the BC's contracts package.
- **Map `Result` → HTTP** with `mapResultToHttp(result, ok => …)` from `@shared/http`. Don't throw NestJS exceptions directly from controller handlers.
- **Mutations** carry `@UseGuards(ApiKeyGuard)`. Reads stay public.
- **Enrich** entity → response DTO inside a dedicated mapper (e.g. `CelebrationResponseMapper`) — that's where signed URLs, date serialization, and tagged-union variant handling live.

## NEVER

- **NEVER** apply `@UseGuards(ApiKeyGuard)` at the class level. **Why**: it 401s every read. The canonical `CelebrationsController` mixes public reads (`GET /celebrations`, `GET /celebrations/:slug`) with per-method-guarded writes; a class-level guard breaks that mix and silently breaks the public web client. Always attach `@UseGuards(ApiKeyGuard)` to each mutating handler individually.
- **NEVER** `throw` a NestJS `HttpException` (or its subclasses like `BadRequestException` / `NotFoundException`) directly from a controller. **Why**: the error-code catalog in `apps/api/src/shared/http/error-codes.ts` is the single source of truth for `code → HTTP status` mapping. Throwing inline forks that mapping, defeats the `Result` pattern in use cases, and produces envelopes that don't match `HttpExceptionFilter`. Always pipe `Result` failures through `mapResultToHttp`.
- **NEVER** put domain logic, branching, or repository access inside a controller method.
- **NEVER** instantiate use cases or mappers with `new` — breaks DI and tests.
- **NEVER** remove `ApiKeyGuard` on a write to "fix" a 503; the 503 is the intentional `MUTATIONS_DISABLED` contract when `API_WRITE_KEY` is unset.
- **NEVER** redefine wire-shape interfaces in the controller; import the DTO type + Zod schema from `@acme/<bc>-contracts`.
- **NEVER** leak entity internals (e.g. `Date` objects, raw `storagePath` without signed URL) into the response — funnel through the mapper.

---

## References

- [`references/controller-pattern.md`](references/controller-pattern.md) — repo-grounded: folder layout, `ZodValidationPipe`, `ApiKeyGuard` semantics, `mapResultToHttp`, response mapper, test strategy (enum members in fixtures).
- [`references/nestjs.md`](references/nestjs.md) — NestJS 11 patterns actually used here: DI symbol tokens (`FIREBASE_APP`), `@Inject(SYMBOL)`, `@Global()` modules (`FirebaseModule`, `AppConfigModule`), Zod-validated `ConfigModule.forRoot`, `@nestjs/testing` + `supertest` test bed.
- [`examples/product.controller.nestjs.ts`](examples/product.controller.nestjs.ts) — runnable-style mirror of `CelebrationsController`.
