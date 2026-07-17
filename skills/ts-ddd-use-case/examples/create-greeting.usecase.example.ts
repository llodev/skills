/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Self-contained example for the `ts-ddd-use-case` skill.
 *
 * Demonstrates:
 *   - File location pattern: `apps/api/src/<bc>/application/usecases/<verb>-<noun>.usecase.ts`
 *   - Class name without `UseCase` suffix (`CreateGreeting`, not `CreateGreetingUseCase`)
 *   - `@Injectable()` + `@Inject(<TOKEN>)` NestJS wiring against a symbol token
 *   - Repository port interface injected, never the concrete adapter
 *   - Enum rule: discriminator/status fields typed with the contracts union,
 *     internal literals always written via enum members
 *   - `Result.ok` / `Result.fail` / `withFail` flow — never throws for expected failures
 *   - In-memory repository acting as a real-class substitute (NOT a Jest mock)
 *   - Jest test seeded with enum members; rejection path exercises an invalid enum
 *
 * In a real BC every import below would resolve via workspace aliases:
 *   `@acme/shared`            → libs/shared
 *   `@acme/greetings-contracts` → libs/contracts/greetings
 *   `@greetings/domain/entities`       → apps/api/src/greetings/domain/entities
 *   `@greetings/domain/repositories`   → apps/api/src/greetings/domain/repositories
 *   `@greetings/infra/memory`          → apps/api/src/greetings/infra/memory
 *
 * The collaborators are inlined here so the file is readable end-to-end.
 */

// ----------------------------------------------------------------------------
// Stand-ins for `@acme/shared`
// ----------------------------------------------------------------------------

interface Result<T> {
  readonly isOk: boolean;
  readonly isFailure: boolean;
  readonly instance: T;
  readonly errors: readonly string[];
  readonly withFail: Result<never>;
}

const Result = {
  ok<T>(value?: T): Result<T> {
    return {
      isOk: true,
      isFailure: false,
      instance: value as T,
      errors: [],
      get withFail(): Result<never> {
        throw new Error("withFail called on Result.ok");
      },
    };
  },
  fail<T = never>(...errors: string[]): Result<T> {
    const failure: Result<T> = {
      isOk: false,
      isFailure: true,
      get instance(): T {
        throw new Error("instance accessed on failed Result");
      },
      errors,
      get withFail(): Result<never> {
        return failure as unknown as Result<never>;
      },
    };
    return failure;
  },
};

export interface UseCase<IN, OUT> {
  execute(input: IN): Promise<Result<OUT>>;
}

// Tiny NestJS stand-ins so the file type-checks without `@nestjs/common`.
type ClassDecorator = (target: Function) => void;
const Injectable = (): ClassDecorator => () => undefined;
const Inject =
  (_token: symbol | string): ParameterDecorator =>
  () =>
    undefined;

// ----------------------------------------------------------------------------
// Stand-ins for `@acme/greetings-contracts`
// ----------------------------------------------------------------------------

export const GreetingStatusEnum = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const;
export type GreetingStatus = (typeof GreetingStatusEnum)[keyof typeof GreetingStatusEnum];

export const GreetingToneEnum = {
  WARM: "warm",
  FORMAL: "formal",
  PLAYFUL: "playful",
} as const;
export type GreetingTone = (typeof GreetingToneEnum)[keyof typeof GreetingToneEnum];

// ----------------------------------------------------------------------------
// Stand-ins for `@greetings/domain/entities`
// ----------------------------------------------------------------------------

interface GreetingProps {
  slug: string;
  tone: GreetingTone;
  title: string;
  status: GreetingStatus;
}

export class Greeting {
  private constructor(private readonly props: GreetingProps) {}

  static tryCreate(props: GreetingProps): Result<Greeting> {
    if (!props.slug || !/^[a-z0-9-]+$/.test(props.slug)) {
      return Result.fail("INVALID_GREETING_SLUG");
    }
    if (!Object.values(GreetingToneEnum).includes(props.tone)) {
      return Result.fail("INVALID_GREETING_TONE");
    }
    if (props.title.trim().length === 0) {
      return Result.fail("INVALID_GREETING_TITLE");
    }
    return Result.ok(new Greeting({ ...props }));
  }

  /** Throwing variant for happy-path test seeding. */
  static create(props: GreetingProps): Greeting {
    const r = Greeting.tryCreate(props);
    if (r.isFailure) throw new Error(r.errors.join(","));
    return r.instance;
  }

  get slug(): string {
    return this.props.slug;
  }
  get status(): GreetingStatus {
    return this.props.status;
  }
  get tone(): GreetingTone {
    return this.props.tone;
  }
  get title(): string {
    return this.props.title;
  }
}

// ----------------------------------------------------------------------------
// Stand-ins for `@greetings/domain/repositories`
// ----------------------------------------------------------------------------

export const GREETING_REPOSITORY = Symbol("GREETING_REPOSITORY");

export interface GreetingRepository {
  findBySlug(slug: string): Promise<Result<Greeting | null>>;
  save(greeting: Greeting): Promise<Result<void>>;
}

// ----------------------------------------------------------------------------
// Stand-ins for `@greetings/infra/memory`
// ----------------------------------------------------------------------------

export class InMemoryGreetingRepository implements GreetingRepository {
  private readonly bySlug = new Map<string, Greeting>();

  async findBySlug(slug: string): Promise<Result<Greeting | null>> {
    return Result.ok(this.bySlug.get(slug) ?? null);
  }

  async save(greeting: Greeting): Promise<Result<void>> {
    this.bySlug.set(greeting.slug, greeting);
    return Result.ok<void>(undefined);
  }
}

// ----------------------------------------------------------------------------
// THE USE CASE — this is the part you mirror in a real BC.
// ----------------------------------------------------------------------------

export interface CreateGreetingInput {
  slug: string;
  tone: GreetingTone; // enum-typed union, never `string`
  title: string;
}

@Injectable()
export class CreateGreeting implements UseCase<CreateGreetingInput, Greeting> {
  constructor(
    @Inject(GREETING_REPOSITORY)
    private readonly repo: GreetingRepository,
  ) {}

  async execute(input: CreateGreetingInput): Promise<Result<Greeting>> {
    // 1. Build the aggregate — entity owns every invariant.
    const built = Greeting.tryCreate({
      slug: input.slug,
      tone: input.tone,
      title: input.title,
      status: GreetingStatusEnum.DRAFT, // enum member, never the literal "draft"
    });
    if (built.isFailure) return built.withFail;

    // 2. Pre-condition: slug uniqueness across the BC.
    const existing = await this.repo.findBySlug(built.instance.slug);
    if (existing.isFailure) return existing.withFail;
    if (existing.instance) return Result.fail("SLUG_ALREADY_EXISTS");

    // 3. Persist and return the saved aggregate (not Result<void>).
    const saved = await this.repo.save(built.instance);
    if (saved.isFailure) return saved.withFail;
    return Result.ok(built.instance);
  }
}

// ----------------------------------------------------------------------------
// THE TEST — mirrors the canonical `*.usecase.test.ts` style.
// ----------------------------------------------------------------------------
// To make the file self-contained, the test is inlined below. In the real
// repo it lives at `apps/api/test/greetings/application/usecases/create-greeting.usecase.test.ts`.
// `describe` / `it` / `expect` are provided by Jest at runtime.
// ----------------------------------------------------------------------------

declare const describe: (label: string, fn: () => void) => void;
declare const it: (label: string, fn: () => Promise<void> | void) => void;
declare const expect: (v: unknown) => {
  toBe(v: unknown): void;
  toContain(v: unknown): void;
};

describe("CreateGreeting", () => {
  const validInput: CreateGreetingInput = {
    slug: "ola-mae",
    tone: GreetingToneEnum.WARM,
    title: "Olá, Mãe",
  };

  it("creates a fresh draft greeting", async () => {
    const repo = new InMemoryGreetingRepository();
    const r = await new CreateGreeting(repo).execute(validInput);
    expect(r.isOk).toBe(true);
    if (r.isFailure) return;
    expect(r.instance.slug).toBe("ola-mae");
    expect(r.instance.status).toBe(GreetingStatusEnum.DRAFT);
  });

  it("rejects duplicate slugs", async () => {
    const repo = new InMemoryGreetingRepository();
    await repo.save(
      Greeting.create({
        slug: "ola-mae",
        tone: GreetingToneEnum.WARM,
        title: "Pré-existente",
        status: GreetingStatusEnum.DRAFT,
      }),
    );
    const r = await new CreateGreeting(repo).execute(validInput);
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("SLUG_ALREADY_EXISTS");
  });

  it("propagates VO errors (invalid tone)", async () => {
    const repo = new InMemoryGreetingRepository();
    const r = await new CreateGreeting(repo).execute({
      ...validInput,
      tone: "bogus" as never,
    });
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("INVALID_GREETING_TONE");
  });
});
