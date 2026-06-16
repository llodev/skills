---
name: pm-tasks-trello
description: >-
  Trello adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Trello, asks to "create card", "publish to Trello", "post to Trello",
  "publish", or uses --publish; OR for CRUD on existing cards (check checklist
  item, close card, change due-date, add member, comment); OR when invoked
  autonomously by another agent with [autonomous] / --auto sentinel. Modes:
  paste-ready (no MCP needed), MCP publish (via atlassian-trello-mcp),
  autonomous (write-through with allowlist). Implements 6 CRUD verbs
  (task.create, checklist.check, task.close, task.due-date.set,
  task.assignee.add, task.comment.add) from
  pm-tasks/pm-tasks-core/references/contract.md. Requires @llodev/pm-tasks-core
  installed.
license: MIT
metadata:
  version: 1.1.2
  tags:
    - agent-skill
    - trello
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: trello
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-trello

Adaptador para Trello dentro de la familia `@llodev/pm-tasks-*`. Usa las fases de extracción de la skill núcleo, luego aplica el formato de Trello y, opcionalmente, publica/opera vía el servidor MCP `atlassian-trello-mcp`.

## Enrutamiento

| Modo        | Disparador                                                                                         | Ruta                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Paste-only  | "formatear como card de Trello" sin intención de MCP                                               | Fase 3 (core) → Fase 4 (esta skill, solo formato) → bloques paste de salida |
| MCP publish | "publish to Trello", "create on Trello", "--publish"                                               | Fase 3 → Fase 4 → Fase 5 (publish vía MCP)                                  |
| Autónomo    | `[autonomous]` o `--auto` en el prompt O `LLODEV_PM_TASKS_AUTONOMOUS=1`                            | Fase 3 → Fase 4 → Fase 5b (write-through, sin preview)                      |
| Ops CRUD    | "marcar item N en tarea X", "cerrar card Y", "añadir Alice a la tarea Z", "comentar en la tarea X" | Fase 6 (operaciones, dispatch directo del verbo)                            |

## Fase 4 — Formato de Trello

**OBLIGATORIO — LEE EL ARCHIVO COMPLETO** [`references/format.md`](references/format.md) antes de producir cualquier salida específica de Trello. Después aplica [`anti-patterns/tools.md`](anti-patterns/tools.md) § Trello.

## Fase 5 — MCP publish

**Prerrequisitos:** `atlassian-trello-mcp` configurado (consulta [`references/mcp-config.md`](references/mcp-config.md)). Env vars `TRELLO_API_KEY` + `TRELLO_TOKEN` en el shell.

Orden estricto: 5.1 config discovery → 5.2.5 resolve labels/member → 5.2 preview & aprobación → 5.3 publish vía MCP → 5.4 manejo de errores.

Secuencia completa en [`references/publish.md`](references/publish.md).

### Atribución (opt-in)

Antes de llamar a la herramienta MCP de creación, lee `config.attribution`. Si `enabled === true`, prefija el comentario con el `commentPrefix` devuelto por `getAttribution()` y añade el `descriptionFooter` al final de `description`. En modo autónomo (`[autonomous]` sentinel), el `commentPrefix` se convierte automáticamente en el `autonomousCommentPrefix`. Consulta `references/attribution.md` en pm-tasks-core (añadido en v1.2.0; archivo creado en Task 1.5).

## Fase 5b — Autónomo

Omite 5.2 preview & aprobación. Aplica el contrato de modo autónomo de [`pm-tasks/pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Overlay específico de la herramienta en [`references/autonomous.md`](references/autonomous.md). Entradas del log de auditoría según [`pm-tasks/pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

## Fase 6 — Operaciones CRUD (cards existentes)

Para verbos distintos de `task.create`, salta directo a la operación. **OBLIGATORIO — LEE EL ARCHIVO COMPLETO** [`references/operations.md`](references/operations.md) que lista el mapeo verbo → tool MCP y la resolución de `<task-ref>` para URLs/IDs de Trello. Para `task.comment.add`, aplica el prefijo de atribución si `config.attribution.enabled === true` (ver Fase 5 § Atribución).

## Fallback standalone

Si `@llodev/pm-tasks-core` no está instalado: pide al usuario la entrada mínima (título + items de la checklist) y produce un card de Trello listo para pegar a partir de ese contenido solo. La calidad se degrada — sin inferencia de scope/audience/fidelity. Imprime: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Orden de búsqueda: `<git-root>/.trello.json` → `~/.config/llodev/pm-tasks/trello.json` → aborta con instrucciones de init. Schema: [`schemas/config.json`](schemas/config.json). Los secretos NUNCA en JSON — solo env vars / llavero.

## Init

```
npx @llodev/pm-tasks-trello init
```

Consulta [`pm-tasks/pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) para el flujo compartido.
