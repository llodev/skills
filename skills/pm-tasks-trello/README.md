<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-trello/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-trello/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-trello/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-trello

> Trello adapter for the `@llodev/pm-tasks-*` family — turn implementation plans into Trello cards and operate them via paste, MCP publish, or autonomous write-through.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-trello?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-trello)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

What you get:

- **Paste-ready output** — agent renders a generic card; you paste into Trello manually.
- **MCP publish** via `atlassian-trello-mcp`. Card + named checklists + labels + member assignment in one batch.
- **CRUD operations** on existing cards: `checklist.check`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`.
- **Autonomous mode** — `[autonomous]` / `--auto` sentinel for write-through under allowlist + scope + rate limits. Multi-task loops mirror state to Trello in real time.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello

# Vercel CLI (install core manually too)
npx skills add llodev/skills/skills/pm-tasks-core
npx skills add llodev/skills/skills/pm-tasks-trello
```

## Setup the MCP

Claude Code:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Approve via `/mcp` in chat. Export env vars in your shell:

```bash
export TRELLO_API_KEY=...
export TRELLO_TOKEN=...
```

Cursor / Windsurf / Codex / other agents: see [`references/mcp-config.md`](./references/mcp-config.md).

## Setup the config

```bash
npx @llodev/pm-tasks-trello init
```

Walk through the prompts. Pick where the config should live:

- **local** → `./.trello.json` (recommended for project-scoped configs, can be committed).
- **global** → a platform default, customizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/trello.json`, falling back to `~/.config/llodev/pm-tasks/trello.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\trello.json`.
  - Override on any OS with `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — the file lands at `$LLODEV_PM_TASKS_CONFIG_HOME/trello.json`.

The `init` prompt prints the absolute path it will write to, so you always see exactly where the file goes.

> [!IMPORTANT]
> Secrets belong in env vars or OS keychain — **never** in this JSON. The `init` script reads `TRELLO_API_KEY` + `TRELLO_TOKEN` from your shell, not from the config file.

## Use

| Prompt example                                                    | What the agent does                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `"publish this plan as Trello cards"`                             | Phase 5 publish — card + checklists + labels + member in one batch     |
| `"check item 3 on task X in Trello"`                              | Phase 6 CRUD — `checklist.check` on the checklist item                 |
| `"close card Y"`                                                  | Phase 6 CRUD — `task.close` (`dueComplete: true` + move to close list) |
| `"comment on card X: shipped"`                                    | Phase 6 CRUD — `task.comment.add`                                      |
| `"[autonomous] create task in trello from plan @docs/plans/X.md"` | Phase 5b autonomous (requires `autonomous.enabled: true`)              |

## Trello-specific notes

> [!NOTE]
> **`task.close` MUST set `dueComplete: true`** in addition to moving the card to the close list — the Trello UI shows the due-date strikethrough only when `dueComplete` is set.

> [!WARNING]
> **`create_card` ignores `idMembers` silently** — always follow up with `trello_add_member_to_card` per member ID. The adapter does this for you.

- **`add_member_to_card`** sometimes reports a false error even on success — the adapter re-fetches the card and checks `members[]` to confirm.
- **Trello descriptions don't render tables** — the adapter flattens them to bullets automatically (see [`references/format.md`](./references/format.md)).
- **Lifecycle fidelity (Trello is the outlier):** `task.create` writes the plan due-date to `due`. Trello has **no** native completion timestamp, so `task.close` **overwrites** `due` with the actual completion date, sets `dueComplete`, and moves the card to Done — the original plan (due date + estimate) is preserved instead in a localized **description footer**. This is the opposite of the other adapters, which never overwrite the plan field. See [`references/operations.md`](./references/operations.md) § Temporal handling and [`pm-tasks-core`'s lifecycle-fidelity reference](../pm-tasks-core/references/lifecycle-fidelity.md).

## Documentation

- [`SKILL.md`](./SKILL.md) — phase routing + CRUD vocabulary.
- [`references/format.md`](./references/format.md) — Trello formatting conventions.
- [`references/publish.md`](./references/publish.md) — MCP publish sequence.
- [`references/operations.md`](./references/operations.md) — CRUD verbs → MCP tool mapping.
- [`references/mcp-config.md`](./references/mcp-config.md) — agent-specific MCP setup.
- [`references/autonomous.md`](./references/autonomous.md) — Trello autonomous overlay (card lifecycle pattern).
- [`anti-patterns/tools.md`](./anti-patterns/tools.md) — recurring gotchas.

## License

MIT — see [LICENSE](./LICENSE).
