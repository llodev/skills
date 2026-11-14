---
"@llodev/ui-art-direction": minor
"@llodev/ui": minor
---

feat(ui-art-direction): first release of the ui-art-direction skill

New `ui-*` family. `@llodev/ui-art-direction` art-directs a UI in image models
first, then builds it in code and verifies it against the mockup. `@llodev/ui`
installs the family. The helper scripts need Python 3.10+ and Pillow.

Known limits: behavior was checked on phases 0-2 against a no-skill baseline.
Phases 3-7 were not run end to end: they are covered by script tests and by a
two read-throughs (fresh agents given only SKILL.md and one reference judged
each executable but under-specified in places; the first pass's gaps were
closed, the second, stricter pass still found smaller ones such as a capture
fallback without Playwright, pass thresholds, mobile and multi-section site
details, and a few naming inconsistencies between files).
`frames.py` was only exercised with a stubbed ffmpeg.
