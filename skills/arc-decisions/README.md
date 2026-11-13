<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/arc-decisions

> Turn a project idea into an architecture brief: scope, boundaries, stack, delivery plan, and the ADRs that record the decisions.

[![npm](https://img.shields.io/npm/v/@llodev/arc-decisions?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/arc-decisions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/arc-decisions

# Vercel CLI
npx skills add llodev/skills/skills/arc-decisions
```

No MCP, no config, no init. It is a pure knowledge skill. Once installed, it activates on prompts like the ones below.

## Use

| Prompt example                                                     | What the agent does                                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `"I want to start a booking SaaS for clinics, two devs, 10 weeks"` | Runs intake, cuts the MVP, recommends a style and stack, and proposes the first ADRs      |
| `"monolith or microservices for this order system?"`               | Checks the stage and the split triggers, then answers with evidence and a revisit trigger |
| `"write the ADR for choosing PostgreSQL with row-level security"`  | Writes an ADR with context, alternatives, negative consequences, and revisit triggers     |
| `"review this architecture before we build it"`                    | Checks the proposal against the anti-patterns and the failure-mode checklist              |

## Contents

| File                                          | Content                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Operating rules, the ten-step workflow, stage-based depth, output, and review mode. |
| `references/intake-and-scope.md`              | Intake questions, the one-page brief, and MVP scope pruning.                        |
| `references/domain-and-boundaries.md`         | Subdomains, bounded contexts, aggregates, and boundary smells.                      |
| `references/architecture-style.md`            | Modular monolith by default, split triggers, and extraction.                        |
| `references/data-and-consistency.md`          | Default store, consistency per flow, CAP and PACELC, and tenancy.                   |
| `references/integration-and-async.md`         | Sync versus async, queues versus streams, outbox, sagas, and CQRS.                  |
| `references/reliability-and-observability.md` | Day-one telemetry, timeouts, retries, circuit breakers, and DLQs.                   |
| `references/tech-stack-selection.md`          | Stack criteria, front-end approach by business type, and hosting.                   |
| `references/delivery-and-poc.md`              | Walking skeleton, environments, pipeline, and migrations.                           |
| `references/ai-native-systems.md`             | Agent boundaries, MCP, RAG, guardrails, LLM gateway, and evals.                     |
| `references/adr.md`                           | ADR format, when to write one, and the rules for changing them.                     |
| `anti-patterns/architecture.md`               | Sixteen recurring architecture mistakes, with the alternative for each.             |
| `examples/adr-0001-modular-monolith.md`       | A complete ADR for a fictional scheduling SaaS.                                     |
| `examples/intake-and-brief.md`                | An intake session that ends in a brief and a decision table.                        |

## License

MIT — see [LICENSE](LICENSE).
