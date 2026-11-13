<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/bi-dashboard

> Design dashboards and charts that state one conclusion before the reader checks an axis.

[![npm](https://img.shields.io/npm/v/@llodev/bi-dashboard?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/bi-dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/bi` family.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/bi-dashboard

# Vercel CLI
npx skills add llodev/skills/skills/bi-dashboard
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                           | What the agent does                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `"build the revenue dashboard"`          | Explores the project, computes one ChartStory per chart, then implements  |
| `"review this dashboard"`                | Runs exploration and the final checklist, then proposes prioritized edits |
| `"this chart title just names the axis"` | Rewrites the title as the conclusion and annotates the highlight          |

## Contents

| File                           | Content                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `SKILL.md`                     | Phase order, the four chart rules, and when to read each file.             |
| `references/explore.md`        | Stack discovery and the token-role map.                                    |
| `references/story.md`          | `ChartStory`, story functions, locale formatting, titles, SQL.             |
| `references/form.md`           | Which mark answers which question.                                         |
| `references/layout.md`         | Page hierarchy, KPI card, states, accessibility.                           |
| `references/capability-map.md` | The five capabilities, and which library to add when the project has none. |
| `references/react-recharts.md` | Recharts / shadcn recipe.                                                  |
| `references/echarts.md`        | ECharts recipe.                                                            |
| `references/vega-lite.md`      | Vega-Lite / Altair recipe.                                                 |
| `references/python.md`         | Plotly and matplotlib recipe.                                              |
| `references/ggplot2.md`        | ggplot2 recipe.                                                            |
| `references/bi-tools.md`       | Power BI, Looker Studio, Metabase, Superset, Grafana.                      |
| `anti-patterns/charts.md`      | Titles, color, grid, and untested story logic.                             |
| `references/verify.md`         | Render, number check, and the final checklist.                             |

## License

MIT — see [LICENSE](LICENSE).
