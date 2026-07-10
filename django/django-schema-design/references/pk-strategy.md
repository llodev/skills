# Primary Key Strategy (Django)

Guide for choosing between incremental PK, UUID (v4), and UUIDv7 in Django models.

---

## Summary by type

| Type        | Django                          | Predictable? | Time-ordered?      | Typical use                         |
| ----------- | ------------------------------- | ------------ | ------------------ | ----------------------------------- |
| Incremental | `AutoField` / `BigAutoField`    | Yes          | Yes (ascending)    | Invoices, categories, catalog       |
| UUID v4     | `UUIDField(default=uuid.uuid4)` | No           | No                 | Users, tenants, sensitive resources |
| UUID v7     | `UUIDv7Field()` (custom)        | No           | Yes (time-ordered) | Audit log, events, queues           |

---

## When to use Incremental (BigAutoField / AutoField)

- **Generic** or catalog entity (invoices, products, categories).
- ID is **not exposed** in URL/API or not a target for enumeration.
- No requirement for unpredictability (e.g. admin always id=1 is not a security concern in your context).
- Simplicity and index performance (integer is smaller and fast).

**Django:**

```python
# settings or AppConfig
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

class Invoice(models.Model):
    # id BigAutoField implicit
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="invoices")
    number = models.CharField(max_length=32, unique=True)  # business number
```

---

## When to use UUID (v4)

- **Sensitive** or **exposed** resources (User, Tenant, API keys).
- Avoid **enumeration** and predictability: id=1, 2, 3 makes attacks easier (e.g. trying to alter user 1).
- **Globally unique** identifier without need for time ordering.

**Django:**

```python
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
```

---

## When to use UUIDv7

- Need **globally unique** ID and **chronological ordering by PK** (e.g. audit log, events, messages).
- UUIDv7 is **time-ordered**: ordering by `id` matches "creation time" without an extra index on `created_at`.
- Good for distributed systems where you don't want a central sequence.

**Django (PostgreSQL with uuid_generate_v7, Django 5.0+):**

```python
from django.db import models
from django.db.models.expressions import RawSQL

# Custom field (e.g. app.shared.models)
class UUIDv7Field(models.UUIDField):
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
```

**Requirements:** `db_default` needs Django 5.0+. Generate v7 in-DB via the `pg_uuidv7` extension (provides `uuid_generate_v7()`). On older Django, drop `db_default` and pass a Python-side `default=` calling a v7 generator instead.

## Storage & insert locality

- Django's `UUIDField` stores as native `uuid` (16 bytes) on PostgreSQL — do **not** let it degrade to `char(32)`, which doubles size and slows comparisons.
- v4's randomness scatters inserts across the PK B-tree → page splits, cache churn, higher write amplification on hot tables. v7 appends near the right edge like an integer PK, so insert locality is preserved.
- Net trade-off: v4 buys maximum unpredictability at an insert-throughput cost; v7 keeps unpredictability while restoring sequential-insert performance and free `ORDER BY id` chronology.

---

## Decision examples (principle, not rule)

| Entity     | Suggestion  | Brief reason                                            |
| ---------- | ----------- | ------------------------------------------------------- |
| Invoices   | Incremental | Generic entity; invoice number can be a separate field. |
| Users      | UUID        | Avoid predictable id=1 and enumeration in attacks.      |
| AuditLog   | UUIDv7      | Unique + chronological ordering by id.                  |
| Events     | UUIDv7      | Events ordered by generation time.                      |
| Categories | Incremental | Internal catalog, ID not sensitive.                     |
| API Keys   | UUID        | Unpredictable, exposed in tokens.                       |

---

## Migration: from incremental to UUID/UUIDv7

1. Add new UUID field (nullable).
2. Data migration: fill UUID for existing rows (generate v4 or v7 per row).
3. Update FKs in other tables to point to the new field (in steps, with temporary column if needed).
4. Make the UUID the PK and remove the old id column (or keep it as unique for temporary compatibility).

Use separate migrations and test rollback; in production, prefer a maintenance window or blue/green strategy.

---

## References

- UUIDv7: [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562) (UUID version 7, time-ordered).
- Django: `BigAutoField`, `UUIDField`, `default_auto_field` in official documentation.
