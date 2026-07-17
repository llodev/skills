---
"@llodev/pm-tasks": patch
---

Meta-package now installs the full released family — added `@llodev/pm-tasks-jira` and `@llodev/pm-tasks-linear` to the peer/dev dependencies and the install list (previously only core + Trello + Asana). No API change; installing `@llodev/pm-tasks` now pulls in all five released adapters.
