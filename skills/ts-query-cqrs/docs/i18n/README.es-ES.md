<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-query-cqrs

> Consultas del lado de lectura en CQRS — puertos `*Query`, casos de uso de lectura `find-*`, proyecciones DTO, paginación/filtros y adaptadores Prisma/InMemory.

[![npm](https://img.shields.io/npm/v/@llodev/ts-query-cqrs?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-query-cqrs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una tabla de decisión Query vs Repository** — mostrar una lista, dashboards y lecturas paginadas/filtradas pasan por una `Query` que devuelve un DTO; cargar para mutar pasa por `Repository.findById` devolviendo una entidad de dominio.
- **Un contrato de método único** — `execute(input): Promise<Result<OutputDTO>>` es la única forma que expone una interfaz `Query`; ningún import de ORM, ningún tipo de driver de base de datos se filtra al core.
- **Mapeo de fila a DTO, nunca de fila a entidad** — el adaptador mapea filas de la base de datos directamente al DTO de proyección; nunca llama a `toDomain` ni reconstruye una entidad de dominio.
- **Una referencia de adaptador Prisma** — cláusulas `select` explícitas (nunca `findMany` sin más), `$transaction` para conteo + datos atómicos en consultas paginadas, y composición condicional de `WHERE` para filtros opcionales.
- **Una lista `NEVER`** que cubre las fugas reales de CQRS: devolver una entidad de dominio desde una Query, extender/instanciar la clase de entidad desde un DTO, y ejecutar dos round-trips separados a la base de datos para datos + conteo.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-query-cqrs

# Vercel CLI
npx skills add llodev/skills/skills/ts-query-cqrs
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                                | Qué hace el agente                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `"add a paginated find-many-products query"`                     | Genera una interfaz `Query` + adaptador Prisma con `select` explícito, conteo atómico y `PaginatedResultDTO` |
| `"should loading before an update use a Query or a Repository?"` | Aplica la tabla de decisión Query vs Repository — señala `Repository.findById`                               |
| `"review this query adapter for over-fetching"`                  | Señala un `findMany` sin cláusula `select`                                                                   |
| `"write an in-memory mock for this query"`                       | Genera un adaptador InMemory detrás de la misma interfaz `Query` para pruebas de casos de uso                |

## Contenido

| Archivo                                       | Contenido                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Condiciones de activación, checklist inicial, tabla de decisión Query vs Repository, reglas principales y lista NEVER. |
| `references/query-cqrs-pattern.md`            | Contrato del core, modelado de DTO, mock en memoria, checklist.                                                        |
| `references/prisma-adapter.md`                | Adaptador específico de Prisma con `select`, `$transaction`, `WHERE` condicional.                                      |
| `examples/find-many-items.query.ts`           | Un ejemplo de interfaz `Query` + adaptador Prisma con paginación y filtros.                                            |
| `examples/in-memory-find-many-items.query.ts` | Un mock en memoria de la misma interfaz `Query`, para pruebas de casos de uso sin base de datos.                       |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
