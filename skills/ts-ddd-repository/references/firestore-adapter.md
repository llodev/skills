# Firestore Adapter — Repository Reference

Read **after** `repository-pattern.md`. The only production persistence stack in this
repo is the **Firebase Admin SDK** (`firebase-admin/firestore`). No Prisma, no
Mongoose, no Supabase clients. Storage (signed URLs) lives next to it but is not
the repository's concern.

---

## Standard Adapter Structure

```
apps/api/src/<bc>/infra/firestore/
  firestore-<name>.repository.ts   ← the @Injectable adapter (implements the port)
  <name>.mapper.ts                 ← toFirestore + fromFirestore (Result<Entity>)
  index.ts                         ← barrel

apps/api/src/shared/firebase/
  firestore.service.ts             ← exposes `db` (Firestore singleton)
```

The adapter receives `FirestoreService` (or a SDK-compatible fake) via constructor
injection and never reaches for the singleton through a global.

---

## Firebase Admin SDK Cheat Sheet

| Need                            | Snippet                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Get a root doc                  | `db.collection("celebrations").doc(slug).get()` → `DocumentSnapshot`           |
| Check existence                 | `snap.exists` (boolean) — always before `snap.data()`                          |
| Read field bag                  | `snap.data()` returns `Record<string, unknown> \| undefined`                   |
| Write a root doc (full replace) | `ref.set(toFirestore(entity))`                                                 |
| Write a subcollection doc       | `ref.collection("sections").doc(section.id).set(sectionToFirestore(s))`        |
| Delete a doc                    | `ref.delete()` / `ref.collection("sections").doc(id).delete()`                 |
| Query by field                  | `db.collection("celebrations").where("status", "==", status).get()`            |
| Ordered subcollection read      | `ref.collection("sections").orderBy("order").get()`                            |
| Iterate result docs             | `snap.docs.map(d => ({ id: d.id, data: d.data() }))`                           |
| `Date` ↔ Firestore `Timestamp`  | `Timestamp.fromDate(d)` / `ts.toDate()` (both from `firebase-admin/firestore`) |

`Timestamp` is the only persistence concern leaking into the mapper layer. The
domain entity always works in plain `Date`.

---

## Canonical Firestore Adapter Snippet

Production adapter shape — wrap every method in `try/catch` and return short
SCREAMING_SNAKE_CASE codes on failure:

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { Result } from "@acme/shared";
import type { CelebrationStatus } from "@acme/celebrations-contracts";
import { FirestoreService } from "@shared/firebase";
import type { CelebrationRepository } from "@celebrations/domain/repositories";
import { Celebration, type Section } from "@celebrations/domain/entities";
import {
  celebrationFromFirestore,
  celebrationToFirestore,
  type CelebrationFirestoreDoc,
} from "./celebration.mapper";
import {
  sectionFromFirestore,
  sectionToFirestore,
  type SectionFirestoreDoc,
} from "./section.mapper";

const COLLECTION = "celebrations";
const SECTIONS_SUB = "sections";

@Injectable()
export class FirestoreCelebrationRepository implements CelebrationRepository {
  // Narrow `FirestoreLike` interface (declared locally) keeps the adapter swappable
  // for the fake-DB used in tests — see "Fake-DB at the SDK boundary" below.
  constructor(@Inject(FirestoreService) private readonly firestore: FirestoreService) {}

  private docRef(slug: string) {
    return this.firestore.db.collection(COLLECTION).doc(slug);
  }

  async findBySlug(slug: string): Promise<Result<Celebration | null>> {
    try {
      const ref = this.docRef(slug);
      const snap = await ref.get();
      if (!snap.exists) return Result.ok<Celebration | null>(null);
      const meta = snap.data() as CelebrationFirestoreDoc;

      const sectionsSnap = await ref.collection(SECTIONS_SUB).orderBy("order").get();
      const sections: Section[] = [];
      for (const doc of sectionsSnap.docs) {
        const sr = sectionFromFirestore(doc.id, doc.data() as SectionFirestoreDoc);
        if (sr.isFailure) return sr.withFail;
        sections.push(sr.instance);
      }

      const c = celebrationFromFirestore(slug, meta, sections);
      if (c.isFailure) return c.withFail;
      return Result.ok<Celebration | null>(c.instance);
    } catch (e) {
      return Result.fail((e as Error).message ?? "FIRESTORE_READ_FAILED");
    }
  }

  async save(celebration: Celebration): Promise<Result<void>> {
    try {
      const ref = this.docRef(celebration.slug);
      await ref.set(celebrationToFirestore(celebration));

      // Wholesale replace: delete every existing section doc, then write the current ones.
      // NOT transactional — a partial failure leaves the subcollection partially empty.
      // Acceptable while volume is small; revisit with `db.batch()` / `runTransaction`
      // once sections grow past a few dozen per aggregate.
      const existing = await ref.collection(SECTIONS_SUB).get();
      for (const old of existing.docs) {
        await ref.collection(SECTIONS_SUB).doc(old.id).delete();
      }
      for (const s of celebration.sections) {
        await ref.collection(SECTIONS_SUB).doc(s.id).set(sectionToFirestore(s));
      }
      return Result.ok<void>(undefined);
    } catch (e) {
      return Result.fail((e as Error).message ?? "FIRESTORE_SAVE_FAILED");
    }
  }
}
```

Rules visible in the snippet:

- `@Injectable()` on the class; `@Inject(FirestoreService)` on the constructor param.
- `try/catch` wraps **every** I/O method; failure path returns `Result.fail("...")`.
- `snap.exists` is checked before `snap.data()` — never assume the doc is there.
- `findBy*` legitimately returns `Result.ok<T | null>(null)` for "absent". Mutation methods that need an existing parent doc return `Result.fail("CELEBRATION_NOT_FOUND")`.
- Mapper helpers (`celebrationToFirestore`, `celebrationFromFirestore`, `sectionToFirestore`, `sectionFromFirestore`) live in a sibling file — never inlined here.
- A non-atomic write documents its atomicity guarantees as a comment so the reader is not surprised on partial failure.

---

## Mappers (`<name>.mapper.ts`)

`toFirestore` returns the doc shape (plain object with `Timestamp`s). `fromFirestore`
returns `Result<Entity>` because it has to re-run `Entity.tryCreate` and may fail if
the persisted data drifted from the current invariants.

```typescript
// celebration.mapper.ts
import { Timestamp } from "firebase-admin/firestore";
import { Result } from "@acme/shared";
import { Celebration, type Section } from "@celebrations/domain/entities";

export interface CelebrationFirestoreDoc {
  kind: string;
  palette: string;
  title: string;
  status: string;
  ownerId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function celebrationToFirestore(c: Celebration): CelebrationFirestoreDoc {
  return {
    kind: c.kind,
    palette: c.palette,
    title: c.title,
    status: c.status,
    ownerId: c.ownerId,
    createdAt: Timestamp.fromDate(c.createdAt),
    updatedAt: Timestamp.fromDate(c.updatedAt),
  };
}

export function celebrationFromFirestore(
  slug: string,
  meta: CelebrationFirestoreDoc,
  sections: readonly Section[],
): Result<Celebration> {
  return Celebration.tryCreate({
    slug,
    kind: meta.kind,
    palette: meta.palette,
    title: meta.title,
    status: meta.status,
    ownerId: meta.ownerId ?? null,
    sections: sections.map((s) => ({
      id: s.id,
      order: s.order,
      content: s.content,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    createdAt: meta.createdAt.toDate(),
    updatedAt: meta.updatedAt.toDate(),
  });
}
```

Mapper rules:

- One `<name>.mapper.ts` per aggregate root **and** per nested entity that needs its own subcollection (`celebration.mapper.ts`, `section.mapper.ts`).
- The exported `XxxFirestoreDoc` interface is the document's wire shape — it lives in the mapper file, never in the port and never in the contracts package.
- `fromFirestore` runs `Entity.tryCreate` and propagates `Result` — no `throw`.
- Discriminated unions (`SectionContent`) are validated by an `isXxxKind` guard from the contracts package before reconstruction.

---

## Fake-DB at the SDK Boundary (test pattern)

Unit tests never hit Firestore or the emulator. They construct a fake that mimics
the SDK shape the adapter actually uses, and inject it through the same constructor.

```typescript
function makeFakeDb() {
  const store = new Map<string, Record<string, unknown>>();
  const subcollections = new Map<string, Map<string, Record<string, unknown>>>();

  const collection = (rootName: string) => ({
    doc(slug: string) {
      const docKey = `${rootName}/${slug}`;
      return {
        async get() {
          const data = store.get(docKey);
          return { exists: !!data, data: () => data };
        },
        async set(data: Record<string, unknown>) {
          store.set(docKey, data);
        },
        async delete() {
          store.delete(docKey);
        },
        collection(subName: string) {
          const key = `${docKey}/${subName}`;
          if (!subcollections.has(key)) subcollections.set(key, new Map());
          const sub = subcollections.get(key)!;
          return {
            doc(id: string) {
              return {
                async set(data: Record<string, unknown>) {
                  sub.set(id, data);
                },
                async delete() {
                  sub.delete(id);
                },
              };
            },
            async get() {
              return {
                docs: Array.from(sub.entries()).map(([id, data]) => ({
                  id,
                  data: () => data,
                })),
              };
            },
            orderBy() {
              return this;
            }, // fake: insertion-order is fine for tests
          };
        },
      };
    },
    where(field: string, op: string, value: unknown) {
      return {
        async get() {
          const matched = Array.from(store.entries())
            .filter(([key]) => key.startsWith(`${rootName}/`))
            .filter(([, data]) => (data as Record<string, unknown>)[field] === value);
          return {
            docs: matched.map(([key, data]) => ({
              id: key.split("/").pop()!,
              data: () => data,
            })),
          };
        },
      };
    },
  });
  return { collection, store, subcollections };
}

function makeRepo() {
  const fake = makeFakeDb();
  // adapter accepts `FirestoreService | FirestoreLike` so the fake slots straight in
  const repo = new FirestoreCelebrationRepository(fake as never);
  return { fake, repo };
}
```

Then drive the adapter with **enum members** (never raw strings):

```typescript
const c = Celebration.create({
  slug: "mae",
  kind: CelebrationKindEnum.MOTHERS_DAY,
  palette: "bordo",
  title: "T",
  status: CelebrationStatusEnum.DRAFT,
  sections: [],
});
await repo.save(c);

const r = await repo.findBySlug("mae");
expect(r.isOk).toBe(true);
if (r.isFailure || !r.instance) return;
expect(r.instance.slug).toBe("mae");
```

Fake-DB rules:

- Build only the methods the adapter actually calls (`get`, `set`, `delete`, `where`, `orderBy`, sub-`collection`). Do not implement the full SDK.
- `orderBy` returning `this` is fine when the test inserts already-ordered data — call it out if a test depends on actual sort.
- The fake's `store` / `subcollections` are returned so individual tests can seed pathological state without going through `save()`.
- Reuse the same `makeFakeDb` + `makeRepo` helpers across the file — duplicate setups age badly.

---

## When the `FirestoreService` Shape Changes (fallback playbook)

The adapter takes `FirestoreService` (or a `db`-shaped object) at construction; the
`makeFakeDb` harness mirrors **only** the shape the adapter consumes. When the SDK
boundary moves underneath you (e.g. `firebase-admin` major upgrade, swap to the
Firestore emulator, insertion of a wrapper layer like a `WithTracing` decorator),
update the fake in lockstep — otherwise the adapter compiles against the new SDK
and the test suite quietly keeps validating the old one.

Use this order:

1. **Diff the SDK methods the adapter actually calls.** Grep `this.firestore.` in
   `firestore-<name>.repository.ts` — that list is the contract the fake must
   satisfy.
2. **Extend `makeFakeDb`** to cover any new/renamed method (e.g. SDK v13 renamed
   `.get()` semantics, or you added `runTransaction`). Prefer a fuller fake over a
   selective mock — partial mocks (`jest.spyOn(this.firestore.db, "collection")`)
   hide the breakage by exercising only the path you remembered to stub.
3. **Re-run both adapter tests** (`firestore-<name>.repository.test.ts` **and**
   `in-memory-<name>.repository.test.ts`). If only one breaks, the fake drifted
   from the InMemory contract; align them before declaring the change green.
4. **If the change is non-trivial** (transactions, batched writes, listener APIs),
   add a focused test that exercises the new SDK surface against the extended
   fake — don't lean on existing tests to "probably cover it".
5. **Promote the narrow `FirestoreLike`** interface declared next to the adapter
   to mention the new method so TypeScript flags every call-site that needs an
   update.

Anti-pattern: casting `fake as never` / `as any` and silencing the type error.
That defeats the whole point of injecting the SDK at the boundary — if the cast
is needed, the fake is incomplete.

---

## When to Reach for `WriteBatch` / `runTransaction`

Use Firestore batching only when:

- The write spans multiple docs **and** the caller cannot tolerate partial application (e.g. moving a section from one celebration to another).
- The write needs to be conditioned on a current value the adapter just read (use `runTransaction`).

For single-aggregate writes that are eventually consistent (the current wholesale
section replace), document the trade-off in a comment instead of paying the
transaction overhead. Promote to a batch when volume justifies it.

---

## Firestore-Specific Checklist

- [ ] `@Injectable()` decorator present; constructor takes `FirestoreService` via `@Inject(FirestoreService)`
- [ ] Adapter declares (or accepts) a narrow `FirestoreLike` shape — so tests can pass a fake without `as any`
- [ ] Every method wrapped in `try/catch`; failure returns `Result.fail("SHORT_CODE")`
- [ ] `snap.exists` checked before `snap.data()`
- [ ] `findBy*` returns `Result.ok<T | null>(null)` for "absent" or `Result.fail("<AGG>_NOT_FOUND")` when absence is a caller error
- [ ] `Timestamp.fromDate` / `.toDate()` confined to the mapper file
- [ ] No raw string literals for closed-set fields — adapters trust the entity, tests pass enum members
- [ ] Subcollection writes that are non-atomic are commented as such
- [ ] Tests use a fake DB at the SDK boundary — no emulator, no network
- [ ] Both `firestore-<name>.repository.test.ts` and `in-memory-<name>.repository.test.ts` exist
