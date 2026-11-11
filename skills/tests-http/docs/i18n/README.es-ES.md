<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/tests-http/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/tests-http

> Genera y sincroniza suites `.http` con cobertura completa para APIs HTTP — descubrimiento de proyecto, adaptadores NestJS y DRF, sin rutas inventadas.

[![npm](https://img.shields.io/npm/v/@llodev/tests-http?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/tests-http)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/tests`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/tests-http

# Vercel CLI
npx skills add llodev/skills/skills/tests-http
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                               | Qué hace el agente                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `"write .http tests for the orders controller"` | Descubre el proyecto, lee el handler y emite un archivo `.http` con cobertura total |
| `"sync http tests after the new filter"`        | Hace diff y extiende el archivo existente; no lo borra                              |
| `"review this .http file"`                      | Comprueba rutas, filtros, negativos de auth y valores inventados contra el código   |

## Contenido

| Archivo                           | Contenido                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `SKILL.md`                        | Flujo de trabajo, selección de framework y checklist de verificación.               |
| `references/project-discovery.md` | Prioridad de config, descubrimiento en el repositorio, cuándo preguntar al usuario. |
| `references/common.md`            | Convenciones compartidas de `.http`.                                                |
| `references/nestjs.md`            | Mapeo de rutas NestJS desde el código (sin rutas fijas).                            |
| `references/drf.md`               | Mapeo de rutas DRF desde el código (sin rutas fijas).                               |
| `examples/`                       | Plantilla de config opcional y esqueletos `.http` mínimos NestJS/DRF.               |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
