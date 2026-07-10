<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/django/django-schema-design/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/django/django-schema-design/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/django/django-schema-design/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/django-schema-design

> Design production-ready Django database schemas — primary-key strategy, indexes, constraints, and safe migrations — with the non-obvious trade-offs an expert learned the hard way, not basic ORM syntax.

[![npm](https://img.shields.io/npm/v/@llodev/django-schema-design?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/django-schema-design)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/django-*` family.

What you get:

- **PK strategy that names the real axis** — not "unique vs not" (all are unique) but **random placement (UUIDv4) vs sequential placement (UUIDv7 / incremental)**, and why v4 as a hot-table PK fragments the index while v7 keeps insert locality.
- **A domain-interrogation frame** — identity, cardinality/ownership, lifecycle, access paths — to settle before any field exists.
- **An indexes & constraints expert layer** — composite column ordering, covering (`include`) and partial indexes, `Unique`/`Check`/`Exclusion` constraints, B-tree/GIN/GiST/BRIN selection, and when to denormalize instead of adding another index.
- **Migration safety** — batched backfills, concurrent index creation on live tables, reversibility, and the staged PK-swap procedure.
- **A `NEVER` list** with the reasons experience teaches (FloatField money drift, sequential PK → IDOR, v4-on-hot-tables, in-place PK swaps, implicit `on_delete`).

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/django-schema-design

# Vercel CLI
npx skills add llodev/skills/django/django-schema-design
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                          | What the agent does                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `"design Django models for invoices and line items"`    | Runs the domain frame + PK decision flow, emits `models.py` with rationale  |
| `"should this event table use UUID or auto increment?"` | Applies the exposure + insert-locality axes → UUIDv7 with the reasoning     |
| `"migration to switch users to a UUID PK"`              | Staged, reversible add→backfill→repoint→swap procedure                      |
| `"review this schema"`                                  | Checks PK choice, `on_delete`, constraints, index ordering against the list |

## Contents

| File                                     | Content                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `SKILL.md`                               | Domain frame, PK decision flow, NEVER list, and verification checklist. |
| `references/pk-strategy.md`              | Incremental vs UUIDv4 vs UUIDv7, storage/collation, and PK migration.   |
| `references/indexing-and-constraints.md` | Composite/covering/partial indexes, constraints, index types, EXPLAIN.  |

## License

MIT — see [LICENSE](./LICENSE).
