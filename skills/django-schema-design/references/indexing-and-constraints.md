# Indexing & Constraints (Django + PostgreSQL)

Deeper reference for the `Indexes & Constraints` section in SKILL.md. Load when tuning a real table's read performance or enforcing non-trivial invariants — not for a plain add-a-field task.

---

## Composite index column order

An index on `(a, b, c)` serves a **left-prefix** of its columns: queries on `a`, `(a, b)`, and `(a, b, c)` — never on `b` alone, `c` alone, or `(b, c)`. Order columns by:

1. Columns used in **equality** filters first (`tenant_id=?`, `status=?`).
2. Then the column used in **range/order** (`-created_at`).

```python
# Serves: tenant's orders; tenant+status; tenant+status newest-first.
# Does NOT serve: status alone, created_at alone.
models.Index(fields=["tenant_id", "status", "-created_at"])
```

A range condition (`>`, `<`, `BETWEEN`, `ORDER BY`) should be the **last** used column — everything after it in the index can't be used for further filtering.

## Covering indexes (`include`)

If a hot query filters on `(a, b)` and only reads column `c`, add `c` as a non-key payload so the read is index-only (no heap fetch):

```python
models.Index(fields=["tenant_id", "status"], include=["total"], name="ord_cover")
```

Use sparingly — `include` columns inflate index size and every write updates them.

## Partial indexes

Index only the rows you query. Cheaper, smaller, and the only way to scope uniqueness:

```python
# Uniqueness only among live rows (soft delete).
models.UniqueConstraint(
    fields=["email"],
    condition=models.Q(deleted_at__isnull=True),
    name="uniq_active_email",
)

# Index only the "open" rows if that's all you ever filter hot.
models.Index(
    fields=["created_at"],
    condition=models.Q(status="open"),
    name="idx_open_orders",
)
```

## Constraint types and where they belong

| Invariant                                        | Enforce with                                      | Why in the DB                                     |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| Uniqueness (possibly scoped)                     | `UniqueConstraint` (+ `condition`)                | App-level checks race under concurrency           |
| Value rule (`qty > 0`, `end >= start`)           | `CheckConstraint`                                 | A stray script/shell bypasses app code            |
| Cross-column exclusivity (no overlapping ranges) | `ExclusionConstraint` (`django.contrib.postgres`) | Only the DB can enforce "no two bookings overlap" |
| Referential integrity                            | `ForeignKey(on_delete=...)`                       | `on_delete` encodes lifecycle ownership           |

```python
from django.db.models import Q, CheckConstraint

class Reservation(models.Model):
    class Meta:
        constraints = [
            CheckConstraint(check=Q(end_at__gt=models.F("start_at")), name="end_after_start"),
        ]
```

## Index type selection (PostgreSQL)

- **B-tree** (default) — equality, range, ordering. 95% of cases.
- **GIN** — `JSONField` containment, `ArrayField` membership, full-text `SearchVector`. Use `django.contrib.postgres.indexes.GinIndex`.
- **GiST / BRIN** — geometric/range types (GiST) or huge append-only tables where physical order tracks a column, e.g. time-series (BRIN, tiny and cheap).

## FK indexing pitfalls

- Django **auto-creates** an index on every single-column FK. Re-declaring `db_index=True` on an FK makes a **duplicate** index — pure write overhead.
- FKs you filter _in combination_ (e.g. `WHERE tenant_id=? AND owner_id=?`) need a **composite** index; the two single-column auto-indexes don't cover it.

## When indexing is the wrong answer

If a hot read needs 4+ joins, adding a 5th index treats the symptom. Options in order of preference:

1. `select_related` (forward FK / one-to-one → SQL join) vs `prefetch_related` (reverse / M2M → second query). Wrong choice = N+1 or a monster join.
2. Denormalize a single derived column (e.g. cache `line_item_count` on `Order`) and keep it correct with a signal or DB trigger.
3. A summary/materialized table for genuine aggregate reads.

Measure first: `queryset.explain(analyze=True)` shows whether an index is actually used and where the time goes. Add indexes for plans you've _seen_, not plans you _fear_.
