<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-clickup

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-clickup?color=blue)](https://www.npmjs.com/package/@llodev/pm-tasks-clickup)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Adaptador de ClickUp para la familia `@llodev/pm-tasks-*`. Publica planes como tareas de ClickUp con subtareas y ejecuta nueve verbos CRUD sobre tareas existentes a través del ClickUp MCP. Sirve para un responsable que publica un plan, para un miembro del equipo que publica o actualiza tareas y para un agente de IA que ejecuta un plan de forma autónoma, con los mismos verbos.

## Instalación

```bash
npm install @llodev/pm-tasks-clickup @llodev/pm-tasks-core
# or
pnpm add @llodev/pm-tasks-clickup @llodev/pm-tasks-core
```

## Configurar el MCP

Los verbos de runtime pasan por el servidor ClickUp MCP en `https://mcp.clickup.com/mcp`. El MCP gestiona el OAuth: el adaptador nunca ve una credencial para los verbos.

- Agentes que aceptan una URL de MCP remoto (Cursor, Windsurf, Cline, Roo Code y otros): añade una entrada MCP llamada `clickup` que apunte a `https://mcp.clickup.com/mcp` y aprueba el flujo OAuth en el navegador.
- Agentes que ejecutan servidores MCP como comandos locales: haz de puente con `mcp-remote`:

```json
{
  "mcpServers": {
    "clickup": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.clickup.com/mcp"] }
  }
}
```

Las herramientas aparecen como `clickup_*` (tu agente puede añadir un prefijo de servidor).

## Configurar la config

`init` descubre tu workspace, tus listas y tus estados, y escribe `.clickup.json`. El descubrimiento es de solo lectura: no se escribe nada en ClickUp. Hay dos formas de ejecutarlo.

**(a) En una terminal, con un token de API personal.** Crea el token en ClickUp → Settings → Apps → API Token, ponlo en tu entorno y ejecuta init:

```bash
export CLICKUP_API_TOKEN=<your personal token>
npx @llodev/pm-tasks-clickup init
```

Las preguntas eligen el idioma de narración, el workspace (solo cuando tienes más de uno), las listas que se usarán, el estado en curso (`wip`) de cada lista, una caché opcional de miembros, una estrategia de estimación y un bloque autónomo opcional. El archivo va a `./.clickup.json`, o a `--output <path>`. Si el archivo ya existe, se te pregunta antes de sobrescribirlo.

**(b) Dentro de una sesión de agente con el ClickUp MCP conectado.** Sin token, la CLI se detiene y te pide que ejecutes init dentro de una sesión de agente. Eso significa: pídele al agente que configure `.clickup.json`. El agente lee la jerarquía, los estados de cada lista y los miembros a través del MCP, te pide que elijas las listas y el estado `wip` de cada una, escribe el archivo según `schemas/config.json` y luego ejecuta el doctor.

## Verbos

| Verbo               | Qué hace en ClickUp                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | Crea una tarea en una lista (nombre, descripción en Markdown, etiquetas, prioridad, fecha límite, estado inicial por nombre) |
| `task.move`         | Cambia el estado al `open`, `wip` o `done` fijado de la lista; o mueve una tarea raíz a otra lista por su id                 |
| `checklist.check`   | Completa o reabre un elemento de checklist, que es una subtarea (estado `done` / `open`)                                     |
| `task.close`        | Aplica el estado `done` fijado de la lista; una tarea ya completada o cancelada se deja como está                            |
| `task.due-date.set` | Fija la fecha límite (un día del calendario, `YYYY-MM-DD`)                                                                   |
| `task.assignee.add` | Añade un responsable (id, `"me"`, correo o nombre de usuario) y conserva los actuales                                        |
| `task.comment.add`  | Publica un comentario; con un token de idempotencia se publica una sola vez                                                  |
| `task.parent.set`   | Convierte la tarea en subtarea de otra (ClickUp la mueve a la lista de la tarea padre)                                       |
| `task.estimate.set` | Registra el esfuerzo: estimación de tiempo nativa en tareas sin subtareas, más una etiqueta `est:`                           |

Cuando no hay nada que cambiar, `task.move` y `checklist.check` responden `ALREADY_IN_STATE`, que significa "nada que hacer", no un error. Los demás verbos responden `ok: true` sin escribir.

## Modos

| Modo                | Cuándo                                                 | Qué ocurre                                                                                                               |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Listo para pegar    | Ningún MCP conectado                                   | Una descripción en Markdown con el checklist en líneas `- [ ]`, lista para pegar en ClickUp                              |
| Publicación vía MCP | MCP conectado y `.clickup.json` presente               | Vista previa, aprobación y luego la tarea y una subtarea por elemento de checklist                                       |
| Autónomo            | `[autonomous]` / `--auto` y `autonomous.enabled: true` | Escribe sin aprobación en cada acción, dentro de `autonomous.allow` y `autonomous.scope.lists`                           |
| Ejecución de plan   | Un archivo o slug de plan más `.clickup.json`          | Encuentra las tareas abiertas del plan en las listas configuradas y mantiene su estado al día mientras avanza el trabajo |

## Uso

| Ejemplo de prompt                                                | Qué hace el agente                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `"publica este plan en ClickUp"`                                 | Publicación vía MCP: tarea más subtareas, tras tu aprobación                                                   |
| `"mueve la tarea de login a en curso"`                           | `task.move` al estado `wip` fijado de la lista                                                                 |
| `"marca la subtarea 'escribir tests'"`                           | `checklist.check` sobre esa subtarea                                                                           |
| `"cierra la tarea de login"`                                     | `task.close` (estado `done` fijado)                                                                            |
| `"fecha límite de la tarea de login: el próximo viernes"`        | `task.due-date.set`, con "el próximo viernes" calculado con el reloj de ClickUp                                |
| `"asígname la tarea de login"`                                   | `task.assignee.add` con `"me"`                                                                                 |
| `"estima la tarea de login en 3 horas ideales"`                  | `task.estimate.set` (`ideal_hours`, tarea sin subtareas: `time_estimate` de 180 minutos + `est:3-ideal-hours`) |
| `"[autonomous] ejecuta docs/plans/X.md y mantén ClickUp al día"` | Ejecución autónoma del plan (requiere `autonomous.enabled: true`)                                              |

## Referencia de la config

```jsonc
{
  "version": "1",
  "locale": "en-US", // narration language: en-US, pt-BR or es-ES
  "workspace": { "id": "<workspace_id>", "name": "<workspace name>" },
  "lists": [
    {
      "id": "<list_id>",
      "name": "Backlog",
      "space": "<space name>",
      "statuses": {
        "open": "to do",
        "wip": "in progress",
        "done": "complete",
        "closed": "cancelled",
      },
    },
  ],
  "defaultListId": "<list_id>",
  "members": [{ "id": "<user_id>", "name": "<name>", "alias": "<alias>" }], // optional cache
  "estimation": {
    "enabled": true,
    "strategy": "ideal_hours",
    "clickupTarget": "time",
    "hoursPerDay": 6,
  },
  "defaults": { "assigneeAlias": "me", "escalateToAlias": "<alias>" },
  "autonomous": {
    "enabled": false,
    "allow": ["task.create", "task.move", "checklist.check", "task.close", "task.comment.add"],
    "scope": { "lists": ["<list_id>"] },
    "rateLimit": { "writesPerMinute": 30, "commentsPerMinute": 10 },
    "auditLog": "./logs/clickup/audit.log",
  },
}
```

| Campo              | Significado                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lists[].statuses` | Nombres de estado fijados por lista y por rol. `open` y `done` son obligatorios; `wip` lo eliges tú; `closed` es el estado de tipo `closed` cuando difiere de `done` |
| `defaultListId`    | Dónde se crean las tareas nuevas cuando no se indica ninguna lista                                                                                                   |
| `members`          | Caché opcional con valores de `alias` únicos; la asignación también funciona sin ella                                                                                |
| `estimation`       | Opcional. Ausente o con `enabled: false` → `task.estimate.set` no aplica                                                                                             |
| `defaults`         | `"me"` o un `members[].alias`                                                                                                                                        |
| `autonomous`       | `init` escribe `enabled: false`; cámbialo tú a `true` cuando quieras que el agente escriba sin preguntar                                                             |
| `attribution`      | Bloque opcional de `@llodev/pm-tasks-core` que registra la identidad del agente en descripciones y comentarios                                                       |

Este archivo nunca guarda ninguna credencial.

## Doctor

```bash
npx @llodev/pm-tasks-clickup init --doctor
```

Ejecuta las comprobaciones compartidas de pm-tasks más las de ClickUp: config presente, id del workspace, cada lista fija `open` y `done`, estimación coherente, alcance autónomo y alias por defecto resueltos. Con `CLICKUP_API_TOKEN` definido, comprueba además en vivo que el workspace es accesible y que cada estado fijado sigue existiendo en su lista (un estado renombrado o borrado en ClickUp aparece aquí, con la lista y el rol que hay que corregir). Sin token, las comprobaciones en vivo se omiten con un aviso. Flags: `--json`, `--fix-hints-only`, `--config <path>`.

## Notas específicas de ClickUp

**Los estados se fijan, no se adivinan.** En ClickUp los estados pertenecen a cada lista y tienen un tipo (`open`, `custom`, `done`, `closed`), pero ningún tipo significa "en curso", así que eliges el `wip` de cada lista en `init`. Los nombres localizados y personalizados funcionan. Si luego renombras un estado, ejecuta el doctor y después `init` otra vez.

**Los elementos de checklist son subtareas.** El ClickUp MCP no puede escribir checklists nativos, así que cada elemento de checklist se convierte en una subtarea, y marcar un elemento aplica el estado `done` a la subtarea.

**Los responsables se añaden, nunca se reemplazan.** La actualización de ClickUp reemplaza la lista entera de responsables; el adaptador lee los responsables actuales y los vuelve a escribir junto con el nuevo.

**Las estimaciones no cuentan doble.** La estimación de tiempo nativa se escribe solo en tareas sin subtareas, porque ClickUp puede sumar las estimaciones de las subtareas en la tarea padre. La etiqueta `est:` se escribe siempre, y queda exactamente una.

**Las fechas son días del calendario en la zona horaria de la cuenta.** Las fechas relativas se calculan con el reloj de ClickUp, no con el del agente. Al cerrar, la fecha límite sigue siendo el plan; la finalización es el estado `done`.

**Cuenta de persona o de agente, mismo comportamiento.** `"me"` es quien esté autenticado en el MCP. Una cuenta dedicada al agente para ejecuciones autónomas es una opción, no un requisito.

**Los límites de plan vienen de ClickUp, no del adaptador.** ClickUp limita algunas funciones según el plan: topes de uso por función y ClickApps (como Tasks in Multiple Lists o Sprints) que un admin del workspace debe activar. El adaptador no conoce los límites de tu plan y pueden cambiar; compruébalos para tu plan antes de depender de un verbo. Cuando ClickUp rechaza una llamada por motivos del plan, el verbo falla con el mensaje de error del propio ClickUp (por ejemplo `Your plan is limited to … usages of feature`). La causa es la cuenta, no tu config.

## Limitaciones conocidas

- No hay verbo de sprint. El MCP de ClickUp no tiene ninguna acción de sprint. Un sprint es una lista, y la única forma de poner una tarea en una segunda lista es el `clickup_add_task_to_list` del MCP, que exige el ClickApp Tasks in Multiple Lists y un plan que lo permita. La lectura de tareas del MCP tampoco tiene un campo con las listas adicionales de una tarea, así que una asignación no se podría leer de vuelta. `task.move` con el id de la lista del sprint mueve allí una tarea raíz, pero la tarea sale de su lista de origen, y los cambios de estado en ella fallan hasta que registres esa lista con `init`.
- Los checklists nativos de ClickUp se pueden leer, pero no escribir.
- No se puede borrar una fecha límite a través del adaptador.
- Una subtarea no se puede desvincular de su tarea padre a través del MCP.
- Si un estado `done` fijado se renombró en ClickUp, desmarcar una subtarea informa "nada que hacer"; ejecuta el doctor.
- ClickUp no tiene actualización condicional, así que un cambio hecho entre la lectura y la escritura del adaptador no se detecta.
- La idempotencia de comentarios solo mira la primera página de comentarios.
- `init` solo descubre spaces, carpetas y listas no archivados.
- Los límites de peticiones dependen de tu plan de ClickUp.

## Seguridad

`CLICKUP_API_TOKEN` solo lo usan `init` y el doctor, se lee solo del entorno y solo para descubrimiento de solo lectura. Nunca lo pegues en un chat, una issue, un commit ni en `.clickup.json`. Los verbos usan el OAuth del MCP, no el token.

## Documentación

- [`SKILL.md`](../../SKILL.md): el skill completo (enrutamiento, modelo de ClickUp, todas las fases, verbos, sobre de resultado)
- [`references/operations.md`](../../references/operations.md): correspondencia verbo → herramienta MCP, resultados, motivos de error, idempotencia
- [`references/estimation.md`](../../references/estimation.md): estrategias, estimación solo en tareas sin subtareas, etiqueta `est:`
- [`references/autonomous.md`](../../references/autonomous.md): lista de permitidos, alcance y registro de auditoría del modo autónomo
- [`anti-patterns/clickup.md`](../../anti-patterns/clickup.md): reglas NUNCA para ClickUp
- [`schemas/config.json`](../../schemas/config.json): el schema de `.clickup.json`

## Licencia

MIT
