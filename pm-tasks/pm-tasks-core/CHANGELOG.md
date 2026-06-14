# @llodev/pm-tasks-core

## 1.0.1

### Patch Changes

- `init-lib.promptScope` now resolves the global config dir per OS:
  - `LLODEV_PM_TASKS_CONFIG_HOME` env var wins on any platform.
  - macOS / Linux: `XDG_CONFIG_HOME` → fallback `~/.config/llodev/pm-tasks/`.
  - Windows: `%APPDATA%\llodev\pm-tasks\`.
  - The prompt prints the resolved absolute path before asking the user to confirm.
- New named export `resolveGlobalConfigDir()` for adapters or docs tooling that need the same logic.
- New named export `aliasOf(name)`. Now Unicode-aware: NFD-normalizes and strips combining diacritics before slugging, so `"Em execução"` → `"em-execucao"` and `"Média"` → `"media"` instead of `"em-execu-o"` / `"m-dia"`.
- New named export `promptPick(label, choices, { defaultIndex, allowSkip })`. Single-choice prompt with optional default index and skip support — used by adapters to ask which list/section means "closed" and which member is the escalation target.
- `multiSelect`: empty input now selects ALL choices instead of returning an empty array. Prompt label updated to `"(empty = all)"`.

## 1.0.0

### Major Changes

- [`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838) - First stable release of the pm-tasks-\* family.

  - `@llodev/pm-tasks-core` — Phases 1–3 extraction pipeline (input → sections → generic card), 6 CRUD verbs (`task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`), autonomous-mode contract (allowlist + scope + rate-limit + audit log), shared init UX library.
  - `@llodev/pm-tasks-trello` — Trello adapter on the canonical generic card. Paste-friendly output, MCP-driven publish, autonomous mode against a board allowlist.
  - `@llodev/pm-tasks-asana` — Asana adapter with workspace/project/section + custom-field + subtask-inheritance support. Paste, MCP-driven publish, autonomous mode.

  Architecture, contract, and CRUD vocabulary documented in `docs/specs/2026-06-11-pm-tasks-design.md` and `docs/plans/2026-06-11-pm-tasks-v1.md`.

## 0.1.0 (unreleased)

- Initial extraction from `plan-to-task-cards` v0.
