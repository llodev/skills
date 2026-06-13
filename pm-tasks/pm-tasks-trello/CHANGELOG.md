# @llodev/pm-tasks-trello

## 1.0.0

### Major Changes

- [`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838) - First stable release of the pm-tasks-\* family.

  - `@llodev/pm-tasks-core` — Phases 1–3 extraction pipeline (input → sections → generic card), 6 CRUD verbs (`task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`), autonomous-mode contract (allowlist + scope + rate-limit + audit log), shared init UX library.
  - `@llodev/pm-tasks-trello` — Trello adapter on the canonical generic card. Paste-friendly output, MCP-driven publish, autonomous mode against a board allowlist.
  - `@llodev/pm-tasks-asana` — Asana adapter with workspace/project/section + custom-field + subtask-inheritance support. Paste, MCP-driven publish, autonomous mode.

  Architecture, contract, and CRUD vocabulary documented in `docs/specs/2026-06-11-pm-tasks-design.md` and `docs/plans/2026-06-11-pm-tasks-v1.md`.

### Patch Changes

- Updated dependencies [[`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838)]:
  - @llodev/pm-tasks-core@1.0.0

## 0.1.0 (unreleased)

- Initial extraction from `plan-to-task-cards` Phase 5 (Trello).
- 6 CRUD verbs (create, checklist.check, close, due-date.set, assignee.add, comment.add).
- Autonomous mode behind `[autonomous]` sentinel + allowlist.
