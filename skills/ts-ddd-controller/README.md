<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-controller

> HTTP controllers in a TypeScript + DDD API — routes, guards, Zod validation, use-case orchestration, and Result→HTTP mapping, with the NEVER list that keeps controllers thin.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-controller?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-controller)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A thin-translator contract** — controllers validate at the boundary, inject use cases, and map `Result` → HTTP with `mapResultToHttp`; no business logic, no domain conditionals, no repository calls in a handler.
- **Guard placement rules** — per-method `@UseGuards(ApiKeyGuard)` on mutations, never at the class level, so public reads and guarded writes can coexist on the same controller.
- **A NestJS 11 reference layer** — DI symbol tokens, `@Inject(SYMBOL)`, `@Global()` modules, Zod-validated `ConfigModule.forRoot`, and the `@nestjs/testing` + `supertest` test bed actually used in production code.
- **Response-mapper discipline** — signed-URL enrichment, date serialization, and tagged-union variants funnel through a dedicated mapper instead of leaking entity internals.
- **A `NEVER` list** grounded in real failure modes: class-level guards that 401 public reads, inline `HttpException` throws that fork the error-code catalog, `new UseCase(...)` that breaks DI and tests.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-controller

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-controller
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                      | What the agent does                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `"add a POST /celebrations/:slug/publish endpoint"` | Emits a controller method with `ApiKeyGuard`, `ZodValidationPipe`, `mapResultToHttp` |
| `"why is this write endpoint returning 401?"`       | Checks guard placement (class-level vs per-method) against the NEVER list            |
| `"review this controller"`                          | Checks for business logic leakage, `new UseCase()`, raw `HttpException` throws       |
| `"wire this controller's response for signed URLs"` | Routes entity → response through a dedicated response mapper                         |

## Contents

| File                                    | Content                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                              | Trigger conditions, folder layout, before-you-start checklist, core rules, and NEVER list for controllers.                     |
| `references/controller-pattern.md`      | Repo-grounded: folder layout, `ZodValidationPipe`, `ApiKeyGuard` semantics, `mapResultToHttp`, response mapper, test strategy. |
| `references/nestjs.md`                  | NestJS 11 patterns: DI symbol tokens, `@Inject(SYMBOL)`, `@Global()` modules, Zod-validated `ConfigModule.forRoot`, test bed.  |
| `examples/product.controller.nestjs.ts` | Runnable-style mirror of a production controller, showing guard placement and `Result` → HTTP mapping.                         |

## License

MIT — see [LICENSE](./LICENSE).
