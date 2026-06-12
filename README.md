# llodev/skills

Family of `@llodev/pm-tasks-*` agent skills: turn implementation plans into project-management tasks (Trello, Asana, Jira, Linear, Notion, ClickUp, Monday, Bitrix24, Todoist) and operate them — paste, publish via MCP, or autonomous mode invoked by other agents.

## Status (v1)

| Package | Status | Install (npm) | Install (Vercel CLI) |
|---|---|---|---|
| `@llodev/pm-tasks-core` | ✅ v1 | `npm i @llodev/pm-tasks-core` | `npx skills add llodev/skills/pm-tasks-core` |
| `@llodev/pm-tasks-trello` | ✅ v1 | `npm i @llodev/pm-tasks-trello` | `npx skills add llodev/skills/pm-tasks-trello` |
| `@llodev/pm-tasks-asana` | ✅ v1 | `npm i @llodev/pm-tasks-asana` | `npx skills add llodev/skills/pm-tasks-asana` |
| `pm-tasks-jira` | 🔒 scaffold | — | — |
| `pm-tasks-linear` | 🔒 scaffold | — | — |
| `pm-tasks-notion` | 🔒 scaffold | — | — |
| `pm-tasks-clickup` | 🔒 scaffold | — | — |
| `pm-tasks-monday` | 🔒 scaffold | — | — |
| `pm-tasks-bitrix24` | 🔒 scaffold | — | — |
| `pm-tasks-todoist` | 🔒 scaffold | — | — |

## Claude Code marketplace

```
/plugin marketplace add llodev/skills
/plugin install pm-tasks-core pm-tasks-trello pm-tasks-asana
```

## Docs

- [Design spec](docs/specs/2026-06-11-pm-tasks-design.md)
- [Implementation plan](docs/plans/2026-06-11-pm-tasks-v1.md)
- [Publishing guide for skill authors](docs/publishing-guide.md)

## License

MIT
