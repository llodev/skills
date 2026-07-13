<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-linear

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-linear?color=blue)](https://www.npmjs.com/package/@llodev/pm-tasks-linear)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Adaptador de Linear para la familia `@llodev/pm-tasks-*`. Publica tarjetas genéricas como incidencias de Linear y despacha operaciones CRUD a través del [Linear MCP](https://linear.app/docs/mcp). El **primer** adaptador de la familia pm-tasks en implementar `task.sprint.set` (mediante ciclos de Linear).

## Instalación

```bash
npm install @llodev/pm-tasks-linear @llodev/pm-tasks-core
# o
pnpm add @llodev/pm-tasks-linear @llodev/pm-tasks-core
```

## Setup del MCP

Linear utiliza el **Linear MCP** sobre Streamable-HTTP en `https://mcp.linear.app/mcp`. El MCP gestiona OAuth — el adaptador nunca accede a tokens.

Para cualquier agente compatible con MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

- **Claude Code**: `claude mcp add linear -s project -- npx -y @linear/mcp-server` (o sigue la [guía de setup del MCP de Linear](https://linear.app/docs/mcp)) y aprueba el flujo OAuth en tu navegador.
- **Cursor / Windsurf / Cline / Roo Code**: añade una entrada MCP en la configuración del agente apuntando a `https://mcp.linear.app/mcp`.
- **Codex**: añade una entrada `[mcp_servers.linear]` en `~/.codex/config.toml`.

En Claude Code, verifica con `claude mcp list` — `linear` debería aparecer como autenticado.

## Setup de la config

El script `init` enumera tu equipo de Linear, estados, etiquetas, miembros y configuración de estimación, y luego escribe un `.linear.json`. Ejecútalo desde una sesión de agente que ya tenga el Linear MCP conectado, o de forma independiente con una clave API de Linear.

**Modo MCP (recomendado):**

```bash
npx @llodev/pm-tasks-linear init
```

Sigue los pasos. El script utiliza el Linear MCP para descubrir los metadatos de tu equipo — no se requieren credenciales adicionales.

**GraphQL independiente (sin MCP):**

Crea una clave API personal en [linear.app/settings/api](https://linear.app/settings/api), y luego:

```bash
export LINEAR_API_KEY=lin_api_...
npx @llodev/pm-tasks-linear init
```

Elige dónde guardar la config:

- **local** → `./.linear.json` (recomendado para configuraciones por proyecto, se puede commitear).
- **global** → valor predeterminado de la plataforma:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/linear.json`, o `~/.config/llodev/pm-tasks/linear.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\linear.json`.
  - Personalizar con `LLODEV_PM_TASKS_CONFIG_HOME=/tu/ruta`.

El prompt de init muestra la ruta absoluta donde se guardará el archivo.

Ejecuta comprobaciones de salud del workspace en cualquier momento con:

```bash
npx @llodev/pm-tasks-linear init --doctor
```

> [!IMPORTANTE]
> La clave API **solo** se usa en `init` para descubrir los metadatos del equipo. El Linear MCP usa OAuth — nunca pongas la clave API en `.linear.json`.

## Uso

| Ejemplo de prompt                                                          | Lo que hace el agente                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `"publica este plan como incidencias de Linear"`                           | Publicación Phase 5 — incidencia padre + sub-incidencias + etiquetas en lote    |
| `"marca la sub-incidencia LEO-43"`                                         | CRUD Phase 6 — `checklist.check` (mueve la sub-incidencia al estado completado) |
| `"cierra LEO-42"`                                                          | CRUD Phase 6 — `task.close` (estado resuelto por tipo `completed`)              |
| `"pon la estimación de LEO-42 en 5 puntos"`                                | CRUD Phase 6 — `task.estimate.set` (esfuerzo → puntos + etiqueta `est:`)        |
| `"mueve LEO-42 bajo LEO-12"`                                               | CRUD Phase 6 — `task.parent.set` (profundidad arbitraria)                       |
| `"asigna el ciclo 3 a LEO-42"`                                             | CRUD Phase 6 — `task.sprint.set` (resuelve ciclo por número)                    |
| `"[autonomous] crea incidencias de Linear desde el plan @docs/plans/X.md"` | Phase 5b autónomo (requiere `autonomous.enabled: true`)                         |

## Notas específicas de Linear

**Sub-incidencias como listas de verificación:** Linear no tiene listas de verificación nativas. Los elementos de una lista de verificación de la tarjeta genérica se convierten en **sub-incidencias** (`save_issue { parentId }`). `checklist.check` mueve la sub-incidencia al estado completado.

**Estados por tipo:** El adaptador resuelve estados por tipo (`unstarted`, `started`, `completed`, `canceled`) — nunca por nombre. Los nombres de estado dependen del idioma y pueden ser personalizados por el equipo.

**Asignación única:** Linear admite un único asignado por incidencia. `task.assignee.add` es una operación de asignación — reemplaza al asignado actual.

**Etiquetas como conjunto de reemplazo:** Cualquier escritura de etiquetas sobreescribe toda la lista. El adaptador siempre lee las etiquetas actuales antes de escribir (lectura-modificación-escritura).

**Ciclos = sprints:** `task.sprint.set` asigna una incidencia a un ciclo de Linear. Los ciclos son específicos del equipo — actívalos en Configuración del equipo antes de usar. Devuelve `NOT_APPLICABLE` cuando los ciclos están deshabilitados.

**Upsert con save_issue:** Cuando `id` no está presente, `save_issue` **crea** una nueva incidencia. Siempre pasa `id` en las actualizaciones — omitirlo crea silenciosamente un duplicado.

## Documentación

- [`SKILL.md`](../../SKILL.md) — referencia completa del skill (enrutamiento, modelo de Linear, todas las fases, verbos CRUD, envelope de resultado)
- [`references/operations.md`](../../references/operations.md) — mapeo verbo → herramienta MCP, resolución de task-ref, códigos de error
- [`references/estimation.md`](../../references/estimation.md) — estrategias de estimación, idempotencia de la etiqueta `est:<slug>`
- [`references/autonomous.md`](../../references/autonomous.md) — scope del modo autónomo de Linear y lista de permisos
- [`anti-patterns/linear.md`](../../anti-patterns/linear.md) — reglas NUNCA para Linear
- [`schemas/config.json`](../../schemas/config.json) — esquema del `.linear.json`

## Licencia

MIT
