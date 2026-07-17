<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-use-case

> Casos de uso de aplicación — `UseCase<IN,OUT>`, `@Injectable()` + orquestación de puertos de repositorio, y `Result.ok`/`fail`/`combine` para manejar fallos esperados.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-use-case?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-use-case)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una tabla de decisión de dependencia** — crear vs transición de estado vs mutación anidada vs listar-por-filtro vs asignar valor único, cada uno mapeado a la llamada de repositorio exacta y la forma de retorno.
- **La división `UseCase<IN, OUT>` vs Application Service** — un verbo IN→OUT limpio recibe un `*.usecase.ts`; un orquestador reutilizable sin forma limpia (allocator, coordinator, resolver) recibe `application/services/<name>.service.ts` en su lugar.
- **Orquestación fail-early** — cada `await` va seguido de `if (X.isFailure) return X.withFail;`; los casos de uso delegan invariantes a la entidad (`tryCreate`, `publish()`, `addSection()`) en lugar de revalidar los VOs ellos mismos.
- **Convenciones de conexión DI** — `@Injectable()`, `@Inject(<TOKEN>)` contra la interfaz del puerto (nunca la clase concreta Firestore/InMemory), y la disciplina de re-exportación vía barrel.
- **Una lista `NEVER`** que cubre los fallos reales: lanzar excepción para fallos esperados en lugar de devolver `Result.fail`, mapear a HTTP dentro de un caso de uso, y actualizar un agregado sin cargarlo primero.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-use-case

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-use-case
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                       | Qué hace el agente                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `"create a PublishCelebration use case"`                | Genera `UseCase<IN, OUT>` con `findBySlug` → `entity.publish()` → `save`, fail-early en cada paso |
| `"this orchestrator doesn't have a clean IN→OUT shape"` | Lo redirige a `application/services/<name>.service.ts` (el patrón `SlugAllocator`)                |
| `"review this use case for HTTP mapping"`               | Señala cualquier lógica de código de estado y la dirige a la capa de controlador en su lugar      |
| `"write a use-case test with an in-memory repository"`  | Conecta `InMemoryCelebrationRepository` vía el token DI, usando miembros de enum en los fixtures  |

## Contenido

| Archivo                                       | Contenido                                                                                                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Condiciones de activación, checklist inicial, tabla de decisión de dependencia, reglas principales, notas de la Result API y lista NEVER.                                                                                    |
| `references/use-case-pattern.md`              | Estructura real de archivos, snippets canónicos de crear/transición de estado/mutación anidada/lista, la excepción `application/services/`, estrategia de pruebas, reglas de fixtures con enum, checklist de implementación. |
| `examples/create-greeting.usecase.example.ts` | Un caso de uso de creación autocontenido + repositorio fake en memoria + prueba Jest usando miembros de enum de los contracts.                                                                                               |
| `examples/README.md`                          | Cómo el ejemplo se relaciona con `SKILL.md`/`references/use-case-pattern.md`, y cómo adaptarlo al crear un nuevo bounded context.                                                                                            |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
