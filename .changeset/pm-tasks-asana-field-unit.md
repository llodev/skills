---
"@llodev/pm-tasks-asana": minor
---

Number custom fields can declare a `unit` (`minutes|hours|days|points`); values are converted to the field's native unit before writing (e.g. 12 h → 720 min), fixing estimated-duration being stored in the wrong unit. Clarify that `subtaskDefaults.inheritParentFields` is an auto-copy floor, not a whitelist — Competência/Módulo/due date are filled per-task from actual scope and never left blank. SKILL.md + anti-patterns hardened.

skill-judge: pm-tasks-asana scored 85/100 vs baseline 83 (Δ +2); baseline ratcheted 83→85 (real, within-band improvement) so the CI skill-judge gate passes without the local SKIP_SKILL_JUDGE_GATE bypass.
