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

Walk through the prompts. Output: `.trello.json` (repo) or `~/.config/llodev/pm-tasks/trello.json` (global).

## Use

- `"publicar esse plano como cards no Trello"` → publish flow
- `"marca o item 3 da task X no Trello"` → CRUD op
- `"fecha o card Y"` → close
- `"[autonomous] create task in trello from plan @docs/plans/X.md"` → autonomous (requires `autonomous.enabled: true` in config)

## License

MIT — see [LICENSE](./LICENSE).
