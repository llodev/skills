# TypeScript DDD Query (CQRS Read Side) — Core Reference

## Standard Structure

```
libs/<module>/core/src/<domain>/provider/find-<name>.query.ts   ← query interface + DTOs
libs/<module>/core/test/<domain>/                               ← in-memory mock + tests
apps/<app>/src/<domain>/find-<name>.query.ts                    ← adapter implementation
```

Shared pagination contracts (from `@ddd/shared`):

- `PaginatedInputDTO`, `PaginationMetaDTO`, `PaginatedResultDTO<T>`

See `examples/` directory in this skill for complete standalone examples.

---

## Core Contract

The interface lives in `core` — no ORM imports, no database driver types:

```typescript
// libs/<module>/core/src/<domain>/provider/find-many-items.query.ts
import { Result, PaginatedResultDTO } from "@ddd/shared";

export interface ItemListItem {
  id: string;
  name: string;
  sku: string;
  active: boolean;
}

export interface FindManyItemsInputDTO {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  active?: boolean;
}

export interface FindManyItemsQuery {
  execute(input: FindManyItemsInputDTO): Promise<Result<PaginatedResultDTO<ItemListItem>>>;
}
```

For a single-item query:

```typescript
import { Result } from "@ddd/shared";

export interface ItemDetailDTO {
  id: string;
  name: string;
  roles: string[];
  createdAt: Date;
}

export interface FindItemByIdQuery {
  execute(input: { id: string }): Promise<Result<ItemDetailDTO>>;
}
```

---

## DTO Modeling Decision

| Situation                                                             | Strategy                  | Example                                                                              |
| --------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| DTO needs almost the same fields as `*Props`                          | Derive with `Omit`/`Pick` | `type RoleDTO = Omit<RoleProps, "permissionIds"> & { permissions: PermissionDTO[] }` |
| DTO needs a different shape (joins, computed fields)                  | Independent DTO           | `interface ItemListItem { id, name, sku, active }` — no coupling to `*Props`         |
| DTO needs to expand a relation (e.g., `categoryId` → `category.name`) | Independent DTO           | Create a join-based projection; `*Props` only has the FK                             |

**Never extend the entity class** — even if the shapes seem identical today, the entity will grow with domain methods and invariants that the DTO consumer should never receive.

---

## In-Memory Mock (for use case tests)

```typescript
// libs/<module>/core/test/<domain>/in-memory-find-many-items.query.ts
import {
  FindManyItemsQuery,
  FindManyItemsInputDTO,
  ItemListItem,
} from "../provider/find-many-items.query";
import { Result, PaginatedResultDTO } from "@ddd/shared";

export class InMemoryFindManyItemsQuery implements FindManyItemsQuery {
  public items: ItemListItem[] = []; // public: tests seed data before act

  async execute(input: FindManyItemsInputDTO): Promise<Result<PaginatedResultDTO<ItemListItem>>> {
    const { page = 1, pageSize = 20, categoryId, active } = input;

    let filtered = this.items;
    if (categoryId !== undefined)
      filtered = filtered.filter((i) => (i as any).categoryId === categoryId);
    if (active !== undefined) filtered = filtered.filter((i) => i.active === active);

    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);

    return Result.ok({
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }
}
```

Rules for mocks:

- `items` is `public` — tests seed data before `act` and assert final state directly.
- Apply the same filter logic as the production adapter — test expectations must reflect real behaviour.
- No `try/catch` — only fail in ways the production adapter would fail.

---

## Implementation Checklist

- [ ] Interface in `core` — no ORM or database driver imports
- [ ] `execute(input): Promise<Result<OutputDTO>>` signature
- [ ] DTO defined in `core` alongside the interface — no entity leaks
- [ ] Adapter maps rows directly to DTO — no `toDomain` call
- [ ] Paginated query counts records in a single atomic operation (no race condition)
- [ ] Adapter uses explicit field selection — no fetching all columns
- [ ] Conditional filters built dynamically — never hard-coded
- [ ] Adapter wrapped in `try/catch`
- [ ] In-memory mock implements the same interface for use case tests
- [ ] Mock `items` is public for test seeding

---

## Common Pitfalls

| Mistake                                | Why it breaks                                                                               | Fix                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| Return entity from query               | Exposes write-side invariants to consumers; any refactor of getters breaks the API contract | Map rows directly to DTO         |
| Select all columns                     | Fetches every column; becomes a silent perf trap as schema grows                            | Always declare fields explicitly |
| Two separate DB calls for data + count | Count and data can diverge between calls on concurrent writes                               | Use a single atomic operation    |
| Hard-coded filters                     | Optional filters become mandatory; impossible to call without all params                    | Build filters conditionally      |
| `toDomain` inside query adapter        | Constructs an entity only to immediately destructure it into a DTO; wastes CPU              | Map directly: `row → DTO`        |
