# Prisma Query Adapter — Reference

Load this file **in addition to** `query-cqrs-pattern.md` when implementing a Prisma-based query adapter.

See `examples/` directory in this skill for a complete standalone example.

---

## Standard Adapter Structure

```
apps/<app>/src/<domain>/find-<name>.prisma.ts   ← Prisma query adapter
apps/<app>/src/prisma/prisma.service.ts          ← shared PrismaService
```

---

## Canonical Prisma Query Adapter Snippet

The hardest part: paginated, filtered projection. The adapter maps rows **directly to DTO** — never calls `toDomain`.

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FindManyItemsQuery, FindManyItemsInputDTO, ItemListItem } from "@<module>/core";
import { Result, PaginatedResultDTO } from "@ddd/shared";

@Injectable()
export class FindManyItemsPrismaQuery implements FindManyItemsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: FindManyItemsInputDTO): Promise<Result<PaginatedResultDTO<ItemListItem>>> {
    try {
      const { page = 1, pageSize = 20, categoryId, active } = input;

      // Build WHERE clause conditionally — only include filters that were provided
      const where = {
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(active !== undefined ? { active } : {}),
        deletedAt: null, // soft-delete guard
      };

      // Single atomic transaction: data + count in one round-trip (no race condition)
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.item.findMany({
          where,
          select: { id: true, name: true, sku: true, active: true }, // never omit select
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.item.count({ where }),
      ]);

      return Result.ok({
        data: rows.map(this.toListItem),
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  // Maps a DB row to the DTO — never to a domain entity
  private toListItem(row: {
    id: string;
    name: string;
    sku: string;
    active: boolean;
  }): ItemListItem {
    return { id: row.id, name: row.name, sku: row.sku, active: row.active };
  }
}
```

Key rules visible in this snippet:

- `select` is explicit — fetches only fields the DTO needs, nothing more.
- `$transaction([findMany, count])` avoids a race condition between data and total.
- Conditional `WHERE` via spread — never build SQL strings or apply filters outside the clause.
- `toListItem` maps directly from raw DB row to DTO — no `toDomain`, no entity involved.
- Wrapped in `try/catch` — Prisma throws on connection/constraint errors.

---

## Prisma-Specific Checklist

- [ ] `@Injectable()` decorator present
- [ ] `PrismaService` injected via constructor
- [ ] `select` clause present on every `findMany` — no implicit full-row fetch
- [ ] `$transaction([findMany, count])` for paginated queries
- [ ] Conditional `WHERE` built with spread — not string concatenation
- [ ] `try/catch` wrapping the entire method body
- [ ] Private `toListItem` mapper maps row → DTO (not `toDomain`)
- [ ] Prisma types used only inside the adapter file, never in core

---

## Adding More Adapters

To add a new database adapter (Firestore, MongoDB, Supabase…), create:

```
references/<adapter-name>-adapter.md
examples/find-<name>.<adapter>.ts
```

Follow the same structure: snippet, adapter-specific checklist.
The core contract in `query-cqrs-pattern.md` and `SKILL.md` remain unchanged.
