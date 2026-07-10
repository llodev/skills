---
name: django-schema-design
description: Design robust Django database schemas with model best practices, migration patterns, and primary key strategy (incremental, UUID, UUIDv7). Use when designing Django models, choosing PK types, writing migrations, or reviewing app schema. Covers Django ORM, PostgreSQL, indexes, constraints, and security considerations for IDs.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - django
    - schema-design
    - orm
    - postgresql
  family: django
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# Django Schema Designer

Design production-ready Django schemas. The value here is **PK strategy** and the non-obvious trade-offs behind it — not basic ORM syntax.

---

## Quick Start

Describe your data model in Django terms:

```
design Django models for invoices, line items, and customers
```

**Include in your request:**

- Entities and relationships
- Whether IDs are exposed in URLs/APIs (security)
- Whether rows are inserted at high volume and read in creation order (audit, events, feeds)
- Scale hints (optional)

---

## Triggers

| Trigger             | Example                                         |
| ------------------- | ----------------------------------------------- |
| `Django models`     | "Django models for order management"            |
| `schema for Django` | "schema for Django app with users and roles"    |
| `design models`     | "design models for audit log"                   |
| `primary key`       | "should this model use UUID or auto increment?" |
| `UUIDv7`            | "use UUIDv7 for event table"                    |
| `Django migration`  | "migration to add UUID PK to existing table"    |

---

## Before you model, interrogate the domain

Fields are the easy part; the schema's shape is decided by four questions asked _before_ any field exists:

1. **Identity** — what makes a row the same row? If a natural key exists (email, ISO code, `(tenant, slug)`), enforce it as a `UniqueConstraint` even when you keep a surrogate PK. A schema with no uniqueness rule other than the auto-PK will silently accept duplicates.
2. **Cardinality & ownership** — for each relationship, which side _owns_ the lifecycle? That answer is your `on_delete` (`PROTECT` for accounting/audit rows you must never lose, `CASCADE` for true children, `SET_NULL` for optional links).
3. **Lifecycle** — is a row mutable, append-only, or soft-deleted? Append-only tables (events, audit) want UUIDv7 and no `updated_at`; soft-deleted tables need a partial unique index (below), not a plain `unique=True`.
4. **Access paths** — what are the 2–3 queries that run most? Those dictate indexes. Design indexes for reads you _have_, not reads you _imagine_.

---

## Primary Key Strategy

Choose **one** PK type per model. The decision hinges on two axes experts weigh and beginners miss: **enumeration exposure** and **index-insert locality**.

| PK type         | Django field               | When to use                                                                                    |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Incremental** | `BigAutoField`             | Internal/generic entity, ID never leaves the server, no ordering-by-id-across-shards need.     |
| **UUID (v4)**   | `UUIDField(default=uuid4)` | Enumeration must be impossible (User, Tenant, API key). Accept the insert-locality cost below. |
| **UUIDv7**      | Custom `UUIDv7Field`       | Unpredictable **and** inserted hot / read in creation order (audit, events, messages, feeds).  |

**Decision flow (principle, not rule):**

1. ID exposed in API/URL, or the entity is a sensitive target (User, Tenant, token)? → **UUID** family. Go to 2.
2. High insert rate, or you read rows in creation order? → **UUIDv7**. Else → **UUIDv4**.
3. None of the above (internal, generic)? → **BigAutoField**.

### The non-obvious reason UUIDv7 exists

A v4 UUID is **random**, so every insert lands at a random point in the primary-key B-tree. On a hot table this fragments the index, thrashes the buffer cache, and inflates write amplification — the classic "UUID PK killed our insert throughput" outcome.

**UUIDv7 is time-ordered**: new keys sort to the right of the tree, so inserts stay sequential like an integer PK — you keep unpredictability _and_ insert locality. It also lets you `ORDER BY id` as a proxy for creation time, **removing the need for a separate index on `created_at`** for feed/audit queries.

So the real axis isn't "unique vs not" (all three are unique) — it's **random placement (v4) vs sequential placement (v7/incremental)**.

**Examples (inspiration, not rules):**

- **Invoices** → incremental — internal id; the human-facing invoice number is a separate `unique` field.
- **Users / API keys** → UUIDv4 — enumeration and IDOR must be impossible; insert rate is low, so v4's locality cost is irrelevant.
- **AuditLog / Events** → UUIDv7 — unpredictable, hot inserts, read newest-first.

Details, storage/collation notes, and PK migration: [`references/pk-strategy.md`](references/pk-strategy.md).

---

## NEVER

- **NEVER** use `FloatField` for money — binary floats can't represent `0.10` exactly; you get silent rounding drift. Use `DecimalField(max_digits=..., decimal_places=2)`.
- **NEVER** put a sequential integer PK on a user-facing or sensitive entity — `id=1, 2, 3` in a URL invites enumeration and IDOR (walk from `/users/1/` upward). Use a UUID.
- **NEVER** reach for UUIDv4 as the PK of a high-insert table you read in creation order — random placement fragments the index; use UUIDv7 for insert locality.
- **NEVER** switch a live table's PK in a single migration — add-backfill-repoint-swap across separate, reversible migrations (see references).
- **NEVER** add a `ForeignKey` without an explicit `on_delete` — silent `CASCADE` deletes data; state intent (`PROTECT`, `SET_NULL`, `CASCADE`) every time.

---

## UUIDv7 Field (the one snippet worth keeping)

Requires **PostgreSQL** with a `uuid_generate_v7()` function (e.g. the `pg_uuidv7` extension) and **Django 5.0+** for `db_default`.

```python
from django.db import models
from django.db.models.expressions import RawSQL


class UUIDv7Field(models.UUIDField):
    """Time-ordered UUID PK generated in the database."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("primary_key", True)
        kwargs.setdefault("editable", False)
        kwargs.setdefault("db_default", RawSQL("uuid_generate_v7()", []))
        super().__init__(*args, **kwargs)


class AuditLog(models.Model):
    id = UUIDv7Field()
    actor_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    # No index on created_at needed: ORDER BY id is chronological.
```

Incremental (`BigAutoField`) and plain UUIDv4 (`UUIDField(default=uuid.uuid4, editable=False)`) PKs are standard Django — write them directly; no snippet needed.

---

## Indexes & Constraints (the expert layer)

The non-obvious wins live here, not in the field types.

**Composite index column order is not free.** An index on `(a, b)` also serves queries on `a` alone, but **not** on `b` alone. Order columns by selectivity/most-common-filter first. A `WHERE tenant_id=? AND status=?` query wants `Index(fields=["tenant_id", "status"])` — reversing it wastes the index for the tenant-only query you also run.

```python
class Order(models.Model):
    class Meta:
        indexes = [
            # Covers "tenant's open orders newest-first" in one index scan.
            models.Index(fields=["tenant_id", "status", "-created_at"]),
        ]
```

**Partial unique indexes beat `unique=True` for soft-delete and nullable-scoped uniqueness.** "Email unique among non-deleted users" is impossible with `unique=True`; use a condition:

```python
class Meta:
    constraints = [
        models.UniqueConstraint(
            fields=["email"],
            condition=models.Q(deleted_at__isnull=True),
            name="uniq_active_email",
        ),
    ]
```

**Push invariants into `CheckConstraint`, not just app code.** The DB is the only layer that can't be bypassed by a stray script or shell:

```python
models.CheckConstraint(check=models.Q(quantity__gt=0), name="qty_positive")
```

**FK indexing:** Django auto-indexes single-column FKs — do **not** re-declare `db_index=True` on them (duplicate index). Do add indexes for FKs you filter _in combination_ with other columns (composite, above).

**Model the FK design for the query, not just the diagram:** a deep FK chain you always traverse means `select_related` (SQL join); a reverse/many relation you fan out over means `prefetch_related` (second query). If a hot read forces 4 joins, that's a signal to denormalize a column, not to add a 4th index.

Covering (`include`) indexes, `ExclusionConstraint`, GIN/GiST/BRIN selection, and reading `EXPLAIN`: [`references/indexing-and-constraints.md`](references/indexing-and-constraints.md).

---

## Migrations (the parts that bite)

This is the low-freedom part — a wrong migration locks a table or drops data. Follow the sequence, don't improvise.

- Adding a **NOT NULL** column to a populated table: add nullable → data-migration backfill → alter to NOT NULL. One shot fails on existing rows.
- **Backfill in batches** on large tables — a single `UPDATE` over millions of rows takes a lock and bloats the transaction; iterate with `.filter(pk__gt=last).order_by("pk")[:batch]`.
- **Index creation on a live table** must be concurrent — a plain `CREATE INDEX` holds a write lock for the whole build. Use `AddIndexConcurrently` (from `django.contrib.postgres.operations`) with `atomic = False` on the migration.
- **Reversibility**: pair every `RunPython` with `reverse_code`; a migration you can't roll back is a migration you can't deploy safely.
- **Changing a live PK**: never in-place. See the staged add→backfill→repoint-FKs→swap procedure in [`references/pk-strategy.md`](references/pk-strategy.md).

---

## Verification Checklist

- [ ] Every model has a deliberate PK choice (incremental / UUIDv4 / UUIDv7), justified by exposure + insert pattern.
- [ ] No sequential PK on any URL-exposed or sensitive entity.
- [ ] Every `ForeignKey`/`OneToOneField` has an explicit `on_delete` reflecting lifecycle ownership.
- [ ] Natural keys enforced via `UniqueConstraint` (partial where soft-delete/nullable-scoped applies).
- [ ] Domain invariants pushed into `CheckConstraint`, not only app code.
- [ ] Composite indexes ordered by most-common-filter first; no duplicate `db_index` on single FKs.
- [ ] Monetary values use `DecimalField`, never `FloatField`.
- [ ] `created_at`/`updated_at` where relevant.
- [ ] Migrations reversible, backfilled in batches, indexes created concurrently on live tables.

---

## References

Load on demand — each file has a distinct trigger. Loading both for a simple task wastes context.

| File                                                                               | Load when                                                                                                                                                             | Do NOT load for                                                               |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`references/pk-strategy.md`](references/pk-strategy.md)                           | Choosing UUIDv4 vs UUIDv7 for a real table, or writing a PK-change migration. Storage/collation, per-type trade-offs, staged migration.                               | Picking a PK type when the decision flow above already settles it.            |
| [`references/indexing-and-constraints.md`](references/indexing-and-constraints.md) | Tuning a hot table's reads or enforcing non-trivial invariants: composite order, covering/partial indexes, `Check`/`Exclusion` constraints, GIN/GiST/BRIN, `EXPLAIN`. | A plain "add a field / add a model" task — the inline expert layer is enough. |

**Do NOT load either** for straightforward model or field additions.
