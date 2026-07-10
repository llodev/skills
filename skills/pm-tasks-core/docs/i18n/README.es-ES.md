<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-core/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-core/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-core/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-core

> Skill base + vocabulario CRUD + contrato de autonomous mode compartidos por cada adapter `@llodev/pm-tasks-<tool>`.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-core?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Este paquete es la base compartida. **Instálalo junto con al menos un adapter** — por sí solo no tiene formato específico de herramienta y no se activará.

## Instalación

```bash
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello
# o
npx skills add llodev/skills/skills/pm-tasks-core llodev/skills/skills/pm-tasks-trello
```

El bundle del marketplace de Claude Code instala la cascada automáticamente — mira el [README raíz del repo](https://github.com/llodev/skills#install).

## Qué incluye

- **Phases 1–3** del pipeline de extracción (plan de entrada → secciones estructuradas → generic card canónico) — el mismo shape que cada adapter consume.
- **6 verbos CRUD** que cada adapter implementa: `task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`.
- **Contrato de autonomous mode**: centinelas de activación (`[autonomous]` / `--auto`), gate de allowlist, guardrails de scope, formato del audit log, expectativas de bucle continuo en runs multi-task.
- **Librería compartida de init UX** (`@llodev/pm-tasks-core/init-lib`) consumida por el script `init` de cada adapter — strings de i18n, `promptLocale`, `loadStrings`, resolver de directorio de config según la plataforma.
- **Referencias** en [`references/`](../../references/): `contract.md`, `crud-vocabulary.md`, `autonomous-mode.md`, `generic-card.md`, `audit-log-format.md`, `init-ux.md`.

## Opcional — rotar el audit log del autonomous mode

Cuando activas `autonomous` en un adapter, cada llamada write-through añade una línea JSONL a `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. El `rotate-audit.sh` incluido mantiene el log pequeño.

```cron
# Diariamente a las 04:00, mantiene 90 días de audit log para Trello + Asana
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh trello
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh asana
```

> [!TIP]
> El audit log es la fuente de verdad del agente para "qué ocurrió en esta sesión autonomous". Tu herramienta de PM (board de Trello/Asana) es el audit log **humano** — mantén ambos en sincronía. Mira [`references/autonomous-mode.md`](../../references/autonomous-mode.md) § _Continuous operation across multi-task loops_.

## Licencia

MIT — mira [LICENSE](../../LICENSE).
