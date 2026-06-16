---
name: pm-tasks-asana
description: >-
  Asana adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Asana, asks to "create Asana task", "publish to Asana", "post to Asana",
  "publish", "add comment in Asana", or uses --publish-asana; OR for CRUD on
  existing tasks (check subtask, close task, change due-date, assign person,
  comment); OR when invoked autonomously by another agent with [autonomous] /
  --auto sentinel. Asana hierarchy: workspace > project > section > parent task
  > subtasks (one level), with custom fields and multi-assignee support. Modes:
  paste-ready (no MCP needed), MCP publish (via claude.ai Asana MCP), autonomous
  (write-through with allowlist). Implements 6 CRUD verbs (task.create,
  checklist.check, task.close, task.due-date.set, task.assignee.add,
  task.comment.add) from pm-tasks/pm-tasks-core/references/contract.md. Requires
  @llodev/pm-tasks-core installed.
license: MIT
metadata:
  version: 1.1.2
  tags:
    - agent-skill
    - asana
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: asana
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
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-asana

Adaptador para Asana dentro de la familia `@llodev/pm-tasks-*`. Usa las fases de extracción de la skill núcleo, luego aplica el formato de Asana y, opcionalmente, publica/opera vía el servidor MCP `claude.ai Asana`.

## Enrutamiento

| Modo        | Disparador                                                                                            | Ruta                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Paste-only  | "formatear como tarea de Asana" sin intención de MCP                                                  | Fase 3 (core) → Fase 4 (esta skill, solo formato) → bloques paste de salida |
| MCP publish | "publish to Asana", "create on Asana", "--publish-asana"                                              | Fase 3 → Fase 4 → Fase 5 (publish vía MCP)                                  |
| Autónomo    | `[autonomous]` o `--auto` en el prompt O `LLODEV_PM_TASKS_AUTONOMOUS=1`                               | Fase 3 → Fase 4 → Fase 5b (write-through, sin preview)                      |
| Ops CRUD    | "marcar subtarea N en tarea X", "cerrar tarea Y", "asignar Alice a la tarea Z", "comentar en tarea X" | Fase 6 (operaciones, dispatch directo del verbo)                            |

## Modelo de Asana

Las tareas de Asana tienen:

- **Nombre** (título, ≤80 chars para la vista de tablero).
- **Descripción** (rich text; prefiere etiquetas `**Section**` en negrita — los headings `##` se renderizan de forma inconsistente).
- **Subtareas** — un nivel de profundidad. Los custom fields y el assignee NO se propagan automáticamente desde el parent; el adaptador los establece explícitamente según `subtaskDefaults.inheritParentFields` en `.asana.json`.
- **Secciones** — agrupan tareas dentro de un project.
- **Custom fields** — por project; la API siempre usa GIDs de opción, nunca nombres visibles.
- **Multi-assignee** — Asana permite múltiples followers; el assignee primario es un campo único. Usa `task.assignee.add` para añadir followers.

## Fase 4 — Formato de Asana

Aplica el generic card del core [`../pm-tasks-core/references/generic-card.md`](../pm-tasks-core/references/generic-card.md). Luego mapea a Asana:

- Título → `name` de la tarea.
- Secciones del generic card → etiquetas `**Section**` en negrita dentro de `description` (no `##`).
- "Implementation Checklist" + "Verification Checklist" → subtareas (aplana cualquier bullet anidado; Asana solo admite un nivel).
- Labels → opciones de custom field (resueltas vía `customFields[]` de `.asana.json`).
- Due date → `due_on` (YYYY-MM-DD).
- Assignee → GID de `assignee` resuelto desde `members[]` de `.asana.json` o `me` al momento del publish.

## Fase 5 — MCP publish

**Prerrequisitos:** servidor MCP de Asana (`claude.ai Asana`) conectado en tu agente. El MCP gestiona OAuth; el adaptador nunca ve tokens. Los pasos de configuración varían por agente — registra el mismo endpoint MCP de Asana que tu agente admita:

- **Claude Code**: `claude mcp add asana -s project -- npx -y claude-ai-asana-mcp` (o sigue el setup de Anthropic para el conector hospedado `claude.ai Asana`).
- **Cursor / Windsurf / Cline / Roo Code**: añade una entrada en el JSON de settings MCP de ese agente apuntando al mismo comando `claude-ai-asana-mcp` (envelope idéntico al ejemplo de Trello en `pm-tasks-trello/references/mcp-config.md`).
- **Codex**: entrada TOML en `[mcp_servers.asana]` dentro de `~/.codex/config.toml`.
- **Otros agentes capaces de MCP**: consulta la doc MCP de ese agente; el comando del servidor y el flujo OAuth son constantes.

Orden estricto: 5.1 lee `.asana.json` (archivo completo) → 5.2.5 resuelve assignee + custom fields + mapa de fields por subtarea → 5.2 preview & aprobación → 5.3 publish vía MCP → 5.4 manejo de errores.

Secuencia del MCP publish:

1. **Tarea padre** — `create_tasks` con `name`, `notes` (descripción), `projects: [projectGid]`, `memberships: [{ project, section }]`, `assignee` (GID resuelto), `due_on`, `custom_fields` (string JSON de `{fieldGid: optionGid}`).
2. **Subtareas** — `create_tasks` por subtarea con `parent: parentGid`, `name`, `assignee` (heredado o por subtarea), `custom_fields` según `subtaskDefaults.inheritParentFields`.
3. **Tags** (opcional) — `addTag` por GID de tag.
4. **Confirmación** — lista parent + subtareas con permalinks.

### Atribución (opt-in)

Antes de llamar a la herramienta MCP de creación, lee `config.attribution`. Si `enabled === true`, prefija el comentario con el `commentPrefix` devuelto por `getAttribution()` y añade el `descriptionFooter` al final de `description`. En modo autónomo (`[autonomous]` sentinel), el `commentPrefix` se convierte automáticamente en el `autonomousCommentPrefix`. Consulta [`references/attribution.md`](../pm-tasks-core/references/attribution.md) (añadido en v1.2.0).

## Fase 5b — Autónomo

Omite 5.2 preview & aprobación. Aplica el contrato de modo autónomo de [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Entradas del log de auditoría según [`../pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

Scope autónomo específico de Asana: `autonomous.scope.projects[]` + `autonomous.scope.sections[]` deben incluir los GIDs objetivo. Cualquier escritura en custom field debe estar en `autonomous.allow` (`task.create` cubre el set de campos al crear; los cambios continuos de fields están fuera del scope de v1.x).

## Fase 6 — Operaciones CRUD (tareas existentes)

Para verbos distintos de `task.create`, salta directo a la operación. Mapeo verbo → tool MCP:

| Verbo del core      | Tool MCP de Asana              | Notas                                                                               |
| ------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `task.create`       | `create_tasks`                 | parent + subtareas según Fase 5                                                     |
| `checklist.check`   | `update_tasks`                 | para subtareas: `completed: true`; emula checklist vía modelo de subtarea           |
| `task.close`        | `update_tasks`                 | `completed: true` en el parent                                                      |
| `task.due-date.set` | `update_tasks`                 | `due_on: "YYYY-MM-DD"`                                                              |
| `task.assignee.add` | `update_tasks` + `addFollower` | el assignee primario reemplaza; los adicionales se vuelven followers                |
| `task.comment.add`  | `add_comment` (story)          | añade una comment story a la tarea; aplica prefijo de atribución si está habilitado |

Resolución de `<task-ref>`: acepta permalinks de Asana (`https://app.asana.com/0/<project>/<task>`), GIDs desnudos, o aliases de `taskAliases[]` en `.asana.json`.

## Envelope de resultado

Cada verbo retorna la shape del contrato del core (consulta [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Result envelope):

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "asana",
  "ref": { "id": "<gid>", "url": "https://app.asana.com/0/<project>/<gid>", "alias": "<optional>" },
  "details": {
    /* específico de Asana (ver tabla abajo) */
  }
}
```

`details` específicos de Asana por verbo:

| Verbo               | Campos de `details`                                                      |
| ------------------- | ------------------------------------------------------------------------ |
| `task.create`       | `{ parentGid, subtaskGids[], projectGid, sectionGid?, customFields[]? }` |
| `checklist.check`   | `{ subtaskGid, completed: true }`                                        |
| `task.close`        | `{ parentGid, completed: true }`                                         |
| `task.due-date.set` | `{ taskGid, due_on }`                                                    |
| `task.assignee.add` | `{ taskGid, assignee, followers[]? }` (split entre primario y follower)  |
| `task.comment.add`  | `{ taskGid, storyGid }`                                                  |

Ante fallo: `{ ok: false, verb, tool, error: { code, message, retriable } }`. Códigos comunes: `FORBIDDEN_VERB`, `OUT_OF_SCOPE`, `NOT_FOUND`, `RATE_LIMITED`, `PARTIAL_CREATE` (la subtarea falló a mitad del create — consulta [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Partial-create recovery).

## Anti-patterns

Consulta [`anti-patterns/asana.md`](anti-patterns/asana.md) — paste health, reglas de custom field, requisitos de GID, manejo de partial-create.

## Fallback standalone

Si `@llodev/pm-tasks-core` no está instalado: pide al usuario la entrada mínima (título + nombres de subtareas) y produce un cuerpo de tarea de Asana listo para pegar a partir de ese contenido solo. La calidad se degrada — sin inferencia de scope/audience/fidelity. Imprime: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Orden de búsqueda: `<git-root>/.asana.json` → `~/.config/llodev/pm-tasks/asana.json` → aborta con instrucciones de init. Schema: [`schemas/config.json`](schemas/config.json). Los secretos NUNCA en JSON — el MCP de Asana sostiene el OAuth; el `init` usa únicamente la env var `LLODEV_PM_TASKS_ASANA_PAT`.

## Init

```
npx @llodev/pm-tasks-asana init
```

Consulta [`../pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) para el flujo compartido. El init de Asana lee workspaces / projects / sections / custom fields vía la REST API de Asana usando un Personal Access Token (env `LLODEV_PM_TASKS_ASANA_PAT`).
