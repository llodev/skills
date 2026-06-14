# llodev/skills

Monorepo of [Agent Skills](https://agentskills.io) published by llodev.
Skill families live under a folder named after the family; standalone
skills sit at the repo root.

## Families

### Project Management Tasks

slug: `pm-tasks-*`
Turn implementation plans into PM tasks (Trello, Asana, Jira, Linear,
Notion, ClickUp, Monday, Bitrix24, Todoist) and operate them — paste,
publish via MCP, or autonomous mode invoked by other agents.

| Package                                    | Status      | npm                             | Vercel CLI                                              |
| ------------------------------------------ | ----------- | ------------------------------- | ------------------------------------------------------- |
| `@llodev/pm-tasks` _(meta — whole family)_ | ✅ v1       | `npm i @llodev/pm-tasks`        | —                                                       |
| `@llodev/pm-tasks-core`                    | ✅ v1       | `npm i @llodev/pm-tasks-core`   | `npx skills add llodev/skills/pm-tasks/pm-tasks-core`   |
| `@llodev/pm-tasks-trello`                  | ✅ v1       | `npm i @llodev/pm-tasks-trello` | `npx skills add llodev/skills/pm-tasks/pm-tasks-trello` |
| `@llodev/pm-tasks-asana`                   | ✅ v1       | `npm i @llodev/pm-tasks-asana`  | `npx skills add llodev/skills/pm-tasks/pm-tasks-asana`  |
| `pm-tasks-jira`                            | 🔒 scaffold | —                               | —                                                       |
| `pm-tasks-linear`                          | 🔒 scaffold | —                               | —                                                       |
| `pm-tasks-notion`                          | 🔒 scaffold | —                               | —                                                       |
| `pm-tasks-clickup`                         | 🔒 scaffold | —                               | —                                                       |
| `pm-tasks-monday`                          | 🔒 scaffold | —                               | —                                                       |
| `pm-tasks-bitrix24`                        | 🔒 scaffold | —                               | —                                                       |
| `pm-tasks-todoist`                         | 🔒 scaffold | —                               | —                                                       |

### Coming next

Future families will follow the same nested layout (`<family>/<family>-<member>/`).
Candidates being planned: `ts-ddd-*` (DDD patterns for TypeScript codebases).

## Claude Code marketplace

```
/plugin marketplace add llodev/skills
/plugin install pm-tasks-core pm-tasks-trello pm-tasks-asana
```

## Docs

- [Publishing guide for skill authors](docs/publishing-guide.md)

## License

MIT. See [LICENSE](LICENSE).
