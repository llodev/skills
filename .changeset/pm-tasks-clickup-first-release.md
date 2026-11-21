---
"@llodev/pm-tasks": minor
---

Meta-package now installs `@llodev/pm-tasks-clickup` 1.0.0, the new ClickUp adapter, added to the peer and dev dependencies and to the install list. The adapter implements nine verbs through the ClickUp MCP (`task.create`, `task.move`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`, `task.parent.set`, `task.estimate.set`), with statuses pinned per list by role at `init`, checklist items as subtasks, and a read-only `CLICKUP_API_TOKEN` path for `init` and `doctor`. `task.sprint.set` is not supported. No API change for existing adapters.
