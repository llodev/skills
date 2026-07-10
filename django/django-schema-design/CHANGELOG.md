# @llodev/django-schema-design

## 0.1.0

First release. Knowledge skill for designing Django database schemas.

- **Primary-key strategy** — incremental vs UUIDv4 vs UUIDv7, framed around the two axes that actually decide it: enumeration exposure and index-insert locality (why v4's random B-tree placement hurts hot tables and v7 restores sequential inserts).
- **Domain-interrogation frame** — identity, cardinality/ownership, lifecycle, and access paths to settle before any field exists.
- **Indexes & constraints expert layer** — composite column ordering, covering (`include`) and partial indexes, `Unique`/`Check`/`Exclusion` constraints, index-type selection (B-tree/GIN/GiST/BRIN), and when denormalization beats another index.
- **Migration safety** — batched backfills, concurrent index creation on live tables, reversibility, and the staged PK-swap procedure.
- **`NEVER` list** with the non-obvious reasons (FloatField money drift, sequential PK → IDOR, v4-on-hot-tables, in-place PK swap, implicit `on_delete`).
- Progressive disclosure via `references/pk-strategy.md` and `references/indexing-and-constraints.md` with explicit load / do-not-load triggers.
- README available in English, Português (pt-BR), and Español (es-ES).
