---
"@llodev/pm-tasks-core": minor
"@llodev/pm-tasks-trello": minor
"@llodev/pm-tasks-asana": minor
"@llodev/pm-tasks-jira": minor
"@llodev/pm-tasks-testkit": minor
"@llodev/pm-tasks": minor
"@llodev/django-schema-design": minor
---

Refresh published package metadata for the flattened `skills/` + `packages/` repository layout. `homepage` and `repository.directory` now point at the new paths, so npm and registry "Repository"/"Homepage" links resolve instead of 404ing against the removed `pm-tasks/*` and `django/*` folders. Documentation-only for consumers — no API, runtime, or behavior changes.
