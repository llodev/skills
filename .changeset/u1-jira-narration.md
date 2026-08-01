---
"@llodev/pm-tasks-jira": minor
---

Add the U1 narration-language banner and wire installed-locale discovery into the doctor so `C-LANG-1` validates `.jira.json`'s `locale` against installed i18n bundles. Agent-authored narration follows `locale`; issue content still follows the plan. (Jira's `locale` has no schema enum, so `C-LANG-1`'s shape + bundle check is the primary locale guard.)
