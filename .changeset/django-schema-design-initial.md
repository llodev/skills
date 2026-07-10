---
"@llodev/django-schema-design": minor
---

feat(django-schema-design): first release of the Django schema design knowledge skill

New `@llodev/django-*` family. `django-schema-design` guides Django database
schema decisions with the non-obvious trade-offs, not basic ORM syntax:

- **PK strategy** framed on the real axis — random placement (UUIDv4) vs
  sequential placement (UUIDv7 / incremental) — and why v4 as a hot-table PK
  fragments the index while v7 preserves insert locality and free `ORDER BY id`
  chronology.
- **Domain-interrogation frame** (identity, cardinality/ownership, lifecycle,
  access paths) to settle before any field exists.
- **Indexes & constraints expert layer**: composite column ordering, covering
  (`include`) and partial indexes, `Unique`/`Check`/`Exclusion` constraints,
  B-tree/GIN/GiST/BRIN selection, and when to denormalize instead of indexing.
- **Migration safety**: batched backfills, concurrent index creation on live
  tables, reversibility, and the staged PK-swap procedure.
- **`NEVER` list** with the reasons experience teaches.
- Progressive disclosure via `references/pk-strategy.md` and
  `references/indexing-and-constraints.md`, README in en-US / pt-BR / es-ES.

Also generalizes `scripts/checks/marketplace-parity.mjs` to resolve each
plugin's package directory from its `source.path`, so the parity gate is
family-agnostic (no longer hardcoded to `pm-tasks/`).
