<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/bi-dashboard

> Diseña dashboards y gráficos que afirman una conclusión antes de que el lector consulte un eje.

[![npm](https://img.shields.io/npm/v/@llodev/bi-dashboard?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/bi-dashboard)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/bi`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/bi-dashboard

# Vercel CLI
npx skills add llodev/skills/skills/bi-dashboard
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                        | Qué hace el agente                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `"build the revenue dashboard"`          | Explora el proyecto, calcula un ChartStory por gráfico y luego implementa   |
| `"review this dashboard"`                | Ejecuta la exploración y el checklist final y propone ediciones priorizadas |
| `"this chart title just names the axis"` | Reescribe el título como la conclusión y anota el destacado                 |

## Contenido

| Archivo    | Contenido                                                                       |
| ---------- | ------------------------------------------------------------------------------- |
| `SKILL.md` | Fases 0–5, las cuatro reglas de gráfico, recetas de stack y el checklist final. |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
