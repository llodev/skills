<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/tests-http

> Gere e sincronize suítes `.http` com cobertura completa para APIs HTTP — descoberta de projeto, adaptadores NestJS e DRF, sem rotas inventadas.

[![npm](https://img.shields.io/npm/v/@llodev/tests-http?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/tests-http)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/tests`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/tests-http

# Vercel CLI
npx skills add llodev/skills/skills/tests-http
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                               | O que o agente faz                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `"write .http tests for the orders controller"` | Descobre o projeto, lê o handler e emite um arquivo `.http` com cobertura completa |
| `"sync http tests after the new filter"`        | Faz diff e estende o arquivo existente; não apaga tudo                             |
| `"review this .http file"`                      | Verifica rotas, filtros, negativos de auth e valores inventados contra o código    |

## Conteúdo

| Arquivo                           | Conteúdo                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `SKILL.md`                        | Fluxo de trabalho, seleção de framework e checklist de verificação.           |
| `references/project-discovery.md` | Prioridade de config, descoberta no repositório, quando perguntar ao usuário. |
| `references/common.md`            | Convenções compartilhadas de `.http`.                                         |
| `references/nestjs.md`            | Mapeamento de rotas NestJS a partir do código (sem caminhos fixos).           |
| `references/drf.md`               | Mapeamento de rotas DRF a partir do código (sem caminhos fixos).              |
| `examples/`                       | Modelo de config opcional e esqueletos `.http` mínimos NestJS/DRF.            |

## Licença

MIT — veja [LICENSE](../../LICENSE).
