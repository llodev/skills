<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-jira/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-jira/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-jira/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-jira

> Adapter para Jira de la familia `@llodev/pm-tasks-*` — convierte planes de implementación en issues + sub-tasks de Jira y los opera mediante paste, MCP publish o autonomous write-through, con estimación de esfuerzo agnóstica de estrategia.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-jira?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-jira)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Lo que obtienes:

- **Output paste-ready** — el agente renderiza un generic card; tú lo pegas en Jira manualmente.
- **MCP publish** mediante el Atlassian Remote MCP (OAuth, Streamable-HTTP — sin tokens en JSON). Issue parent + sub-tasks + labels en un único batch.
- **Operaciones CRUD** sobre issues existentes: `checklist.check`, `task.move`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`, `task.parent.set`, `task.estimate.set`.
- **Estimación de esfuerzo, nunca plazos** — agnóstica de estrategia (story points, fibonacci, planning poker, t-shirt, affinity, three-point/PERT, días/horas ideales), escrita en tu campo de Story Points o en el time tracking.
- **Autonomous mode** — centinela `[autonomous]` / `--auto` para write-through bajo allowlist + scope + rate limits. Los loops multi-task replican el estado a Jira en tiempo real.

## Instalación

```bash
# npm (con skillpm o marketplace de Claude Code)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-jira

# Vercel CLI (instala el core manualmente también)
npx skills add llodev/skills/skills/pm-tasks-core
npx skills add llodev/skills/skills/pm-tasks-jira
```

## Setup del MCP

Jira usa el **Atlassian Remote MCP** sobre el endpoint Streamable-HTTP `https://mcp.atlassian.com/v1/mcp`. El MCP gestiona el OAuth — el adapter nunca ve tokens.

Para cualquier agente compatible con MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

- **Claude Code**: `claude mcp add atlassian -s project -- npx -y @anthropic-ai/mcp-server-atlassian` (o sigue la guía de setup del Remote MCP de Atlassian para tu site), después aprueba el flujo OAuth en tu navegador.
- **Cursor / Windsurf / Cline / Roo Code**: añade una entrada de MCP en los ajustes del agente apuntando a `https://mcp.atlassian.com/v1/mcp`.
- **Codex**: añade una entrada `[mcp_servers.atlassian]` en `~/.codex/config.toml`.

En Claude Code, verifica con `claude mcp list` — `atlassian` debe aparecer como autenticado.

> [!NOTE]
> El endpoint SSE legado (`/events`) fue retirado el 2026-06-30 — usa el endpoint Streamable-HTTP de arriba.

## Setup de la config

El script `init` enumera tu site de Atlassian, project, issue types y campo de Story Points, y luego escribe un `.jira.json`. Ejecútalo desde una sesión de agente que ya tenga el Atlassian MCP conectado, o standalone con un API token. Para el camino standalone, crea un token en https://id.atlassian.com/manage-profile/security/api-tokens, después:

```bash
export ATLASSIAN_API_TOKEN=...
export ATLASSIAN_EMAIL=you@example.com
export ATLASSIAN_SITE=your-team.atlassian.net
npx @llodev/pm-tasks-jira init
```

Sigue los prompts. Elige dónde debe vivir la config:

- **local** → `./.jira.json` (recomendado para configs con scope de proyecto, se puede commitear).
- **global** → un default de la plataforma, personalizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/jira.json`, con fallback a `~/.config/llodev/pm-tasks/jira.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\jira.json`.
  - Sobrescribe en cualquier OS con `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — el archivo acaba en `$LLODEV_PM_TASKS_CONFIG_HOME/jira.json`.

El `.jira.json` generado captura tus issue types (id + nombre), los statuses del board (objetivos de move/close, con category) y los campos válidos por tipo — así el agente nunca escribe un campo no soportado.

El prompt de `init` imprime la ruta absoluta donde va a escribir, así siempre ves exactamente adónde va el archivo. Ejecuta health checks del workspace cuando quieras con:

```bash
npx @llodev/pm-tasks-jira init --doctor
```

> [!IMPORTANT]
> El API token solo lo usa el `init` para descubrir los metadatos de tu project. El MCP en sí usa OAuth — nunca pongas tokens en el JSON.

## Uso

| Prompt example                                                 | Qué hace el agente                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `"publish this plan as Jira issues"`                           | Phase 5 publish — parent + sub-tasks + labels en un único batch             |
| `"check subtask 3 on KAN-42"`                                  | Phase 6 CRUD — `checklist.check` sobre la sub-task                          |
| `"close KAN-42"`                                               | Phase 6 CRUD — `task.close` (transition resuelta por categoría de status)   |
| `"set the estimate on KAN-42 to 5 points"`                     | Phase 6 CRUD — `task.estimate.set` (esfuerzo → Story Points + label `est:`) |
| `"set the parent of KAN-43 to KAN-12"`                         | Phase 6 CRUD — `task.parent.set`                                            |
| `"[autonomous] create jira issues from plan @docs/plans/X.md"` | Phase 5b autonomous (requiere `autonomous.enabled: true`)                   |

## Notas específicas de Jira

> [!NOTE]
> **Las transitions se resuelven por categoría de status** (`new` / `indeterminate` / `done`), no por nombre — así `task.move` / `task.close` funcionan igual en cualquier idioma del workspace (p. ej. pt-BR `"Tarefa"` / `"Concluído"`).

> [!NOTE]
> **Los ítems de checklist se vuelven Sub-tasks** — un único nivel, cada uno creado bajo su issue parent. Una issue key parent es obligatoria.

> [!WARNING]
> **`task.sprint.set` NO está soportado** — el Atlassian MCP no expone ninguna API de agile/sprint, así que el core factory devuelve `UNSUPPORTED_VERB`. La planificación de sprint y capacity está en el roadmap para v1.12.0.

- **La estimación registra esfuerzo, nunca un plazo de calendario.** Los Story Points necesitan un campo en el board — el `init` lo detecta automáticamente (`customfield_10016` por default); si está ausente, `task.estimate.set` devuelve `INVALID_REQUEST` con una pista para habilitarlo. El original legible por humanos se preserva como un label `est:` idempotente.
- **Las due dates en una sub-task** devuelven `NOT_APPLICABLE` — las sub-tasks de Jira team-managed no llevan due date propio.
- **Los issue types se leen de la config** (`issueTypes{}`, nombres locale-specific) — nunca hard-coded. Mira [`anti-patterns/jira.md`](../../anti-patterns/jira.md).

## Documentación

- [`SKILL.md`](../../SKILL.md) — enrutado de phases + vocabulario CRUD.
- [`schemas/config.json`](../../schemas/config.json) — JSON Schema de `.jira.json`.
- [`references/operations.md`](../../references/operations.md) — mapeo verbo → herramienta MCP.
- [`references/estimation.md`](../../references/estimation.md) — estrategias de estimación + preservación de label.
- [`anti-patterns/jira.md`](../../anti-patterns/jira.md) — gotchas recurrentes.
- [`../pm-tasks-core/references/autonomous-mode.md`](../../../pm-tasks-core/references/autonomous-mode.md) — contrato de autonomous mode.

## Licencia

MIT — mira [LICENSE](../../LICENSE).
