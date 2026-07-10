<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-core/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-core/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-core/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-core

> Core skill + CRUD vocabulary + autonomous-mode contract shared by every `@llodev/pm-tasks-<tool>` adapter.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-core?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

This package is the shared foundation. **Install it together with at least one adapter** — alone it has no tool-specific formatting and won't activate.

## Install

```bash
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello
# or
npx skills add llodev/skills/skills/pm-tasks-core llodev/skills/skills/pm-tasks-trello
```

The Claude Code marketplace bundle installs the cascade automatically — see the [repo root README](https://github.com/llodev/skills#install).

## What's inside

- **Phases 1–3** of the extraction pipeline (plan input → structured sections → canonical generic card) — the same shape every adapter consumes.
- **6 CRUD verbs** every adapter implements: `task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`.
- **Autonomous-mode contract**: activation sentinels (`[autonomous]` / `--auto`), allowlist gate, scope guardrails, audit log format, continuous-loop expectations across multi-task runs.
- **Shared init UX library** (`@llodev/pm-tasks-core/init-lib`) consumed by every adapter's `init` script — i18n strings, `promptLocale`, `loadStrings`, platform-aware config dir resolver.
- **References** in [`references/`](./references/): `contract.md`, `crud-vocabulary.md`, `autonomous-mode.md`, `generic-card.md`, `audit-log-format.md`, `init-ux.md`.

## Optional — rotate the autonomous-mode audit log

When you enable `autonomous` for an adapter, every write-through call appends a JSONL line to `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. The bundled `rotate-audit.mjs` keeps the log small and emits a JSON status object on each run.

```cron
# Daily at 04:00, rotate audit log for Trello + Asana (10 MB limit, keep 12 archives)
0 4 * * * node /path/to/pm-tasks-core/scripts/rotate-audit.mjs --tool trello
0 4 * * * node /path/to/pm-tasks-core/scripts/rotate-audit.mjs --tool asana
```

> [!TIP]
> The audit log is the agent's source of truth for "what happened in this autonomous session". Your PM tool (Trello/Asana board) is the **human's** audit log — keep both in sync. See [`references/autonomous-mode.md`](./references/autonomous-mode.md) § _Continuous operation across multi-task loops_.

## License

MIT — see [LICENSE](./LICENSE).
