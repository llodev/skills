# @llodev/pm-tasks-core

Skill núcleo compartida por todos los adaptadores `@llodev/pm-tasks-<tool>` (Trello, Asana, Jira, Linear, Notion, ClickUp, Monday, Bitrix24, Todoist).

Este paquete por sí solo no es útil. Instala al menos un adaptador:

```
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello
# o
npx skills add llodev/skills/pm-tasks-core llodev/skills/pm-tasks-trello
```

## Qué vive aquí

- Las fases de extracción (plan → generic card).
- El vocabulario CRUD canónico que todo adaptador implementa.
- El contrato del modo autónomo (centinelas, allowlist, guardrails).
- La UX de init compartida por todos los comandos `init` de los adaptadores.
- El formato del log de auditoría.

## Cron opcional — rotar el log de auditoría

```cron
# Diariamente a las 04:00, mantiene 90 días de log de auditoría para Trello + Asana
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh trello
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh asana
```

## Licencia

MIT — consulta [LICENSE](./LICENSE).
