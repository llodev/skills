<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-use-case

> Application use cases — `UseCase<IN,OUT>`, `@Injectable()` + repo-port orchestration, and `Result.ok`/`fail`/`combine` for expected-failure handling.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-use-case?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-use-case)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A dependency decision table** — create vs state-transition vs nested-mutation vs list-by-filter vs allocate-unique-value, each mapped to the exact repository call and return shape.
- **The `UseCase<IN, OUT>` vs Application Service split** — a clean IN→OUT verb gets a `*.usecase.ts`; a reusable orchestrator without a clean shape (allocator, coordinator, resolver) gets `application/services/<name>.service.ts` instead.
- **Fail-early orchestration** — every `await` is followed by `if (X.isFailure) return X.withFail;`; use cases delegate invariants to the entity (`tryCreate`, `publish()`, `addSection()`) instead of re-validating VOs themselves.
- **DI wiring conventions** — `@Injectable()`, `@Inject(<TOKEN>)` against the port interface (never the concrete Firestore/InMemory class), and the barrel re-export discipline.
- **A `NEVER` list** covering the real failure modes: throwing for expected failures instead of returning `Result.fail`, mapping to HTTP inside a use case, and updating an aggregate without loading it first.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-use-case

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-use-case
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                          | What the agent does                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `"create a PublishCelebration use case"`                | Emits `UseCase<IN, OUT>` with `findBySlug` → `entity.publish()` → `save`, fail-early on each step |
| `"this orchestrator doesn't have a clean IN→OUT shape"` | Redirects it to `application/services/<name>.service.ts` (the `SlugAllocator` pattern)            |
| `"review this use case for HTTP mapping"`               | Flags any status-code logic and points it to the controller layer instead                         |
| `"write a use-case test with an in-memory repository"`  | Wires `InMemoryCelebrationRepository` via the DI token, using enum members in fixtures            |

## Contents

| File                                          | Content                                                                                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Trigger conditions, before-you-start checklist, dependency decision table, core rules, Result API notes, and NEVER list.                                                               |
| `references/use-case-pattern.md`              | Real file layout, canonical create/state-transition/nested-mutation/list snippets, the `application/services/` exception, test strategy, enum-fixture rules, implementation checklist. |
| `examples/create-greeting.usecase.example.ts` | A self-contained create-use-case + fake in-memory repository + Jest test using enum members from contracts.                                                                            |
| `examples/README.md`                          | How the example maps onto `SKILL.md`/`references/use-case-pattern.md`, and how to adapt it when scaffolding a new bounded context.                                                     |

## License

MIT — see [LICENSE](./LICENSE).
