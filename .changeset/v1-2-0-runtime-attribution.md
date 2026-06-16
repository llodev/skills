---
"@llodev/pm-tasks-core": minor
"@llodev/pm-tasks-asana": minor
"@llodev/pm-tasks-trello": minor
---

Add opt-in runtime attribution: agents can now stamp `commentPrefix`,
`autonomousCommentPrefix` and `descriptionFooter` on every `task.create` and
`task.comment.add`, with strings sourced from `pm-tasks-core/i18n` — fully
locale-aware. Disabled by default; enable via `attribution.enabled: true` in
config.json. Closes the v1.0 "Phase C" design item that was deferred from v1.1.
