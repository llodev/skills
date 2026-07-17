<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-entity

> Entidades de dominio — base `Entity`, `create`/`tryCreate` con `Result.combine`, normalización mediante VO y transiciones de estado vía `cloneWith`.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-entity?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-entity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una API dual de creación, resuelta** — `tryCreate(props): Result<T>` es la canónica; `create(props): T` es un wrapper delgado que delega a `tryCreate` + `throwIfFailed()`. Nunca al revés.
- **La Enum Rule (HARD)** — todo campo de conjunto cerrado (status/kind/layout/provider/palette) es un enum de TS basado en string con un type guard; compara contra el miembro del enum, nunca contra un literal de cadena.
- **Comportamiento de la clase base que debes conocer** — cómo el constructor de `Entity` auto-genera/normaliza `id`, `createdAt`/`updatedAt`/`deletedAt`, y por qué `cloneWith` hace deep-clone de las props con `structuredClone` antes de fusionar.
- **Orientación de transición de estado** — `cloneWith(overrides)` para intercambio-y-revalidación inmutable vs mutar `_field` + `this.touch()` para entidades que poseen una colección mutable, con los criterios para elegir entre ambos.
- **Una lista `NEVER`** que cubre las trampas reales: almacenar entrada de VO sin normalizar, setters públicos, saltarse la validación de elementos de array, e importar desde el alias heredado `@ddd/shared`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-entity

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-entity
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                 | Qué hace el agente                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `"create a Product entity with a status field"`   | Genera `tryCreate`/`create`, un status basado en enum y getters tipados sobre `Entity<Type, Props>` |
| `"add a publish() transition to Celebration"`     | Añade un método de dominio nombrado que muta `_field` + llama a `this.touch()`                      |
| `"review this entity for raw string comparisons"` | Señala comparaciones estilo `=== "published"` contra la Enum Rule (HARD)                            |
| `"validate an array of nested Section entities"`  | Recorre y valida elemento por elemento vía `Result.combine` o un acumulador manual `errors[]`       |

## Contenido

| Archivo                           | Contenido                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                        | Condiciones de activación, checklist inicial, Enum Rule (HARD), comportamiento de la clase base, reglas principales y lista NEVER.                                                                |
| `references/entity-pattern.md`    | Rutas reales, snippet canónico de `tryCreate`, validación basada en enum, patrón de array/entidad anidada, `cloneWith` vs mutación de colección mutable, estructura de pruebas, tabla de trampas. |
| `examples/product.entity.ts`      | Una entidad de referencia autocontenida con un campo de status basado en enum, demostrando `tryCreate`/`create`.                                                                                  |
| `examples/product.entity.test.ts` | Cobertura de pruebas para la entidad de referencia, incluyendo casos de enum inválido y validación anidada.                                                                                       |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
