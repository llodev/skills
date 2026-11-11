# NestJS 11 — Framework Reference

> **Do NOT load** this reference if the controller you're reviewing is not NestJS-based (Express, Fastify, Hono, Koa, etc.). Apply the framework-neutral principles from `controller-pattern.md` instead — none of the decorators, DI tokens, or module wiring below transfer.
>
> **Token budget**: this reference is ~290 lines of concrete NestJS detail. Load only if you're authoring or reviewing a new controller end-to-end (i.e. you'll touch `@nestjs/testing`, `ConfigModule`, or a new `@Injectable()` provider). For a quick lookup (e.g. "which DI symbol for the Firebase app?"), skim section headings instead of reading top-to-bottom.

Load this file **in addition to** `controller-pattern.md`. It documents a focused set of NestJS 11 patterns for a DDD API; prefer these over inventing new ones. The examples use a sample `celebrations` bounded context, a Firebase-backed infra layer and an API-key write guard; keep the shape and swap the specifics for your stack.

---

## Runtime

- NestJS **11**, Node **≥ 20.11**, TypeScript **5** strict.
- Port and other settings come from a Zod-validated `envSchema` (e.g. `PORT`, with a default).
- Gate before merging: the API package's typecheck and test scripts.
- Decorators enabled (`experimentalDecorators`, `emitDecoratorMetadata` in the API package's `tsconfig.json`).

## Standard file layout

Paths are an example layout relative to the API package root; adapt them to your project.

```
src/
  main.ts                                ← bootstrap, global pipes/filters
  app.module.ts                          ← imports AppConfigModule, FirebaseModule, <bc>.module.ts
  <bc>/
    <bc>.module.ts                       ← per-BC NestJS module
    presentation/{controllers,guards,mappers}/
    application/usecases/
    domain/{entities,repositories,services,vo}/
    infra/{firestore,memory}/
  shared/
    config/                              ← AppConfigModule (Global), envSchema (Zod)
    firebase/                            ← FirebaseModule (Global), FIREBASE_APP symbol
    http/                                ← ZodValidationPipe, mapResultToHttp, error-codes, HttpExceptionFilter
```

Example path aliases in the API package's `tsconfig.json`: `@/*`, `@<bc>/*`, `@shared/*`. Aliases such as `@<bc>/*`, `@shared/*` and `@acme/*` are examples; use the ones your tsconfig defines. With per-BC aliases, **every new BC adds its own alias** in both `tsconfig.json` and the test runner config (e.g. `jest.config.ts`).

---

## Dependency injection — symbol tokens + `@Inject`

Use **`Symbol` tokens for any non-class provider**: repository ports, the Firebase app handle, etc. Avoid string tokens.

```typescript
// src/shared/firebase/firebase.tokens.ts
export const FIREBASE_APP = Symbol("FIREBASE_APP");

// src/celebrations/domain/repositories/celebration.repository.token.ts
export const CELEBRATION_REPOSITORY = Symbol("CELEBRATION_REPOSITORY");
```

Inject via `@Inject(SYMBOL)`:

```typescript
@Injectable()
export class CelebrationResponseMapper {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}
}

@Injectable()
export class CreateCelebration {
  constructor(@Inject(CELEBRATION_REPOSITORY) private readonly repo: CelebrationRepository) {}
}
```

Class-token providers (use cases, mappers, the guard) are injected positionally without `@Inject`. Stick to this split; do not invent new string tokens.

---

## `@Global()` modules

In the examples, two cross-cutting modules are `@Global()`, so consumers do not re-import them in every BC module:

### `AppConfigModule` (`src/shared/config/app-config.module.ts`)

```typescript
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
      validate: (raw): Env => {
        const result = envSchema.safeParse(raw);
        if (!result.success) {
          throw new Error(
            `Invalid environment variables:\n${JSON.stringify(result.error.format(), null, 2)}`,
          );
        }
        return result.data;
      },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
```

Env is validated by **Zod** (`envSchema` in `src/shared/config/env.schema.ts`). Inject `ConfigService<Env, true>` and use the `infer: true` accessor:

```typescript
constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}
// …
const expected = this.config.get("API_WRITE_KEY", { infer: true });
```

### `FirebaseModule` (`src/shared/firebase/firebase.module.ts`)

If your project uses Firebase, wrap the Admin SDK in a global module like this; for other backends, the same shape applies to your database/storage clients.

```typescript
@Global()
@Module({
  providers: [firebaseAppProvider, FirestoreService, StorageService],
  exports: [FIREBASE_APP, FirestoreService, StorageService],
})
export class FirebaseModule implements OnApplicationShutdown {
  /* … */
}
```

`StorageService` and `FirestoreService` are class providers — inject them by class, not by symbol. The raw `app.App` handle is exported under the `FIREBASE_APP` symbol.

---

## Per-BC module

```typescript
@Module({
  controllers: [CelebrationsController, MediaController],
  providers: [
    { provide: CELEBRATION_REPOSITORY, useClass: FirestoreCelebrationRepository },
    CelebrationResponseMapper,
    ApiKeyGuard,
    SlugAllocator,
    CreateCelebration,
    GetCelebrationBySlug,
    ListPublishedCelebrations,
    UpdateCelebrationMetadata,
    PublishCelebration,
    AddSection,
    ReorderSection,
    RemoveSection,
    ReplaceSection,
  ],
  exports: [
    SlugAllocator,
    CELEBRATION_REPOSITORY,
    CreateCelebration,
    AddSection,
    PublishCelebration,
  ],
})
export class CelebrationsModule {}
```

Patterns to follow:

- Controllers, guard, response mapper, use cases, and repository binding all live in the same `<bc>.module.ts`.
- Repository port → infra adapter via `{ provide: <SYMBOL>, useClass: Firestore… }`. Tests rebind to `InMemory…`.
- Export only what cross-BC consumers actually need (use cases, repo port).

---

## Validation: `ZodValidationPipe`

`src/shared/http/zod-validation.pipe.ts`:

```typescript
@Injectable()
export class ZodValidationPipe<T extends ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Validation failed",
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
```

Usage:

```typescript
const slugPipe = new ZodValidationPipe(slugSchema); // module-scope, reused

@Post()
async createOne(
  @Body(new ZodValidationPipe(createCelebrationDtoSchema)) body: CreateCelebrationDTO,
) { /* … */ }

@Get(":slug")
async getOne(@Param("slug", slugPipe) slug: string) { /* … */ }
```

Schemas live in `@acme/<bc>-contracts` (`src/schemas/`). DTO types are `z.infer<typeof schema>` exports from the same package. Never hand-write a DTO interface in the controller.

---

## Guards: `ApiKeyGuard` on writes

The examples use a single guard, `ApiKeyGuard`, applied **per-method** on writes (no JWT or RBAC layer):

```typescript
import { ApiKeyGuard } from "../guards/api-key.guard";

@Post()
@HttpCode(HttpStatus.CREATED)
@UseGuards(ApiKeyGuard)
async createOne(@Body(new ZodValidationPipe(schema)) body: CreateDTO) { /* … */ }
```

Behavior:

- Reads `API_WRITE_KEY` via `ConfigService<Env, true>`.
- `API_WRITE_KEY` unset → throws `HttpException(503, "MUTATIONS_DISABLED")`. **Intentional**; do not "fix" by removing the guard.
- `x-api-key` header missing or mismatched → `HttpException(401, "INVALID_API_KEY")`.
- Match → passes.

The examples have no `@CurrentUser()`, `JwtAuthGuard` or `RequirePermission()`. If your project has JWT/RBAC guards, apply them with the same rule: per-method on the handlers that need them, never at the class level when the controller also serves public reads.

---

## Result → HTTP: `mapResultToHttp`

Controllers translate domain failures into HTTP via the catalog, not by throwing Nest exceptions directly:

```typescript
import { mapResultToHttp } from "@shared/http/result-to-http";

const result = await this.getBySlug.execute({ slug });
return await mapResultToHttp(result, (c) => this.mapper.toDTO(c));
```

`statusForCode(code)` looks up the error-code catalog (e.g. `src/shared/http/error-codes.ts`). Add new error codes there with their HTTP status; default is 500. See `references/controller-pattern.md` for the full catalog sample.

The global `HttpExceptionFilter` (e.g. `src/shared/http/http-exception.filter.ts`) adds `path` and `timestamp` to the JSON envelope and logs unhandled exceptions as `INTERNAL_SERVER_ERROR`.

---

## Testing — `@nestjs/testing` + `supertest`

```typescript
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import request from "supertest";

const moduleRef = await Test.createTestingModule({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => ({ API_WRITE_KEY: "test-key" })], // turns ApiKeyGuard from 503 → enforcing
    }),
  ],
  controllers: [CelebrationsController],
  providers: [
    { provide: CELEBRATION_REPOSITORY, useClass: InMemoryCelebrationRepository },
    {
      provide: StorageService,
      useValue: {
        getSignedReadUrl: async () =>
          Result.ok({ url: "https://signed/x", expiresAt: "2026-05-25T13:00:00.000Z" }),
      },
    },
    CelebrationResponseMapper,
    ApiKeyGuard,
    /* every use case the controller injects */
  ],
}).compile();

app = moduleRef.createNestApplication();
await app.init();
```

Rules:

- **Do not** import the real `FirebaseModule` in tests — fake `StorageService` (and `FirestoreService` when needed) as `useValue` objects.
- **Do not** import the real BC module — register the controller and its dependencies inline. This keeps the surface small and fast.
- Always set `API_WRITE_KEY` via the `load` factory; otherwise `ApiKeyGuard` returns 503 on every mutation.
- Use enum members in fixtures (`CelebrationKindEnum.MOTHERS_DAY`) — see `controller-pattern.md` test strategy.

Controller tests run in the API package's regular test suite. Keep any smoke test against real Firebase (which needs `.env.local` with a service account) in a separate script — do not run it from controller tests.

---

## NestJS 11 checklist

- [ ] `@Controller("<base>")` set; guards applied **per-method** with `@UseGuards(ApiKeyGuard)` on mutations.
- [ ] `@HttpCode(HttpStatus.CREATED)` on creates, `@HttpCode(HttpStatus.NO_CONTENT)` on void mutations, `@HttpCode(HttpStatus.OK)` on `@Post` actions that return data.
- [ ] `@Body()` validated with `new ZodValidationPipe(<schema>)`; DTO types imported from `@acme/<bc>-contracts`.
- [ ] `@Param()` for non-trivial path params goes through a module-scoped pipe (`const slugPipe = new ZodValidationPipe(slugSchema)`).
- [ ] Use cases and response mapper injected via constructor — no `new`, no factory calls inside handlers.
- [ ] Repository ports provided via `Symbol` token + `{ provide, useClass }`.
- [ ] `ConfigService<Env, true>` with `.get("KEY", { infer: true })` for env access.
- [ ] Only the guards your project defines (here `ApiKeyGuard`), applied per-method; no guard copied from older notes.
- [ ] Controller registered in `<bc>.module.ts`; mapper, guard, and all injected use cases listed in `providers`.
- [ ] Test bed mocks `StorageService` and loads `API_WRITE_KEY: "test-key"` via `ConfigModule.forRoot({ load: […] })`.

---

## Adding another framework

This skill documents only NestJS so far. To cover another HTTP runtime, create a sibling reference (`references/<framework>.md`) and a sibling example, and keep `controller-pattern.md` framework-neutral above the canonical NestJS snippet.
