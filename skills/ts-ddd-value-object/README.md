<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-value-object

> Value objects — `ValueObject` + `Result`, closed-set and composite VOs, `tryCreate`/`create`, and normalize-before-validate discipline.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-value-object?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-value-object)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A reuse-first checklist** — before creating a new VO, checks whether a configurable `Text`/`Number` base already covers it via `ValueObjectConfig` (`minLength`/`maxLength`, `minValue`/`maxValue`).
- **The closed-set VO pattern (mandatory)** — every closed set of allowed values is a string-backed TS enum with `Object.values` deriving the catalog tuple; never a raw `as const` string tuple, never a string-literal comparison at the call site.
- **Constructor-visibility rules** — `private` for leaf VOs, `protected` for VOs designed to be extended (`Text`, `Id`-style), with the reasoning for each.
- **Composite VO handling** — object-shaped VOs (like `ImageRef`) collect errors into an array and `Result.fail(errors)` instead of throwing on the first bad field.
- **A `NEVER` list** covering the sharp edges: validating before normalizing, the `typeof + isNaN` double guard on numeric VOs, self-importing a shared VO via the package alias instead of the relative `../base` barrel.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-value-object

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-value-object
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                        | What the agent does                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `"create a PaletteKey value object"`                  | Emits an enum-backed closed-set VO with `tryCreate`/`create`, `Object.values`, and a type guard |
| `"do I need a new VO for this bounded string field?"` | Checks reuse against `Text.tryCreate(v, { minLength, maxLength })` before creating a new class  |
| `"review this VO for validate-before-normalize bugs"` | Flags validation that runs before trim/lowercase/accent-strip normalization                     |
| `"add a composite ImageRef-style VO"`                 | Emits a VO that collects field errors into an array and returns `Result.fail(errors)`           |

## Contents

| File                                         | Content                                                                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                   | Trigger conditions, where VOs live, before-you-start checklist, constructor-visibility table, closed-set pattern, core rules, and NEVER list.                                                        |
| `references/vo-pattern.md`                   | Real file paths, annotated code for each VO flavor (simple, parametric, numeric, canonical-form, closed-set/enum, composite, ID with `required()`), import rules per scope, test coverage checklist. |
| `examples/palette-key.vo.ts`                 | A closed-set, enum-backed VO demonstrating the mandatory closed-set pattern.                                                                                                                         |
| `examples/palette-key.vo.test.ts`            | Test coverage for the palette-key VO, including invalid-value and normalization cases.                                                                                                               |
| `examples/celebration-slot-index.vo.ts`      | A BC-local numeric VO demonstrating the dual `tryCreate`/`create` API and config overrides.                                                                                                          |
| `examples/celebration-slot-index.vo.test.ts` | Test coverage for the BC-local numeric VO, including boundary and config-override cases.                                                                                                             |
| `examples/slug.vo.ts`                        | A normalizing scalar VO (trim/lowercase/accent-strip before validating).                                                                                                                             |

## License

MIT — see [LICENSE](./LICENSE).
