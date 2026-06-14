---
name: pm-tasks-core
description: >-
  Core extraction + vocabulary for the @llodev/pm-tasks-* family. Use when
  working with any pm-tasks-<tool> adapter (Trello, Asana, etc.) — provides
  Phases 1–3 (identify input, extract structure, build the generic card) plus
  the canonical CRUD vocabulary (task.create, checklist.check, task.close,
  task.due-date.set, task.assignee.add, task.comment.add) consumed by adapters.
  Also defines autonomous-mode contract (sentinels, allowlist, scope, audit log)
  and the shared init UX. Triggered indirectly by any prompt that an adapter
  handles (e.g. "create Trello card", "publish plan to Asana", "[autonomous]
  create task"). Do NOT activate alone — it has no tool-specific formatting.
license: MIT
metadata:
  version: 1.1.1
  tags:
    - agent-skill
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: core
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-core

Núcleo compartido por todos los adaptadores `pm-tasks-<tool>`. Define las fases de extracción, la estructura del generic-card, el vocabulario CRUD, el contrato del modo autónomo, las reglas de búsqueda de configuración y el formato del log de auditoría. Los adaptadores referencian esta skill por ruta — no hay mecanismo formal de dependencia en la especificación.

## Enrutamiento

Los adaptadores invocan esta skill ANTES de aplicar su formato específico de herramienta. El puntero exacto está documentado en [`references/contract.md`](references/contract.md).

## Fases

| Fase | Propósito                                                             | Referencia                                                 |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | Identificar la entrada (archivo de plan vs paste inline vs implícito) | [`references/contract.md`](references/contract.md) § 1     |
| 2    | Extraer secciones por intención (goal, prereqs, tasks, done-when)     | [`references/contract.md`](references/contract.md) § 2     |
| 2.5  | Gate de anti-patterns                                                 | [`anti-patterns/core.md`](anti-patterns/core.md)           |
| 3    | Construir el generic card                                             | [`references/generic-card.md`](references/generic-card.md) |

Los adaptadores ejecutan luego las Fases 4+ según su propio SKILL.md.

## Vocabulario CRUD (verbos que los adaptadores implementan)

Consulta [`references/crud-vocabulary.md`](references/crud-vocabulary.md). Seis verbos, todos idempotentes (con reglas de `clientToken` para los casos no-naturales).

## Modo autónomo

Consulta [`references/autonomous-mode.md`](references/autonomous-mode.md). Se activa únicamente con el centinela `[autonomous]` / `--auto` / env `LLODEV_PM_TASKS_AUTONOMOUS=1`. Requiere allowlist + scope + rate limit explícitos en la configuración de la herramienta. Nunca se infiere.

## Configuración

Orden de búsqueda: `<git-root>/.<tool>.json` → `~/.config/llodev/pm-tasks/<tool>.json` → aborta. Los secretos NUNCA en JSON (solo env vars / llavero del SO).

## Log de auditoría

JSONL append-only en `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. Schema en [`references/audit-log-format.md`](references/audit-log-format.md). Sirve también como índice de búsqueda para la resolución de `<task-ref>`.

## Helper de init

Los adaptadores exponen `npx @llodev/pm-tasks-<tool> init`. UX compartida en [`references/init-ux.md`](references/init-ux.md). Librería de implementación en `./scripts/init-lib.mjs`.

## Fallback standalone

Esta skill no es útil sin un adaptador. Si se activa sola, indica al usuario que instale al menos un paquete `pm-tasks-<tool>`.
