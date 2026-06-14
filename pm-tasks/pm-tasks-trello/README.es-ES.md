# @llodev/pm-tasks-trello

Adaptador de Trello para la familia `@llodev/pm-tasks-*`. Convierte planes de implementación en cards de Trello (listos para pegar o publicados vía MCP) y opera sobre ellos (`checklist.check`, `task.close`, `task.comment.add`, etc.).

## Instalación

```bash
# npm (con skillpm o Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello

# Vercel CLI (instala el core manualmente también)
npx skills add llodev/skills/pm-tasks-core
npx skills add llodev/skills/pm-tasks-trello
```

## Configuración del MCP

Claude Code:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Aprueba vía `/mcp` en el chat. Exporta las env vars en tu shell:

```bash
export TRELLO_API_KEY=...
export TRELLO_TOKEN=...
```

Cursor/Windsurf: consulta [`references/mcp-config.md`](references/mcp-config.md).

## Configuración del config

```bash
npx @llodev/pm-tasks-trello init
```

Sigue los prompts. Elige dónde debe vivir el config:

- **local** → `./.trello.json` (recomendado para configs por proyecto, puede commitearse).
- **global** → un default de la plataforma, personalizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/trello.json`, con fallback a `~/.config/llodev/pm-tasks/trello.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\trello.json`.
  - Sobrescribe en cualquier SO con `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — el archivo termina en `$LLODEV_PM_TASKS_CONFIG_HOME/trello.json`.

El prompt del `init` imprime la ruta absoluta donde escribirá, así que siempre ves exactamente dónde cae el archivo.

## Uso

- `"publica este plan como cards de Trello"` → flujo de publish
- `"marca item 3 en la tarea X en Trello"` → op CRUD
- `"cierra el card Y"` → close
- `"[autonomous] create task in trello from plan @docs/plans/X.md"` → autónomo (requiere `autonomous.enabled: true` en el config)

## Licencia

MIT — consulta [LICENSE](./LICENSE).
