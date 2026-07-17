<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-domain-service

> Domain services for logic that spans entities — stateless policies and calculators returning `Result`, with the boundary rules that keep I/O out of the pure domain layer.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-domain-service?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-domain-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A placement decision table** — Domain Service vs inline-in-use-case vs Application Service vs entity method, resolved by ownership, I/O need, and reuse, so logic lands in the right layer the first time.
- **Purity rules with teeth** — no repository, no `@nestjs/*`, no `firebase-admin`, no `Date.now()`/`Math.random()` inside a domain service; non-determinism is injected as a parameter, never called inline.
- **Naming and shape conventions** — `*Policy`, `*Calculator`, `*Resolver`, `*Specification`, static methods by default, `Result.fail("DOMAIN_ERROR_CODE")` on failure, `Result.combine` for multi-error aggregation.
- **The I/O escape hatch documented, not improvised** — when a rule needs a repository or retries, it names the exact home (`application/services/<name>.service.ts`, `@Injectable()`, DI tokens) instead of smuggling I/O into the domain layer.
- **A `NEVER` list** covering the real failure modes: duplicating logic already on an entity, branching on raw string literals instead of enum members, and reserving `execute` exclusively for `UseCase<IN, OUT>`.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-domain-service

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-domain-service
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                         | What the agent does                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `"add a rule that checks stock across two aggregates"` | Places it as a Domain Service (`*Calculator`), pure and deterministic, returning `Result`   |
| `"this permission check needs a repository lookup"`    | Redirects it to an Application Service in `application/services/`, not a Domain Service     |
| `"review this domain service for framework leakage"`   | Checks for `@nestjs/*`, `firebase-admin`, or non-deterministic calls against the NEVER list |
| `"where does this cross-entity rule belong?"`          | Walks the Domain Service vs Use Case vs Application Service decision table                  |

## Contents

| File                                         | Content                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                   | Trigger conditions, before-you-start checklist, placement decision table, core rules, and NEVER list.                                                            |
| `references/domain-service-pattern.md`       | File paths, canonical `*Policy` and `*Calculator` snippets, closed-set enum rule, test strategy, implementation checklist, and the application-service contrast. |
| `examples/permission-policy.service.ts`      | A `*Policy`-style domain service: a stateless boolean check over multiple domain objects.                                                                        |
| `examples/permission-policy.service.test.ts` | Test coverage for the permission policy, exercising both allow and deny paths.                                                                                   |
| `examples/stock-calculator.service.ts`       | A `*Calculator`-style domain service: a pure cross-entity computation returning `Result`.                                                                        |

## License

MIT — see [LICENSE](./LICENSE).
