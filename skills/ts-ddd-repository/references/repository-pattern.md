# TypeScript DDD Repository — Core Reference

## Real layout

```
apps/api/src/<bc>/
  domain/repositories/
    <name>.repository.ts          ← port (interface) + DI token
    index.ts                      ← barrel
  infra/
    firestore/
      firestore-<name>.repository.ts   ← @Injectable production adapter
      <name>.mapper.ts                 ← to/from Firestore + Result<Entity>
      index.ts
    memory/
      in-memory-<name>.repository.ts   ← test/dev adapter (no decorators)
      index.ts
  <bc>.module.ts                  ← wires { provide: <NAME>_REPOSITORY, useClass: Firestore<Name>Repository }

apps/api/test/<bc>/infra/
  firestore/firestore-<name>.repository.test.ts   ← fake-DB at the SDK boundary
  memory/in-memory-<name>.repository.test.ts      ← straight unit test
```

This skill does **not** use `CrudRepository` / `CreateRepository` / `FindByIdRepository`
helpers from a shared barrel. Each BC's port lists exactly the operations the use
cases need, named after intent (`save`, `findBySlug`, `listByStatus`, `saveSection`,
`deleteSection`). Reach for a generic `CrudRepository<T>` only if every BC ends up
needing the same four signatures — which is almost never true once aggregates have
subcollections or status filters.

See `examples/` for the standalone `Product` port + InMemory pair.

---

## Port + DI Token

The port lives in `domain/` — **no `firebase-admin`, no `@nestjs/*`, no Zod, no DTOs**:

```typescript
// apps/api/src/celebrations/domain/repositories/celebration.repository.ts
import type { Result } from "@acme/shared";
import type { CelebrationStatus } from "@acme/celebrations-contracts";
import type { Celebration, Section } from "../entities";

export const CELEBRATION_REPOSITORY = Symbol("CELEBRATION_REPOSITORY");

export interface CelebrationRepository {
  findBySlug(slug: string): Promise<Result<Celebration | null>>;
  listByStatus(status: CelebrationStatus): Promise<Result<Celebration[]>>;
  save(celebration: Celebration): Promise<Result<void>>;
  saveSection(slug: string, section: Section): Promise<Result<void>>;
  deleteSection(slug: string, sectionId: string): Promise<Result<void>>;
}
```

Rules visible in the snippet:

- The DI token symbol is exported **next to** the port — never invent it in the module file. Use cases inject with `@Inject(CELEBRATION_REPOSITORY) private readonly repo: CelebrationRepository`.
- The port re-exports types via `<bc>/domain/repositories/index.ts` so callers say `from "@celebrations/domain/repositories"`.
- Closed-set parameters are typed by **enums from the contracts package** (`CelebrationStatus` is a union backed by `CelebrationStatusEnum`), never raw `string`.
- `findBy*` may return `Result<Entity | null>` when "absent" is a legitimate, expected outcome (a slug not yet allocated). Use `Result.fail("<AGG>_NOT_FOUND")` only when absence is an error for the caller.

---

## DI Wiring

Bind the port symbol to the production adapter in the BC module:

```typescript
// apps/api/src/celebrations/celebrations.module.ts
@Module({
  providers: [
    { provide: CELEBRATION_REPOSITORY, useClass: FirestoreCelebrationRepository },
    // ...use cases that inject CELEBRATION_REPOSITORY
  ],
  exports: [CELEBRATION_REPOSITORY /* ...use cases that other modules import */],
})
export class CelebrationsModule {}
```

Tests swap the same token to `InMemoryCelebrationRepository` (or instantiate the use case directly with the in-memory adapter — no Nest container needed).

---

## InMemory Adapter

Always ships side-by-side with the Firestore adapter. Implements the same port so use-case
tests never have to mock individual methods.

```typescript
// apps/api/src/celebrations/infra/memory/in-memory-celebration.repository.ts
import { Result } from "@acme/shared";
import type { CelebrationStatus } from "@acme/celebrations-contracts";
import { Celebration, type CelebrationProps, type Section } from "@celebrations/domain/entities";
import type { CelebrationRepository } from "@celebrations/domain/repositories";

export class InMemoryCelebrationRepository implements CelebrationRepository {
  private readonly store = new Map<string, CelebrationProps>();

  async findBySlug(slug: string): Promise<Result<Celebration | null>> {
    const snap = this.store.get(slug);
    if (!snap) return Result.ok<Celebration | null>(null);
    const r = Celebration.tryCreate(structuredClone(snap));
    if (r.isFailure) return r.withFail;
    return Result.ok<Celebration | null>(r.instance);
  }

  async listByStatus(status: CelebrationStatus): Promise<Result<Celebration[]>> {
    const out: Celebration[] = [];
    for (const snap of this.store.values()) {
      if (snap.status !== status) continue;
      const r = Celebration.tryCreate(structuredClone(snap));
      if (r.isFailure) return r.withFail;
      out.push(r.instance);
    }
    return Result.ok(out);
  }

  async save(celebration: Celebration): Promise<Result<void>> {
    this.store.set(celebration.slug, celebration.toSnapshot());
    return Result.ok<void>(undefined);
  }
  // ...saveSection / deleteSection follow the same shape
}
```

Conventions for InMemory adapters:

- Store snapshots (`Entity.toSnapshot()`), not entity instances — keeps tests from accidentally mutating shared state.
- `structuredClone` on the way out so callers can't poke the internal `Map`.
- Re-run `Entity.tryCreate` on retrieval — if a future entity rule fails for stored data, the in-memory adapter will surface it in tests instead of letting silent corruption through.
- Match error codes (`CELEBRATION_NOT_FOUND`) exactly to what the Firestore adapter returns — tests depend on the codes.
- No `try/catch` — only fail in ways the production adapter would also fail (entity reconstruction, missing parent doc).

---

## Dual-Adapter Test Strategy

Each adapter has its own file under `apps/api/test/<bc>/infra/`:

- **InMemory test** — plain unit test of CRUD + edge cases (`CELEBRATION_NOT_FOUND`, ordering, idempotency).
- **Firestore test** — same scenarios, but constructed via a fake-DB that mimics the Firestore Admin SDK shape (see `firestore-adapter.md`). No real network calls; no emulator.

Where the behavior is identical between the two adapters (e.g. "round-trip a saved aggregate", "save overwrites existing sections"), the test bodies should look near-identical so divergence is obvious in a diff. When the behavior must differ (e.g. Firestore wholesale-replaces a subcollection while InMemory just overwrites the snapshot), call it out with a code comment.

### Enums in test fixtures

Repository tests build entities with **enum members** from `@acme/celebrations-contracts`, never raw string literals. This matches the entity rule and keeps a renamed enum value from silently passing the test:

```typescript
import {
  CelebrationKindEnum,
  CelebrationStatusEnum,
  SectionKindEnum,
} from "@acme/celebrations-contracts";

const c = Celebration.create({
  slug: "mae",
  kind: CelebrationKindEnum.MOTHERS_DAY,        // not "mothers_day"
  palette: "bordo",
  title: "T",
  status: CelebrationStatusEnum.DRAFT,           // not "draft"
  sections: [
    { id, order: 0, content: { type: SectionKindEnum.HERO, ... } },  // not "hero"
  ],
});
```

The same rule applies anywhere a closed-set discriminator appears (status, kind,
palette, layout, provider, role).

---

## Implementation Checklist

- [ ] Port file is under `<bc>/domain/repositories/` — zero `firebase-admin`, `@nestjs/*`, Zod, DTO imports
- [ ] DI token symbol (`<NAME>_REPOSITORY`) exported next to the interface
- [ ] Methods named after domain intent (`save`, `findBySlug`, `listByStatus`) — not generic `create`/`update`
- [ ] Closed-set parameters typed as enum unions from the contracts package
- [ ] Every method returns `Promise<Result<T>>` — no thrown errors in the normal flow
- [ ] `findBy*` returns `Result<T | null>` when "absent" is expected; `Result.fail("<AGG>_NOT_FOUND")` only when absence is a caller error
- [ ] Firestore adapter is `@Injectable()` and bound via the token in `<bc>.module.ts`
- [ ] InMemory adapter ships in `<bc>/infra/memory/`, implements the same port, matches the Firestore error codes
- [ ] `<name>.mapper.ts` holds `toFirestore` / `fromFirestore`; no inline mapping in operation methods
- [ ] Tests exist for both adapters under `apps/api/test/<bc>/infra/{firestore,memory}/`
- [ ] Test fixtures use enum members for status/kind/type/palette — never raw strings

---

## Common Pitfalls

| Mistake                                                  | Why it breaks                                                                | Fix                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `findBy*` returns `null` directly                        | Callers split logic between `Result` and `null` handling                     | Return `Result.ok<T \| null>(null)` or `Result.fail(...)`     |
| `firebase-admin` imported in `domain/repositories/`      | Domain layer becomes infra-dependent; can't be reused                        | Move type imports to the adapter only                         |
| `CrudRepository<T>` for an aggregate with subcollections | Generic CRUD names hide aggregate semantics (`saveSection`, `removeSection`) | Spell out the intent on the port                              |
| Read-projection method on the Repository                 | Returns an entity when the caller only needs DTO; leaks domain into the API  | Move to a separate `Query` interface (see `ts-query-cqrs`)    |
| Inline mapping in `findBy*` / `save`                     | Different load paths drift; entity rules silently bypassed                   | Extract `<name>.mapper.ts` with `toFirestore`/`fromFirestore` |
| Partial-field `update`                                   | Adapter has to know which fields changed → coupling, bugs                    | Use-case does `cloneWith`; adapter receives full aggregate    |
| Test fixture uses `"draft"` / `"hero"` literals          | A renamed enum value passes the test silently                                | Use `CelebrationStatusEnum.DRAFT`, `SectionKindEnum.HERO`     |
| Provider declared without the token                      | Nest can't inject an interface — runtime DI failure                          | Always use `{ provide: <NAME>_REPOSITORY, useClass: ... }`    |
| Test hits real Firestore                                 | Slow, flaky, leaks state across runs                                         | Use the fake-DB harness from `firestore-adapter.md`           |
