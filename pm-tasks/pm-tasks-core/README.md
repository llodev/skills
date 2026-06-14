<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>

# @llodev/pm-tasks-core

Core skill shared by every `@llodev/pm-tasks-<tool>` adapter (Trello, Asana, Jira, Linear, Notion, ClickUp, Monday, Bitrix24, Todoist).

This package alone is not useful. Install at least one adapter:

```
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello
# or
npx skills add llodev/skills/pm-tasks-core llodev/skills/pm-tasks-trello
```

## What lives here

- The extraction phases (plan → generic card).
- The canonical CRUD vocabulary every adapter implements.
- The autonomous-mode contract (sentinels, allowlist, guardrails).
- The init UX shared by all adapter `init` commands.
- The audit log format.

## Optional cron — rotate audit log

```cron
# Daily at 04:00, keep 90 days of audit log for Trello + Asana
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh trello
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh asana
```

## License

MIT — see [LICENSE](./LICENSE).
