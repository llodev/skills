---
"@llodev/pm-tasks-core": minor
---

Add the `C-LANG-1` doctor check and the narration-language contract (U1). When a workspace config sets `locale`, agent-authored narration — comments the agent writes, autonomous-mode commit/PR copy, code comments, and audit/CLI free-text — must use that locale's language; task content still follows the plan's language. The check reuses the existing enum-validated `locale` config field (no new field) and warns when it is unset, malformed, or has no installed i18n bundle. Replaces the roadmap §2.4 audit-free-text probe (not buildable — the audit log stores IDs, not prose) with this deterministic presence/validity check.
