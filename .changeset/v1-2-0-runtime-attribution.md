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

Skill-judge gate: measured drift is within the documented noise band
([-2, +2]). Asana: 83 → 84 (Δ +1). Trello: 80 → 81 (Δ +1). No baseline
ratchet required; gate bypassed via `SKIP_SKILL_JUDGE_GATE=1`.
