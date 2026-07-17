<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-repository

> Puertos de repositorio + adaptadores — par Firestore/InMemory, `toFirestore`/`fromFirestore`, token DI y pruebas de contrato.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-repository?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-repository)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una tabla de decisión Repository vs Query** — cargar para mutar pasa por un Repository que devuelve una entidad de dominio; leer para mostrar pasa por una interfaz Query separada que devuelve un DTO. Nunca mezclados en la misma interfaz.
- **El patrón de adaptador lado a lado** — un adaptador Firestore y un adaptador InMemory detrás del mismo puerto + símbolo de token DI, para que las pruebas de casos de uso sustituyan el in-memory sin stubs `jest.fn()`.
- **Disciplina de mapeo** — `toFirestore`/`fromFirestore` viven en archivos de mapper dedicados, nunca en línea dentro de un método de operación; `firebase-admin/firestore.Timestamp` nunca se filtra más allá del mapper hacia el dominio (solo `Date`).
- **Reglas de frontera de agregado** — un único puerto posee las escrituras de todo el agregado; `save()` acepta una entidad completamente construida y ya validada, y nunca aplica parches a campos parciales.
- **Una lista `NEVER`** que cubre trampas reales de Firestore: leer `snap.data()` sin verificar `snap.exists`, compartir referencias de entidad entre round-trips en lugar de `toSnapshot()`/`tryCreate(structuredClone(...))`, y conectar un adaptador vía `useClass` sin el símbolo de token.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-repository

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-repository
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                         | Qué hace el agente                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `"add a ProductRepository port with findBySlug and save"` | Genera la interfaz del puerto, el símbolo de token DI y el par de adaptadores InMemory + Firestore              |
| `"why does this list method leak Firestore Timestamp?"`   | Señala la regla de frontera del mapper — convierte `Timestamp` ↔ `Date` dentro de `toFirestore`/`fromFirestore` |
| `"should this be a Repository or a Query?"`               | Aplica la tabla de decisión Repository vs Query (CQRS)                                                          |
| `"review this adapter for aggregate-boundary violations"` | Verifica que `save()` toque solo un agregado y reciba una entidad completamente validada                        |

## Contenido

| Archivo                                    | Contenido                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                 | Condiciones de activación, estructura de archivos, tabla Repository vs Query, reglas principales y lista NEVER.                                                        |
| `references/repository-pattern.md`         | Forma del puerto, token DI, adaptador InMemory, estrategia de pruebas de doble adaptador, regla de enums en fixtures, checklist.                                       |
| `references/firestore-adapter.md`          | Fundamentos del Firebase Admin SDK, subcolecciones, conversiones de `Timestamp`, harness de pruebas fake-DB, helpers de mapper, advertencias de escritura de agregado. |
| `examples/product.repository.ts`           | Una interfaz de puerto de repositorio con métodos nombrados por intención y un símbolo de token DI.                                                                    |
| `examples/in-memory-product.repository.ts` | La contraparte del adaptador InMemory, usada directamente en pruebas de casos de uso vía el mismo token DI.                                                            |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
