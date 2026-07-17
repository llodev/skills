<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-value-object

> Value objects — `ValueObject` + `Result`, VOs de conjunto cerrado y compuestos, `tryCreate`/`create`, y disciplina de normalizar-antes-de-validar.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-value-object?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-value-object)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una lista de verificación de reutilización primero** — antes de crear un nuevo VO, verifica si una base `Text`/`Number` configurable ya cubre el caso vía `ValueObjectConfig` (`minLength`/`maxLength`, `minValue`/`maxValue`).
- **El patrón de VO de conjunto cerrado (obligatorio)** — todo conjunto cerrado de valores permitidos es un enum de TS basado en string, con `Object.values` derivando la tupla del catálogo; nunca una tupla de cadena cruda `as const`, nunca una comparación de literal de cadena en el sitio de llamada.
- **Reglas de visibilidad de constructor** — `private` para VOs hoja, `protected` para VOs diseñados para extensión (estilo `Text`, `Id`), con el razonamiento para cada caso.
- **Manejo de VOs compuestos** — los VOs con forma de objeto (como `ImageRef`) recopilan errores en un array y devuelven `Result.fail(errors)` en lugar de lanzar en el primer campo inválido.
- **Una lista `NEVER`** que cubre los puntos delicados: validar antes de normalizar, la doble guarda `typeof + isNaN` en VOs numéricos, auto-importar un VO compartido vía el alias del paquete en lugar del barrel relativo `../base`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-value-object

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-value-object
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                     | Qué hace el agente                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `"create a PaletteKey value object"`                  | Genera un VO de conjunto cerrado basado en enum con `tryCreate`/`create`, `Object.values` y un type guard  |
| `"do I need a new VO for this bounded string field?"` | Verifica reutilización contra `Text.tryCreate(v, { minLength, maxLength })` antes de crear una nueva clase |
| `"review this VO for validate-before-normalize bugs"` | Señala validación que se ejecuta antes de trim/lowercase/eliminación de acentos en la normalización        |
| `"add a composite ImageRef-style VO"`                 | Genera un VO que recopila errores de campo en un array y devuelve `Result.fail(errors)`                    |

## Contenido

| Archivo                                      | Contenido                                                                                                                                                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                   | Condiciones de activación, dónde viven los VOs, checklist inicial, tabla de visibilidad de constructor, patrón de conjunto cerrado, reglas principales y lista NEVER.                                                                     |
| `references/vo-pattern.md`                   | Rutas reales de archivo, código anotado para cada tipo de VO (simple, paramétrico, numérico, forma canónica, conjunto cerrado/enum, compuesto, ID con `required()`), reglas de importación por ámbito, checklist de cobertura de pruebas. |
| `examples/palette-key.vo.ts`                 | Un VO de conjunto cerrado basado en enum, que demuestra el patrón obligatorio de conjunto cerrado.                                                                                                                                        |
| `examples/palette-key.vo.test.ts`            | Cobertura de pruebas para el VO palette-key, incluyendo casos de valor inválido y normalización.                                                                                                                                          |
| `examples/celebration-slot-index.vo.ts`      | Un VO numérico local a un BC, que demuestra la API dual `tryCreate`/`create` y los overrides de configuración.                                                                                                                            |
| `examples/celebration-slot-index.vo.test.ts` | Cobertura de pruebas para el VO numérico local a un BC, incluyendo casos límite y de override de configuración.                                                                                                                           |
| `examples/slug.vo.ts`                        | Un VO escalar normalizador (trim/lowercase/eliminación de acentos antes de validar).                                                                                                                                                      |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
