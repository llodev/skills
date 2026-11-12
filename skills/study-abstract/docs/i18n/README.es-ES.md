<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/study-abstract

> Convierte cualquier material de estudio en un resumen didáctico que el lector puede usar con la fuente cerrada.

[![npm](https://img.shields.io/npm/v/@llodev/study-abstract?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/study-abstract)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/study`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/study-abstract

# Vercel CLI
npx skills add llodev/skills/skills/study-abstract
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                    | Qué hace el agente                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `"resume this lecture"`              | Escribe un resumen en el idioma de la petición, con la fuente cerrada           |
| `"abstract this folder of lectures"` | Un resumen por unidad, más un índice breve                                      |
| `"apply the errata"`                 | Conserva la oración de la fuente y la corrección como dos oraciones etiquetadas |

## Contenido

| Archivo                   | Contenido                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                | Flujo, orden de las secciones, reglas de idioma y cuándo escribir un resumen o un índice.                   |
| `anti-patterns/prose.md`  | Fallos de prosa: siglas sin el nombre completo, flechas como verbo y reparaciones silenciosas de la fuente. |
| `references/conflicts.md` | Conflictos apilados y una nota de corrección que cubre un conjunto.                                         |
| `references/sources.md`   | Qué confiar en diapositivas, escaneos, notebooks, hojas de cálculo, código y medios.                        |
| `examples/index.md`       | Forma del índice de un conjunto: una pregunta por unidad y un diagrama de secuencia opcional.               |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
