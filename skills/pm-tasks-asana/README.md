<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-asana/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-asana/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-asana/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-asana

> Asana adapter for the `@llodev/pm-tasks-*` family — turn implementation plans into Asana parent tasks + subtasks and operate them via paste, MCP publish, or autonomous write-through.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-asana?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-asana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

What you get:

- **Paste-ready output** — agent renders a generic card; you paste into Asana manually.
- **MCP publish** via the `claude.ai Asana` MCP server (OAuth, no PATs in JSON). Parent task + flat subtasks + custom fields + section placement in one batch.
- **CRUD operations** on existing tasks: `checklist.check`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`.
- **Autonomous mode** — `[autonomous]` / `--auto` sentinel for write-through under allowlist + scope + rate limits. Multi-task loops mirror state to Asana in real time.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-asana

# Vercel CLI (install core manually too)
npx skills add llodev/skills/skills/pm-tasks-core
npx skills add llodev/skills/skills/pm-tasks-asana
```

## Setup the MCP

Asana uses OAuth via the `claude.ai Asana` MCP. If you've already connected your Asana account in Cursor or Claude Code settings, you're done.

For any MCP-capable agent (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

1. Open the agent's MCP settings.
2. Enable / register `claude.ai Asana` (or your agent's equivalent Asana MCP).
3. Approve the OAuth flow in your browser.

In Claude Code, verify with `claude mcp list` — `claude.ai Asana` should appear as authenticated.

## Setup the config

The `init` script runs **outside** the MCP, so it needs a Personal Access Token to enumerate your workspaces / projects / sections / custom fields. Generate one at https://app.asana.com/0/my-apps, then:

```bash
export LLODEV_PM_TASKS_ASANA_PAT=...
npx @llodev/pm-tasks-asana init
```

Walk through the prompts. Pick where the config should live:

- **local** → `./.asana.json` (recommended for project-scoped configs, can be committed).
- **global** → a platform default, customizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/asana.json`, falling back to `~/.config/llodev/pm-tasks/asana.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\asana.json`.
  - Override on any OS with `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — the file lands at `$LLODEV_PM_TASKS_CONFIG_HOME/asana.json`.

The `init` prompt prints the absolute path it will write to, so you always see exactly where the file goes.

> [!IMPORTANT]
> The PAT is **only** used by `init`. The MCP itself uses OAuth — never put tokens in the JSON.

## Use

| Prompt example                                                   | What the agent does                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `"publish this plan as Asana tasks"`                             | Phase 5 publish — parent + subtasks + custom fields in one batch      |
| `"check subtask 3 on task X in Asana"`                           | Phase 6 CRUD — `checklist.check` on the subtask                       |
| `"close task Y"`                                                 | Phase 6 CRUD — `task.close` (moves to close section + sets completed) |
| `"comment on task X: shipped"`                                   | Phase 6 CRUD — `task.comment.add`                                     |
| `"[autonomous] create task in asana from plan @docs/plans/X.md"` | Phase 5b autonomous (requires `autonomous.enabled: true`)             |

## Asana-specific notes

> [!NOTE]
> **Subtasks are one level deep** — the adapter flattens nested checklists into a single subtask layer.

> [!WARNING]
> **Custom fields do NOT inherit by default** — list field IDs in `subtaskDefaults.inheritParentFields` so the adapter copies them from parent to subtasks at create time.

- **Assignee is a single field** — use `task.assignee.add` to add followers; the primary assignee replaces on conflict.
- **MCP `get_task` doesn't return activity stories** — the Asana UI activity feed is the source of truth for attribution audits. See [`anti-patterns/asana.md`](./anti-patterns/asana.md).

## Documentation

- [`SKILL.md`](./SKILL.md) — phase routing + CRUD vocabulary.
- [`schemas/config.json`](./schemas/config.json) — `.asana.json` JSON Schema.
- [`anti-patterns/asana.md`](./anti-patterns/asana.md) — recurring gotchas.
- [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md) — autonomous-mode contract.

## License

MIT — see [LICENSE](./LICENSE).
