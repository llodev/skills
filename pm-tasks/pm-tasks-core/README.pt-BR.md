<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>

# @llodev/pm-tasks-core

Skill núcleo compartilhada por todos os adapters `@llodev/pm-tasks-<tool>` (Trello, Asana, Jira, Linear, Notion, ClickUp, Monday, Bitrix24, Todoist).

Esse pacote sozinho não é útil. Instale pelo menos um adapter:

```
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello
# ou
npx skills add llodev/skills/pm-tasks-core llodev/skills/pm-tasks-trello
```

## O que vive aqui

- As fases de extração (plano → generic card).
- O vocabulário CRUD canônico que todo adapter implementa.
- O contrato do modo autônomo (sentinelas, allowlist, guardrails).
- A UX de init compartilhada por todos os comandos `init` dos adapters.
- O formato do log de auditoria.

## Cron opcional — rotacionar o log de auditoria

```cron
# Diariamente às 04:00, mantém 90 dias de log de auditoria para Trello + Asana
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh trello
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh asana
```

## Licença

MIT — veja [LICENSE](./LICENSE).
