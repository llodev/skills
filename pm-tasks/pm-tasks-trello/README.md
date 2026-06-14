# @llodev/pm-tasks-trello

Trello adapter for the `@llodev/pm-tasks-*` family. Convert implementation plans into Trello cards (paste-ready or published via MCP) and operate them (`checklist.check`, `task.close`, `task.comment.add`, etc.).

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello

# Vercel CLI (install core manually too)
npx skills add llodev/skills/pm-tasks-core
npx skills add llodev/skills/pm-tasks-trello
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

Cursor/Windsurf: see [`references/mcp-config.md`](references/mcp-config.md).

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

## Use

- `"publish this plan as Trello cards"` → publish flow
- `"check item 3 on task X in Trello"` → CRUD op
- `"close card Y"` → close
- `"[autonomous] create task in trello from plan @docs/plans/X.md"` → autonomous (requires `autonomous.enabled: true` in config)

## License

MIT — see [LICENSE](./LICENSE).
