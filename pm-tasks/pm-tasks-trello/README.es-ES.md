<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-trello

> Adapter para Trello de la familia `@llodev/pm-tasks-*` — convierte planes de implementación en cards de Trello y los opera mediante paste, MCP publish o autonomous write-through.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-trello?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-trello)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Lo que obtienes:

- **Output paste-ready** — el agente renderiza un generic card; tú lo pegas en Trello manualmente.
- **MCP publish** mediante `atlassian-trello-mcp`. Card + checklists con nombre + labels + asignación de members en un único batch.
- **Operaciones CRUD** sobre cards existentes: `checklist.check`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`.
- **Autonomous mode** — centinela `[autonomous]` / `--auto` para write-through bajo allowlist + scope + rate limits. Los loops multi-task replican el estado a Trello en tiempo real.

## Instalación

```bash
# npm (con skillpm o marketplace de Claude Code)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello

# Vercel CLI (instala el core manualmente también)
npx skills add llodev/skills/pm-tasks/pm-tasks-core
npx skills add llodev/skills/pm-tasks/pm-tasks-trello
```

## Setup del MCP

Claude Code:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Aprueba mediante `/mcp` en el chat. Exporta las env vars en tu shell:

```bash
export TRELLO_API_KEY=...
export TRELLO_TOKEN=...
```

Cursor / Windsurf / Codex / otros agentes: mira [`references/mcp-config.md`](./references/mcp-config.md).

## Setup de la config

```bash
npx @llodev/pm-tasks-trello init
```

Sigue los prompts. Elige dónde debe vivir la config:

- **local** → `./.trello.json` (recomendado para configs con scope de proyecto, se puede commitear).
- **global** → un default de la plataforma, personalizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/trello.json`, con fallback a `~/.config/llodev/pm-tasks/trello.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\trello.json`.
  - Sobrescribe en cualquier OS con `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — el archivo acaba en `$LLODEV_PM_TASKS_CONFIG_HOME/trello.json`.

El prompt de `init` imprime la ruta absoluta donde va a escribir, así siempre ves exactamente adónde va el archivo.

> [!IMPORTANT]
> Los secretos van en env vars o en el keychain del SO — **nunca** en este JSON. El script `init` lee `TRELLO_API_KEY` + `TRELLO_TOKEN` de tu shell, no del archivo de config.

## Uso

| Prompt example                                                    | Qué hace el agente                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `"publish this plan as Trello cards"`                             | Phase 5 publish — card + checklists + labels + member en un único batch      |
| `"check item 3 on task X in Trello"`                              | Phase 6 CRUD — `checklist.check` sobre el item de la checklist               |
| `"close card Y"`                                                  | Phase 6 CRUD — `task.close` (`dueComplete: true` + mueve a la list de close) |
| `"comment on card X: shipped"`                                    | Phase 6 CRUD — `task.comment.add`                                            |
| `"[autonomous] create task in trello from plan @docs/plans/X.md"` | Phase 5b autonomous (requiere `autonomous.enabled: true`)                    |

## Notas específicas de Trello

> [!NOTE]
> **`task.close` DEBE setear `dueComplete: true`** además de mover el card a la list de close — la UI de Trello muestra el strikethrough de la due-date solo cuando `dueComplete` está activado.

> [!WARNING]
> **`create_card` ignora `idMembers` silenciosamente** — siempre haz un follow-up con `trello_add_member_to_card` por ID de member. El adapter lo hace por ti.

- **`add_member_to_card`** a veces reporta un error falso incluso cuando tiene éxito — el adapter vuelve a hacer fetch del card y comprueba `members[]` para confirmar.
- **Las descripciones de Trello no renderizan tablas** — el adapter las aplana en bullets automáticamente (mira [`references/format.md`](./references/format.md)).

## Documentación

- [`SKILL.md`](./SKILL.md) — enrutado de phases + vocabulario CRUD.
- [`references/format.md`](./references/format.md) — convenciones de formato de Trello.
- [`references/publish.md`](./references/publish.md) — secuencia de MCP publish.
- [`references/operations.md`](./references/operations.md) — verbos CRUD → mapeo de herramienta MCP.
- [`references/mcp-config.md`](./references/mcp-config.md) — setup de MCP específico por agente.
- [`references/autonomous.md`](./references/autonomous.md) — overlay autonomous de Trello (patrón de ciclo de vida del card).
- [`anti-patterns/tools.md`](./anti-patterns/tools.md) — gotchas recurrentes.

## Licencia

MIT — mira [LICENSE](./LICENSE).
