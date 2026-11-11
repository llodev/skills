<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/tests-http

> Generate and sync full-coverage .http suites for HTTP APIs — project discovery, NestJS and DRF adapters, no invented routes.

[![npm](https://img.shields.io/npm/v/@llodev/tests-http?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/tests-http)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/tests` family.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/tests-http

# Vercel CLI
npx skills add llodev/skills/skills/tests-http
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                  | What the agent does                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `"write .http tests for the orders controller"` | Discovers the project, reads the handler, emits a full-coverage `.http` file   |
| `"sync http tests after the new filter"`        | Diff-and-extends the existing file; does not wipe it                           |
| `"review this .http file"`                      | Checks routes, filters, auth negatives, and invented values against the source |

## Contents

| File                              | Content                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `SKILL.md`                        | Workflow, framework selection, and verification checklist.         |
| `references/project-discovery.md` | Config priority, repo discovery, when to ask user, IDE rules.      |
| `references/common.md`            | Shared `.http` conventions.                                        |
| `references/nestjs.md`            | NestJS route mapping from source (no fixed paths).                 |
| `references/drf.md`               | DRF route mapping from source (no fixed paths).                    |
| `examples/`                       | Optional config template and minimal NestJS/DRF `.http` skeletons. |

## License

MIT — see [LICENSE](./LICENSE).
