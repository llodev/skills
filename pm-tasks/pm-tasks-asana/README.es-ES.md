<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-asana

> Adapter para Asana de la familia `@llodev/pm-tasks-*` — convierte planes de implementación en parent tasks + subtasks de Asana y los opera mediante paste, MCP publish o autonomous write-through.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-asana?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-asana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Lo que obtienes:

- **Output paste-ready** — el agente renderiza un generic card; tú lo pegas en Asana manualmente.
- **MCP publish** mediante el servidor MCP `claude.ai Asana` (OAuth, sin PATs en JSON). Parent task + subtasks planas + custom fields + colocación en section en un único batch.
- **Operaciones CRUD** sobre tasks existentes: `checklist.check`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`.
- **Autonomous mode** — centinela `[autonomous]` / `--auto` para write-through bajo allowlist + scope + rate limits. Los loops multi-task replican el estado a Asana en tiempo real.

## Instalación

```bash
# npm (con skillpm o marketplace de Claude Code)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-asana

# Vercel CLI (instala el core manualmente también)
npx skills add llodev/skills/pm-tasks/pm-tasks-core
npx skills add llodev/skills/pm-tasks/pm-tasks-asana
```

## Setup del MCP

Asana usa OAuth mediante el MCP `claude.ai Asana`. Si ya conectaste tu cuenta de Asana en los ajustes de Cursor o Claude Code, ya estás listo.

Para cualquier agente compatible con MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

1. Abre los ajustes de MCP del agente.
2. Activa / registra `claude.ai Asana` (o el MCP de Asana equivalente de tu agente).
3. Aprueba el flujo OAuth en tu navegador.

En Claude Code, verifica con `claude mcp list` — `claude.ai Asana` debe aparecer como autenticado.

## Setup de la config

El script `init` se ejecuta **fuera** del MCP, así que necesita un Personal Access Token para enumerar tus workspaces / projects / sections / custom fields. Genera uno en https://app.asana.com/0/my-apps, después:

```bash
export LLODEV_PM_TASKS_ASANA_PAT=...
npx @llodev/pm-tasks-asana init
```

Sigue los prompts. Elige dónde debe vivir la config:

- **local** → `./.asana.json` (recomendado para configs con scope de proyecto, se puede commitear).
- **global** → un default de la plataforma, personalizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/asana.json`, con fallback a `~/.config/llodev/pm-tasks/asana.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\asana.json`.
  - Sobrescribe en cualquier OS con `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — el archivo acaba en `$LLODEV_PM_TASKS_CONFIG_HOME/asana.json`.

El prompt de `init` imprime la ruta absoluta donde va a escribir, así siempre ves exactamente adónde va el archivo.

> [!IMPORTANT]
> El PAT solo lo usa el `init`. El MCP en sí usa OAuth — nunca pongas tokens en el JSON.

## Uso

| Prompt example                                                   | Qué hace el agente                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `"publish this plan as Asana tasks"`                             | Phase 5 publish — parent + subtasks + custom fields en un único batch       |
| `"check subtask 3 on task X in Asana"`                           | Phase 6 CRUD — `checklist.check` sobre la subtask                           |
| `"close task Y"`                                                 | Phase 6 CRUD — `task.close` (mueve a la section de close + marca completed) |
| `"comment on task X: shipped"`                                   | Phase 6 CRUD — `task.comment.add`                                           |
| `"[autonomous] create task in asana from plan @docs/plans/X.md"` | Phase 5b autonomous (requiere `autonomous.enabled: true`)                   |

## Notas específicas de Asana

> [!NOTE]
> **Las subtasks tienen un único nivel** — el adapter aplana checklists anidadas en una sola capa de subtask.

> [!WARNING]
> **Los custom fields NO se heredan por defecto** — lista los IDs de field en `subtaskDefaults.inheritParentFields` para que el adapter los copie del parent a las subtasks en el momento del create.

- **Assignee es un campo único** — usa `task.assignee.add` para añadir followers; el assignee principal se reemplaza en caso de conflicto.
- **El `get_task` del MCP no devuelve activity stories** — el activity feed de la UI de Asana es la fuente de verdad para auditorías de atribución. Mira [`anti-patterns/asana.md`](./anti-patterns/asana.md).

## Documentación

- [`SKILL.es-ES.md`](./SKILL.es-ES.md) — enrutado de phases + vocabulario CRUD.
- [`schemas/config.json`](./schemas/config.json) — JSON Schema de `.asana.json`.
- [`anti-patterns/asana.md`](./anti-patterns/asana.md) — gotchas recurrentes.
- [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md) — contrato de autonomous mode.

## Licencia

MIT — mira [LICENSE](./LICENSE).
