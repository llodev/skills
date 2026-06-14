<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>

# @llodev/pm-tasks-asana

Adaptador de Asana para la familia `@llodev/pm-tasks-*`. Convierte planes de implementación en parent tasks + subtareas de Asana (listas para pegar o publicadas vía MCP) y opera sobre ellas (`checklist.check`, `task.close`, `task.comment.add`, etc.).

## Instalación

```bash
# npm (con skillpm o Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-asana

# Vercel CLI (instala el core manualmente también)
npx skills add llodev/skills/pm-tasks-core
npx skills add llodev/skills/pm-tasks-asana
```

## Configuración del MCP

Asana usa OAuth vía el MCP `claude.ai Asana`. Si ya conectaste tu cuenta de Asana en los ajustes de Cursor o Claude Code, ya está — sin pasos adicionales.

Para cualquier agente capaz de MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

1. Abre los ajustes de MCP del agente.
2. Habilita / registra `claude.ai Asana` (o el MCP de Asana equivalente de tu agente).
3. Aprueba el flujo OAuth en tu navegador.

En Claude Code, verifica con `claude mcp list` — `claude.ai Asana` debe aparecer como autenticado. Otros agentes tienen sus propios comandos de listado; consulta la doc de MCP de tu agente.

## Configuración del config

El script `init` corre **fuera** del MCP, así que necesita un Personal Access Token para enumerar tus workspaces / projects / sections / custom fields. Genera uno en https://app.asana.com/0/my-apps, y luego:

```bash
export LLODEV_PM_TASKS_ASANA_PAT=...
npx @llodev/pm-tasks-asana init
```

Sigue los prompts. Elige dónde debe vivir el config:

- **local** → `./.asana.json` (recomendado para configs por proyecto, puede commitearse).
- **global** → un default de la plataforma, personalizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/asana.json`, con fallback a `~/.config/llodev/pm-tasks/asana.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\asana.json`.
  - Sobrescribe en cualquier SO con `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — el archivo termina en `$LLODEV_PM_TASKS_CONFIG_HOME/asana.json`.

El prompt del `init` imprime la ruta absoluta donde escribirá, así que siempre ves exactamente dónde cae el archivo.

El PAT lo usa **únicamente** el `init`. El MCP en sí usa OAuth — nunca pongas tokens en el JSON.

## Uso

- `"publica este plan como tareas de Asana"` → flujo de publish (parent + subtareas)
- `"marca subtarea 3 en la tarea X en Asana"` → op CRUD
- `"cierra la tarea Y"` → close
- `"comenta en la tarea X: ..."` → comment
- `"[autonomous] create task in asana from plan @docs/plans/X.md"` → autónomo (requiere `autonomous.enabled: true` en el config)

## Notas específicas de Asana

- **Las subtareas tienen un nivel de profundidad** — el adaptador aplana checklists anidadas en una sola capa de subtareas.
- **Los custom fields NO se heredan por defecto** — lista los IDs de fields en `subtaskDefaults.inheritParentFields` para que el adaptador los copie del parent a las subtareas en el momento del create.
- **El assignee es un campo único** — usa `task.assignee.add` para añadir followers; el assignee primario reemplaza en caso de conflicto.

## Licencia

MIT — consulta [LICENSE](./LICENSE).
