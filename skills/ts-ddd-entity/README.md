<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-entity

> Domain entities — `Entity` base, `create`/`tryCreate` with `Result.combine`, VO normalization, and state transitions via `cloneWith`.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-entity?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-entity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A dual create API, resolved** — `tryCreate(props): Result<T>` is canonical; `create(props): T` is a thin wrapper that delegates to `tryCreate` + `throwIfFailed()`. Never the reverse.
- **The Enum Rule (HARD)** — every closed-set field (status/kind/layout/provider/palette) is a string-backed TS enum with a type guard; compare against the enum member, never a string literal.
- **Base-class behavior you must know** — how `Entity`'s constructor auto-generates/normalizes `id`, `createdAt`/`updatedAt`/`deletedAt`, and why `cloneWith` deep-clones props with `structuredClone` before merging.
- **State-transition guidance** — `cloneWith(overrides)` for immutable swap-and-revalidate vs mutating `_field` + `this.touch()` for entities that own a mutable collection, with the criteria for choosing between them.
- **A `NEVER` list** covering the real pitfalls: storing un-normalized VO input, public setters, skipping array-element validation, and importing from the legacy `@ddd/shared` alias.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-entity

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-entity
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                    | What the agent does                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `"create a Product entity with a status field"`   | Emits `tryCreate`/`create`, an enum-backed status, and typed getters over `Entity<Type, Props>` |
| `"add a publish() transition to Celebration"`     | Adds a named domain method that mutates `_field` + calls `this.touch()`                         |
| `"review this entity for raw string comparisons"` | Flags `=== "published"` style checks against the Enum Rule (HARD)                               |
| `"validate an array of nested Section entities"`  | Loops and validates element-by-element via `Result.combine` or a manual `errors[]` accumulator  |

## Contents

| File                              | Content                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                        | Trigger conditions, before-you-start checklist, Enum Rule (HARD), base-class behavior, core rules, and NEVER list.                                                       |
| `references/entity-pattern.md`    | Real paths, canonical `tryCreate` snippet, enum-driven validation, array/nested-entity pattern, `cloneWith` vs mutable-collection mutation, test layout, pitfalls table. |
| `examples/product.entity.ts`      | A self-contained reference entity with an enum-driven status field, demonstrating `tryCreate`/`create`.                                                                  |
| `examples/product.entity.test.ts` | Test coverage for the reference entity, including invalid-enum and nested-validation cases.                                                                              |

## License

MIT — see [LICENSE](./LICENSE).
