<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/arc-decisions/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/arc-decisions

> Convierte la idea de un proyecto en un brief de arquitectura: alcance, fronteras, stack, plan de entrega y los ADR que registran las decisiones.

[![npm](https://img.shields.io/npm/v/@llodev/arc-decisions?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/arc-decisions)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/arc-decisions

# Vercel CLI
npx skills add llodev/skills/skills/arc-decisions
```

Sin MCP, sin configuración, sin init. Es una skill de conocimiento puro. Una vez instalada, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                                     | Qué hace el agente                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `"quiero crear un SaaS de citas para clínicas, dos devs, 10 semanas"` | Hace el intake, recorta el MVP, recomienda estilo y stack, y propone los primeros ADR             |
| `"¿monolito o microservicios para este sistema de pedidos?"`          | Revisa la etapa y los disparadores de división, y responde con evidencia y disparador de revisión |
| `"escribe el ADR para elegir PostgreSQL con row-level security"`      | Escribe un ADR con contexto, alternativas, consecuencias negativas y disparadores de revisión     |
| `"revisa esta arquitectura antes de construirla"`                     | Contrasta la propuesta con los anti-patterns y la lista de modos de fallo                         |

## Contenido

| Archivo                                       | Contenido                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Reglas de operación, flujo de diez pasos, profundidad por etapa, salida y modo de revisión. |
| `references/intake-and-scope.md`              | Preguntas de intake, el brief de una página y el recorte de alcance del MVP.                |
| `references/domain-and-boundaries.md`         | Subdominios, contextos delimitados, agregados y señales de frontera incorrecta.             |
| `references/architecture-style.md`            | Monolito modular por defecto, disparadores de división y extracción.                        |
| `references/data-and-consistency.md`          | Almacén por defecto, consistencia por flujo, CAP y PACELC, y multi-tenancy.                 |
| `references/integration-and-async.md`         | Síncrono frente a asíncrono, colas frente a streams, outbox, sagas y CQRS.                  |
| `references/reliability-and-observability.md` | Telemetría desde el día 1, timeouts, reintentos, circuit breakers y DLQ.                    |
| `references/tech-stack-selection.md`          | Criterios de stack, enfoque de front-end por tipo de negocio y hosting.                     |
| `references/delivery-and-poc.md`              | Walking skeleton, entornos, pipeline y migraciones.                                         |
| `references/ai-native-systems.md`             | Fronteras de agentes, MCP, RAG, guardrails, gateway de LLM y evaluaciones.                  |
| `references/adr.md`                           | Formato del ADR, cuándo escribirlo y las reglas para cambiarlo.                             |
| `anti-patterns/architecture.md`               | Dieciséis errores recurrentes de arquitectura, con la alternativa de cada uno.              |
| `examples/adr-0001-modular-monolith.md`       | Un ADR completo para un SaaS ficticio de citas.                                             |
| `examples/intake-and-brief.md`                | Una sesión de intake que termina en un brief y una tabla de decisiones.                     |

## Licencia

MIT — ver [LICENSE](../../LICENSE).
