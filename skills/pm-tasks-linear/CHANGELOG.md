# @llodev/pm-tasks-linear

## 1.1.0

### Minor Changes

- [#60](https://github.com/llodev/skills/pull/60) [`02912ce`](https://github.com/llodev/skills/commit/02912ce4d11e677689becf44d388e5463b68287f) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - Lifecycle Fidelity R4 (Linear). The typed transport `taskCreate` now maps the core `TaskCreateRequest.dueDate` to Linear `dueDate` (`YYYY-MM-DD`), reaching create-time parity with the Phase 5 publish path. Adds a `references/operations.md` § Temporal handling section documenting that start and close are **already native**: `task.move → started` auto-stamps `startedAt` and `task.close → completed` auto-stamps `completedAt`, while `dueDate` stays = plan and is **never overwritten** (native pattern like Asana/Jira, opposite of Trello). `estimate`/`labels`/`priority` remain on the config-aware SKILL-orchestrated path; no new config knobs. This closes the Lifecycle Fidelity program (core → Asana → Trello → Jira → Linear).
