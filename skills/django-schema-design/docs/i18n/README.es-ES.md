<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/django-schema-design/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/django-schema-design/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/django-schema-design/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/django-schema-design

> Diseña esquemas de base de datos Django listos para producción — estrategia de clave primaria, índices, restricciones y migraciones seguras — con los trade-offs no evidentes que un experto aprendió en la práctica, no sintaxis básica de ORM.

[![npm](https://img.shields.io/npm/v/@llodev/django-schema-design?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/django-schema-design)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/django-*`.

Lo que obtienes:

- **Estrategia de PK que nombra el eje real** — no "único o no" (todos son únicos), sino **ubicación aleatoria (UUIDv4) vs. secuencial (UUIDv7 / incremental)**, y por qué usar v4 como PK en una tabla de escritura intensa fragmenta el índice mientras que v7 conserva la localidad de inserción.
- **Un guion para interrogar el dominio** — identidad, cardinalidad/propiedad, ciclo de vida, rutas de acceso — a resolver antes de que exista cualquier campo.
- **Una capa experta de índices y restricciones** — orden de columnas en índices compuestos, índices de cobertura (`include`) y parciales, restricciones `Unique`/`Check`/`Exclusion`, elección entre B-tree/GIN/GiST/BRIN, y cuándo desnormalizar en lugar de añadir otro índice.
- **Seguridad en migraciones** — backfills por lotes, creación concurrente de índices en tablas activas, reversibilidad y el procedimiento de cambio de PK por etapas.
- **Una lista `NEVER`** con las razones que solo enseña la experiencia (error de redondeo de `FloatField` en dinero, PK secuencial → IDOR, v4 en tablas calientes, cambio de PK in-place, `on_delete` implícito).

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/django-schema-design

# Vercel CLI
npx skills add llodev/skills/skills/django-schema-design
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                       | Qué hace el agente                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `"design Django models for invoices and line items"`    | Aplica el guion de dominio + flujo de decisión de PK, genera `models.py`      |
| `"should this event table use UUID or auto increment?"` | Aplica los ejes de exposición + localidad de inserción → UUIDv7 con el porqué |
| `"migration to switch users to a UUID PK"`              | Procedimiento por etapas, reversible: add→backfill→repoint→swap               |
| `"review this schema"`                                  | Verifica PK, `on_delete`, restricciones y orden de índices contra la lista    |

## Contenido

| Archivo                                  | Contenido                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `SKILL.md`                               | Guion de dominio, flujo de decisión de PK, lista NEVER y checklist.    |
| `references/pk-strategy.md`              | Incremental vs UUIDv4 vs UUIDv7, storage/collation y migración de PK.  |
| `references/indexing-and-constraints.md` | Índices compuestos/cobertura/parciales, restricciones, tipos, EXPLAIN. |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
