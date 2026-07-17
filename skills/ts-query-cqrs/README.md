<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-query-cqrs

> Read-side CQRS queries — `*Query` ports, `find-*` read use cases, DTO projections, pagination/filters, and Prisma/InMemory adapters.

[![npm](https://img.shields.io/npm/v/@llodev/ts-query-cqrs?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-query-cqrs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A Query vs Repository decision table** — display-a-list, dashboards, and paginated/filtered reads go through a `Query` returning a DTO; load-to-mutate goes through `Repository.findById` returning a domain entity.
- **A single-method contract** — `execute(input): Promise<Result<OutputDTO>>` is the only shape a Query interface exposes; no ORM imports, no database driver types leak into the core.
- **Row-to-DTO mapping, never row-to-entity** — the adapter maps database rows directly to the projection DTO; it never calls `toDomain` or reconstructs a domain entity.
- **A Prisma adapter reference** — explicit `select` clauses (never bare `findMany`), `$transaction` for atomic count + data in paginated queries, and conditional `WHERE` composition for optional filters.
- **A `NEVER` list** covering the real CQRS leaks: returning a domain entity from a Query, extending/instantiating the entity class from a DTO, and running two separate DB round-trips for data + count.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-query-cqrs

# Vercel CLI
npx skills add llodev/skills/skills/ts-query-cqrs
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                                   | What the agent does                                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `"add a paginated find-many-products query"`                     | Emits a `Query` interface + Prisma adapter with explicit `select`, atomic count, and `PaginatedResultDTO` |
| `"should loading before an update use a Query or a Repository?"` | Applies the Query vs Repository decision table — points to `Repository.findById`                          |
| `"review this query adapter for over-fetching"`                  | Flags a bare `findMany` without a `select` clause                                                         |
| `"write an in-memory mock for this query"`                       | Emits an InMemory adapter behind the same `Query` interface for use-case tests                            |

## Contents

| File                                          | Content                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Trigger conditions, before-you-start checklist, Query vs Repository decision table, core rules, and NEVER list. |
| `references/query-cqrs-pattern.md`            | Core contract, DTO modeling, in-memory mock, checklist.                                                         |
| `references/prisma-adapter.md`                | Prisma-specific adapter with `select`, `$transaction`, conditional `WHERE`.                                     |
| `examples/find-many-items.query.ts`           | A `Query` interface + Prisma adapter example with pagination and filters.                                       |
| `examples/in-memory-find-many-items.query.ts` | An in-memory mock of the same `Query` interface, for use-case tests without a database.                         |

## License

MIT — see [LICENSE](./LICENSE).
