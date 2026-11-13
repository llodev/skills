<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/bi-dashboard/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/bi-dashboard

> Projete dashboards e gráficos que afirmam uma conclusão antes de o leitor conferir um eixo.

[![npm](https://img.shields.io/npm/v/@llodev/bi-dashboard?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/bi-dashboard)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/bi`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/bi-dashboard

# Vercel CLI
npx skills add llodev/skills/skills/bi-dashboard
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                        | O que o agente faz                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `"build the revenue dashboard"`          | Explora o projeto, calcula um ChartStory por gráfico e então implementa |
| `"review this dashboard"`                | Roda a exploração e o checklist final e propõe edições priorizadas      |
| `"this chart title just names the axis"` | Reescreve o título como a conclusão e anota o destaque                  |

## Conteúdo

| Arquivo                        | Conteúdo                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `SKILL.md`                     | Ordem das fases, as quatro regras de gráfico e quando ler cada arquivo.            |
| `references/explore.md`        | Descoberta da stack e o mapa de papéis dos tokens.                                 |
| `references/story.md`          | `ChartStory`, funções da história, formatação de locale, títulos, SQL.             |
| `references/form.md`           | Qual marca responde a qual pergunta.                                               |
| `references/layout.md`         | Hierarquia da página, card de KPI, estados, acessibilidade.                        |
| `references/capability-map.md` | As cinco capacidades e qual biblioteca adicionar quando o projeto não tem nenhuma. |
| `references/react-recharts.md` | Receita de Recharts / shadcn.                                                      |
| `references/echarts.md`        | Receita de ECharts.                                                                |
| `references/vega-lite.md`      | Receita de Vega-Lite / Altair.                                                     |
| `references/python.md`         | Receita de Plotly e matplotlib.                                                    |
| `references/ggplot2.md`        | Receita de ggplot2.                                                                |
| `references/bi-tools.md`       | Power BI, Looker Studio, Metabase, Superset, Grafana.                              |
| `anti-patterns/charts.md`      | Títulos, cor, grade e lógica de história sem testes.                               |
| `references/verify.md`         | Renderização, checagem de números e o checklist final.                             |

## Licença

MIT — veja [LICENSE](../../LICENSE).
