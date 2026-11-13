<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/arc-decisions

> Transforme a ideia de um projeto em um brief de arquitetura: escopo, fronteiras, stack, plano de entrega e os ADRs que registram as decisões.

[![npm](https://img.shields.io/npm/v/@llodev/arc-decisions?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/arc-decisions)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/arc-decisions

# Vercel CLI
npx skills add llodev/skills/skills/arc-decisions
```

Sem MCP, sem config, sem init. É uma skill de conhecimento puro. Depois de instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                                           | O que o agente faz                                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `"quero criar um SaaS de agendamento para clínicas, dois devs, 10 semanas"` | Faz o intake, corta o MVP, recomenda estilo e stack, e propõe os primeiros ADRs            |
| `"monólito ou microsserviços para este sistema de pedidos?"`                | Verifica o estágio e os gatilhos de divisão, e responde com evidência e gatilho de revisão |
| `"escreva o ADR para escolher PostgreSQL com row-level security"`           | Escreve um ADR com contexto, alternativas, consequências negativas e gatilhos de revisão   |
| `"revise esta arquitetura antes de construirmos"`                           | Confronta a proposta com os anti-patterns e com a checklist de modos de falha              |

## Conteúdo

| Arquivo                                       | Conteúdo                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Regras de operação, fluxo de dez etapas, profundidade por estágio, saída e modo de revisão. |
| `references/intake-and-scope.md`              | Perguntas de intake, o brief de uma página e o corte de escopo do MVP.                      |
| `references/domain-and-boundaries.md`         | Subdomínios, contextos delimitados, agregados e sinais de fronteira errada.                 |
| `references/architecture-style.md`            | Monólito modular por padrão, gatilhos de divisão e extração.                                |
| `references/data-and-consistency.md`          | Banco padrão, consistência por fluxo, CAP e PACELC, e multi-tenancy.                        |
| `references/integration-and-async.md`         | Síncrono versus assíncrono, filas versus streams, outbox, sagas e CQRS.                     |
| `references/reliability-and-observability.md` | Telemetria desde o dia 1, timeouts, retries, circuit breakers e DLQs.                       |
| `references/tech-stack-selection.md`          | Critérios de stack, abordagem de front-end por tipo de negócio e hospedagem.                |
| `references/delivery-and-poc.md`              | Walking skeleton, ambientes, pipeline e migrações.                                          |
| `references/ai-native-systems.md`             | Fronteiras de agentes, MCP, RAG, guardrails, gateway de LLM e avaliações.                   |
| `references/adr.md`                           | Formato do ADR, quando escrever um e as regras para alterá-lo.                              |
| `anti-patterns/architecture.md`               | Dezesseis erros recorrentes de arquitetura, com a alternativa para cada um.                 |
| `examples/adr-0001-modular-monolith.md`       | Um ADR completo para um SaaS fictício de agendamento.                                       |
| `examples/intake-and-brief.md`                | Uma sessão de intake que termina em brief e tabela de decisões.                             |

## Licença

MIT — veja [LICENSE](../../LICENSE).
