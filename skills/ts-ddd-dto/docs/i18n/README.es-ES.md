<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-dto

> DTOs y contratos — esquemas Zod 4 emparejados con tipos `z.infer`, conjuntos cerrados basados en enum, y proyecciones de entrada/salida/lectura.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-dto?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-dto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una única fuente de verdad para la forma del wire** — los DTOs viven en un paquete de contracts por bounded context, consumido tanto por la API como por el web; ninguno redefine tipos de wire localmente.
- **Tipado schema-first** — el esquema Zod se declara primero y el tipo TS se deriva vía `z.infer`; escribir interfaces a mano que reflejan un esquema es un NEVER.
- **El patrón enum → tuple → type → predicate** — todo conjunto cerrado es un `XxxEnum` basado en string, con `z.literal(EnumName.X)` para ramas de unión discriminada y `z.nativeEnum(EnumName)` para validadores de conjunto completo.
- **Una taxonomía de DTO que previene fugas** — `CreateXxxDTO`/`UpdateXxxDTO`/`XxxFiltersDTO` (entrada) nunca se reutilizan como `XxxResponseDTO` (salida); las proyecciones de lectura CQRS tienen forma propia.
- **Una lista `NEVER`** para los fallos reales: literales de cadena en lugar de miembros de enum, lógica de transformación dentro del archivo DTO, y totales de paginación incrustados dentro del array `data`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-dto

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-dto
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                      | Qué hace el agente                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `"add a status field to the product DTO"`              | Verifica si el valor es un conjunto cerrado → añade/reutiliza un `XxxEnum`, conecta `z.nativeEnum`          |
| `"create a CreateProductDTO and a ProductResponseDTO"` | Genera esquemas Zod + tipos `z.infer` separados para las formas de entrada de escritura y salida de lectura |
| `"this DTO needs a paginated list"`                    | Añade una proyección con forma `PaginatedResultDTO` manteniendo `data`/`meta` separados                     |
| `"review these contracts for leaked wire types"`       | Verifica redefiniciones fuera de `libs/contracts/<bc>` y literales de cadena crudos para enums              |

## Contenido

| Archivo                     | Contenido                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                  | Condiciones de activación, estructura del paquete de contracts, taxonomía de DTO, patrón de enum obligatorio, reglas principales y lista NEVER.                |
| `references/dto-pattern.md` | Estructura del paquete de contracts, patrón enum → tuple → type → predicate, snippets de esquema/DTO, convenciones de nomenclatura, checklist de verificación. |
| `examples/product.dto.ts`   | Un ejemplo de DTO autocontenido que muestra campos de entrada, salida y conjunto cerrado basado en enum.                                                       |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
