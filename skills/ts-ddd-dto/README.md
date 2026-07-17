<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-dto

> DTOs & contracts — Zod 4 schemas paired with `z.infer` types, enum-backed closed sets, and input/output/read projections shared across API and web.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-dto?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-dto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A single source of truth for the wire shape** — DTOs live in a per-bounded-context contracts package, consumed by both API and web; neither redefines wire types locally.
- **Schema-first typing** — the Zod schema is declared first and the TS type is derived via `z.infer`; hand-written interfaces that mirror a schema are a NEVER.
- **The enum → tuple → type → predicate pattern** — every closed set is a string-backed `XxxEnum`, with `z.literal(EnumName.X)` for discriminated-union branches and `z.nativeEnum(EnumName)` for full-set validators.
- **A DTO taxonomy that prevents leakage** — `CreateXxxDTO`/`UpdateXxxDTO`/`XxxFiltersDTO` (input) are never reused as `XxxResponseDTO` (output); CQRS read projections are their own shape.
- **A `NEVER` list** for the actual failure modes: inline string literals instead of enum members, transformation logic inside the DTO file, and pagination totals embedded inside the `data` array.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-dto

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-dto
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                         | What the agent does                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `"add a status field to the product DTO"`              | Checks whether the value is a closed set → adds/reuses an `XxxEnum`, wires `z.nativeEnum` |
| `"create a CreateProductDTO and a ProductResponseDTO"` | Emits separate Zod schemas + `z.infer` types for the write-input and read-output shapes   |
| `"this DTO needs a paginated list"`                    | Adds a `PaginatedResultDTO`-shaped projection with `data`/`meta` kept separate            |
| `"review these contracts for leaked wire types"`       | Checks for redefinitions outside `libs/contracts/<bc>` and raw string literals for enums  |

## Contents

| File                        | Content                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                  | Trigger conditions, contracts-package layout, DTO taxonomy, mandatory enum pattern, core rules, and NEVER list.                     |
| `references/dto-pattern.md` | Contracts-package layout, enum → tuple → type → predicate pattern, schema/DTO snippets, naming conventions, verification checklist. |
| `examples/product.dto.ts`   | A self-contained DTO example showing input, output, and enum-backed closed-set fields.                                              |

## License

MIT — see [LICENSE](./LICENSE).
