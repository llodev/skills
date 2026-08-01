---
"@llodev/pm-tasks-linear": minor
---

Add the U1 narration-language banner and wire installed-locale discovery into the doctor so `C-LANG-1` validates `.linear.json`'s `locale` against installed i18n bundles. Agent-authored narration follows `locale`; issue content still follows the plan. (Linear's `locale` has no schema enum, so `C-LANG-1`'s shape + bundle check is the primary locale guard.)
