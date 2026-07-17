# TypeScript DDD Controller — Core Reference

> **Token budget**: this reference is ~470 lines. Load only if you're authoring or reviewing a new controller end-to-end. For a one-off lookup (status code, guard semantics), skim the headings via the TOC in your editor instead of reading top-to-bottom.

This reference is grounded in the actual `apps/api` codebase. Mirror these shapes exactly — they are not suggestions.

## The Translation-Only Principle

A controller has one job: translate between HTTP and the application layer.

```
HTTP Request
  → ZodValidationPipe(schema)         ← validates @Body / @Param
  → UseCase.execute(input)            ← returns Promise<Result<T>>
  → mapResultToHttp(result, mapper)   ← Result.ok → mapped value; Result.fail → HttpException
  → HTTP Response                     ← status from error-codes catalog, body = mapper output
```

The controller does not:

- Run business rules, conditionals, or domain branching.
- Call repositories, domain services, or Firebase SDKs.
- Construct DTOs from raw entity props (use the response mapper).
- Throw NestJS exceptions directly (use `mapResultToHttp`).

---

## Folder layout (per bounded context)

```
apps/api/src/<bc>/
  presentation/
    controllers/
      <bc>.controller.ts                ← e.g. celebrations.controller.ts
      <secondary>.controller.ts         ← e.g. media.controller.ts
      index.ts                          ← barrel
    guards/
      api-key.guard.ts                  ← ApiKeyGuard
      index.ts
    mappers/
      <name>-response.mapper.ts         ← entity → response DTO (+ signed URLs)
      index.ts
  application/usecases/                 ← injected here
  domain/                               ← never imported directly by the controller (only via use cases)
  infra/                                ← never imported by the controller
  <bc>.module.ts                        ← registers controllers + mappers + guard + use cases
apps/api/src/shared/
  http/
    result-to-http.ts                   ← mapResultToHttp
    error-codes.ts                      ← ERROR_CODE_TO_STATUS catalog
    zod-validation.pipe.ts              ← ZodValidationPipe
    http-exception.filter.ts            ← global filter that shapes the JSON envelope
    index.ts
  firebase/                             ← StorageService, FirestoreService, FIREBASE_APP symbol
  config/                               ← envSchema (Zod) + AppConfigModule (Global)
```

Aliases (from `apps/api/tsconfig.json`): `@/*`, `@celebrations/*`, `@shared/*`. **Add a new alias for every new BC** in `tsconfig.json` and `jest.config.ts`.

---

## Canonical controller (mirror this exactly)

From `apps/api/src/celebrations/presentation/controllers/celebrations.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  createCelebrationDtoSchema,
  reorderSectionDtoSchema,
  sectionInputDtoSchema,
  slugSchema,
  updateCelebrationDtoSchema,
  type CelebrationResponseDTO,
  type CreateCelebrationDTO,
  type ReorderSectionDTO,
  type SectionInputDTO,
  type UpdateCelebrationDTO,
} from "@acme/celebrations-contracts";
import { ZodValidationPipe } from "@shared/http/zod-validation.pipe";
import { mapResultToHttp } from "@shared/http/result-to-http";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { CelebrationResponseMapper } from "../mappers/celebration-response.mapper";
import {
  CreateCelebration,
  GetCelebrationBySlug,
  ListPublishedCelebrations,
  PublishCelebration,
  UpdateCelebrationMetadata,
  AddSection,
  ReorderSection,
  RemoveSection,
  ReplaceSection,
} from "../../application/usecases";

// Reusable pipe for path params validated by a Zod schema.
const slugPipe = new ZodValidationPipe(slugSchema);

@Controller("celebrations")
export class CelebrationsController {
  constructor(
    private readonly mapper: CelebrationResponseMapper,
    private readonly listPublished: ListPublishedCelebrations,
    private readonly getBySlug: GetCelebrationBySlug,
    private readonly create: CreateCelebration,
    private readonly updateMeta: UpdateCelebrationMetadata,
    private readonly publish: PublishCelebration,
    private readonly addSection: AddSection,
    private readonly reorderSection: ReorderSection,
    private readonly removeSection: RemoveSection,
    private readonly replaceSection: ReplaceSection,
  ) {}

  // READ — public, 200
  @Get()
  async list(): Promise<CelebrationResponseDTO[]> {
    const result = await this.listPublished.execute();
    return await mapResultToHttp(result, async (celebrations) =>
      Promise.all(celebrations.map((c) => this.mapper.toDTO(c))),
    );
  }

  // READ one — public, 200; 404 via CELEBRATION_NOT_FOUND in the use case
  @Get(":slug")
  async getOne(@Param("slug", slugPipe) slug: string): Promise<CelebrationResponseDTO> {
    const result = await this.getBySlug.execute({ slug });
    return await mapResultToHttp(result, (c) => this.mapper.toDTO(c));
  }

  // WRITE — guarded, 201
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiKeyGuard)
  async createOne(
    @Body(new ZodValidationPipe(createCelebrationDtoSchema))
    body: CreateCelebrationDTO,
  ): Promise<CelebrationResponseDTO> {
    const result = await this.create.execute(body);
    return await mapResultToHttp(result, (c) => this.mapper.toDTO(c));
  }

  // WRITE — guarded, 204 (void mutation)
  @Delete(":slug/sections/:sectionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard)
  async removeOne(
    @Param("slug", slugPipe) slug: string,
    @Param("sectionId") sectionId: string,
  ): Promise<void> {
    const result = await this.removeSection.execute({ slug, sectionId });
    return mapResultToHttp(result, () => undefined);
  }

  // ACTION — guarded, 200 (state transition that returns the updated aggregate)
  @Post(":slug/publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  async publishOne(@Param("slug", slugPipe) slug: string): Promise<CelebrationResponseDTO> {
    const result = await this.publish.execute({ slug });
    return await mapResultToHttp(result, (c) => this.mapper.toDTO(c));
  }
}
```

### Status conventions

#### Decision tree — pick the status first, then look up decorators

```
What is this endpoint doing?
│
├─ Creating a new resource (POST that returns the created aggregate)?
│     └─► 201 Created
│         @Post() + @HttpCode(HttpStatus.CREATED)
│         (Nest defaults POST to 201, but be explicit — it documents intent.)
│
├─ State transition that returns the aggregate (e.g. /publish, /archive)?
│     └─► 200 OK
│         @Post(":id/action") + @HttpCode(HttpStatus.OK)
│         (Override Nest's default 201 on POST — it's not a creation.)
│
├─ Void mutation (delete, reorder, simple update with no body returned)?
│     └─► 204 No Content
│         @Delete / @Put / @Patch + @HttpCode(HttpStatus.NO_CONTENT)
│         (Handler returns `void`; mapper returns `undefined`.)
│
└─ GET read (list or detail)?
      └─► 200 OK
          @Get (no @HttpCode — 200 is the default)
```

Then confirm against the lookup table below.

| Endpoint kind                            | Decorators                                            | Status |
| ---------------------------------------- | ----------------------------------------------------- | ------ |
| Read list / read one                     | `@Get` (no `@HttpCode`)                               | 200    |
| Create (resource creation)               | `@Post` + `@HttpCode(HttpStatus.CREATED)`             | 201    |
| Update returning resource                | `@Put`/`@Patch` (no `@HttpCode`)                      | 200    |
| Void mutation (delete, reorder, replace) | `@Delete`/`@Put` + `@HttpCode(HttpStatus.NO_CONTENT)` | 204    |
| State-transition action                  | `@Post(":slug/publish")` + `@HttpCode(HttpStatus.OK)` | 200    |
| Sub-resource create (e.g. add section)   | `@Post(":parent/children")` + `@HttpCode(CREATED)`    | 201    |

`@HttpCode(HttpStatus.OK)` is explicit on `@Post` actions so success is `200`, not the default `201`.

---

## `ApiKeyGuard` + `MUTATIONS_DISABLED` semantics

`apps/api/src/celebrations/presentation/guards/api-key.guard.ts` reads `API_WRITE_KEY` via `ConfigService` and compares it to the `x-api-key` header:

| Condition                      | Status | Body                                             |
| ------------------------------ | ------ | ------------------------------------------------ |
| `API_WRITE_KEY` unset in env   | 503    | `{ message: "MUTATIONS_DISABLED", errors: […] }` |
| Header missing or mismatched   | 401    | `{ message: "INVALID_API_KEY", errors: […] }`    |
| Header matches `API_WRITE_KEY` | passes | (handler executes)                               |

Apply `@UseGuards(ApiKeyGuard)` **per-method** on every mutation. **Do NOT** apply at class level — read endpoints in the same controller are public.

The 503 is **intentional**: production deployments without `API_WRITE_KEY` configured must reject mutations. Don't remove the guard to make a failing test pass — set `API_WRITE_KEY` in the test bed instead (see test strategy below).

---

## Validation: `ZodValidationPipe` + contracts package

Every `@Body()` and every non-trivial `@Param()` flows through `ZodValidationPipe(schema)` from `@shared/http/zod-validation.pipe.ts`. Schemas come from the BC contracts package (`@acme/<bc>-contracts`), which is the single source of truth for wire shapes.

- `@Body(new ZodValidationPipe(createCelebrationDtoSchema)) body: CreateCelebrationDTO` — DTO type and schema imported from the same package; never redefine the shape in the controller.
- `@Param("slug", slugPipe) slug: string` — reuse `const slugPipe = new ZodValidationPipe(slugSchema)` at module scope to avoid re-instantiating per request.
- Validation failure → `BadRequestException` with `{ statusCode: 400, message: "Validation failed", issues }` from the pipe itself.

---

## `Result` → HTTP: `mapResultToHttp` + `error-codes.ts`

From `apps/api/src/shared/http/result-to-http.ts`:

```typescript
export function mapResultToHttp<T, R>(result: Result<T>, onOk: (value: T) => R): R {
  if (result.isOk) return onOk(result.instance);
  const errors = result.errors ?? ["UNKNOWN_ERROR"];
  const primary = errors[0];
  const status = statusForCode(primary);
  throw new HttpException({ statusCode: status, message: primary, errors }, status);
}
```

The status is looked up in `apps/api/src/shared/http/error-codes.ts` (`ERROR_CODE_TO_STATUS`). Sample mappings:

| Error code (use case)                                       | HTTP status |
| ----------------------------------------------------------- | ----------- |
| `CELEBRATION_NOT_FOUND`, `SECTION_NOT_FOUND`                | 404         |
| `SLUG_ALREADY_EXISTS`, `ALREADY_PUBLISHED`                  | 409         |
| `INVALID_SLUG`, `INVALID_TITLE`, `INVALID_*`                | 400         |
| `HERO_LIMIT_EXCEEDED`, `USE_PUBLISH_METHOD`                 | 422         |
| `FIRESTORE_*`, `SIGNED_URL_FAILED`, `STORAGE_UPLOAD_FAILED` | 502         |
| Unknown / not in catalog                                    | 500         |

When a use case introduces a new error constant, **add it to `error-codes.ts`** with the correct status before throwing from the controller path. Unknown codes default to 500, which is almost never what you want.

Response envelope shape (final JSON, after the global `HttpExceptionFilter`):

```json
{
  "statusCode": 404,
  "message": "CELEBRATION_NOT_FOUND",
  "errors": ["CELEBRATION_NOT_FOUND"],
  "path": "/celebrations/missing",
  "timestamp": "2026-05-31T14:39:00.000Z"
}
```

---

## Response mapper (entity → DTO + signed URLs)

Controllers must not project entities to DTOs inline. Use a `@Injectable()` mapper:

```typescript
// apps/api/src/celebrations/presentation/mappers/celebration-response.mapper.ts (excerpt)
@Injectable()
export class CelebrationResponseMapper {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  async toDTO(celebration: Celebration): Promise<CelebrationResponseDTO> {
    const sections: SectionDTO[] = [];
    for (const s of celebration.sections) {
      sections.push({ id: s.id, order: s.order, content: await this.contentToDTO(s) });
    }
    return {
      slug: celebration.slug,
      kind: celebration.kind,
      palette: celebration.palette as CelebrationResponseDTO["palette"],
      title: celebration.title,
      status: celebration.status,
      ownerId: celebration.ownerId,
      sections,
      createdAt: celebration.createdAt.toISOString(),
      updatedAt: celebration.updatedAt.toISOString(),
    };
  }

  private async contentToDTO(section: Section): Promise<SectionContentDTO> {
    const c = section.content;
    switch (c.type) {
      case SectionKindEnum.HERO:
        return { ...c, backgroundImage: await this.signImage(c.backgroundImage) };
      case SectionKindEnum.GALLERY: {
        const images = await Promise.all(
          c.images.map(async (img) => ({ ...img, ...(await this.signImage(img)) })),
        );
        return { ...c, images };
      }
      case SectionKindEnum.TIMELINE: {
        /* sign each entry.image when present */
      }
      default:
        return c;
    }
  }
}
```

Mapper responsibilities:

- Serialize `Date` → ISO string.
- Resolve `ImageRef` storage paths to signed URLs via `StorageService`.
- Branch on **enum members** (`SectionKindEnum.HERO`), not string literals.
- Stay async — most enrichment hits Storage. The controller awaits the mapper inside `mapResultToHttp`.

Register the mapper as a provider in `<bc>.module.ts` alongside controllers, guard, and use cases.

---

## Module wiring

`apps/api/src/celebrations/celebrations.module.ts`:

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

Production wires `FirestoreCelebrationRepository`. Tests swap in `InMemoryCelebrationRepository` (next section).

---

## Test strategy (controllers)

Tests live at `apps/api/test/<bc>/presentation/controllers/<name>.controller.test.ts` and run via `pnpm --filter api test`. They use `@nestjs/testing` + `supertest`, the InMemory repository, and a fake `StorageService`.

Skeleton (from `apps/api/test/celebrations/presentation/controllers/celebrations.controller.test.ts`):

```typescript
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { CelebrationsController } from "@celebrations/presentation/controllers";
import { CELEBRATION_REPOSITORY } from "@celebrations/domain/repositories";
import { InMemoryCelebrationRepository } from "@celebrations/infra/memory";
import { CelebrationResponseMapper } from "@celebrations/presentation/mappers";
import { ApiKeyGuard } from "@celebrations/presentation/guards";
import { StorageService } from "@shared/firebase";
import { Result } from "@acme/shared";
import {
  CelebrationKindEnum,
  CelebrationStatusEnum,
  SectionKindEnum,
} from "@acme/celebrations-contracts";

beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ API_WRITE_KEY: "test-key" })], // enables ApiKeyGuard in tests
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
      /* … all use cases registered as providers … */
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
});
```

### Enum members in fixtures and assertions

Test fixtures use **enum members**, not string literals — this catches drift between the contracts package and the entity at compile time:

```typescript
const base = Celebration.create({
  slug: "my-event",
  kind: CelebrationKindEnum.MOTHERS_DAY,
  palette: "bordo",
  title: "Event",
  status: CelebrationStatusEnum.DRAFT,
  sections: [],
});
base.addSection({ type: SectionKindEnum.MESSAGE, body: "Hello" });

// Body assertions compare against enum members too:
expect(res.body.status).toBe(CelebrationStatusEnum.PUBLISHED);
```

Strings in `.send({ kind: "mothers-day", ... })` are acceptable for raw HTTP payloads (they exercise the Zod pipe). Entity construction in fixtures and response-body assertions must use enum members.

### What each test must cover for a guarded mutation

- 401 without `x-api-key`.
- 2xx with `x-api-key: test-key` + valid body.
- 4xx for known failure codes (e.g. 404 `CELEBRATION_NOT_FOUND`, 409 `SLUG_ALREADY_EXISTS`).
- Body envelope shape: `expect(res.body.message).toBe("CELEBRATION_NOT_FOUND")`.

---

## Implementation checklist

- [ ] File at `apps/api/src/<bc>/presentation/controllers/<name>.controller.ts` with `index.ts` barrel updated.
- [ ] `@Controller("<route-base>")` set; no class-level `@UseGuards` (guards go per-method).
- [ ] Constructor injects use cases and the response mapper — no `new` calls.
- [ ] `@Body(new ZodValidationPipe(<schema>))` for every write, schema imported from `@acme/<bc>-contracts`.
- [ ] `@Param` values validated by a `ZodValidationPipe` when the shape is non-trivial (`slugPipe`).
- [ ] Mutations carry `@UseGuards(ApiKeyGuard)` per method.
- [ ] `@HttpCode(HttpStatus.CREATED | NO_CONTENT | OK)` matches the contract.
- [ ] Handler body is one-liner-ish: call use case, `return mapResultToHttp(result, …)`.
- [ ] Entity → DTO projection goes through the response mapper, never inline.
- [ ] New error constants added to `apps/api/src/shared/http/error-codes.ts`.
- [ ] Controller registered in `<bc>.module.ts`; mapper + guard listed as providers.
- [ ] Test at `apps/api/test/<bc>/presentation/controllers/*.controller.test.ts` using InMemory repo, fake `StorageService`, `ConfigModule.forRoot({ load: [() => ({ API_WRITE_KEY: "test-key" })] })`.
- [ ] Test fixtures and body assertions use enum members (`CelebrationKindEnum.*`, `CelebrationStatusEnum.*`, `SectionKindEnum.*`).
- [ ] `pnpm --filter api typecheck && pnpm --filter api test` is green.

---

## Adding a new framework reference

Only NestJS 11 is supported here. If the project ever grows another HTTP runtime, create:

```
references/<framework-name>.md
examples/<name>.controller.<framework>.ts
```

and keep `controller-pattern.md` framework-agnostic above the canonical snippet.
