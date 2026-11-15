# @llodev/ui

## 0.1.0

### Minor Changes

- [#127](https://github.com/llodev/skills/pull/127) [`fe030c0`](https://github.com/llodev/skills/commit/fe030c0460ea854448d000df49f314db89763c6a) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - feat(ui-art-direction): first release of the ui-art-direction skill

  New `ui-*` family. `@llodev/ui-art-direction` art-directs a UI in image models
  first, then builds it in code and verifies it against the mockup. `@llodev/ui`
  installs the family. The helper scripts need Python 3.10+ and Pillow.

  Known limits: behavior was checked on phases 0-2 against a no-skill baseline.
  Phases 3-7 were not run end to end: they are covered by script tests and by
  three read-throughs (fresh agents given the skill and one reference judged each
  executable but under-specified in places; gaps and cross-file contradictions
  were fixed after each pass, the last pass still found small ambiguities such as
  thresholds, mobile and multi-section site details and fallback paths without
  Playwright, and the contradiction fixes after it were not re-read).
  `frames.py` was only exercised with a stubbed ffmpeg.
