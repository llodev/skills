---
"@llodev/pm-tasks-core": patch
"@llodev/pm-tasks-asana": patch
"@llodev/pm-tasks-trello": patch
---

CI: release workflow now runs `validate` + `contract:check` + `pre-release` (skill-judge gate) before publish, and a new `scripts/tarball-snapshot.test.mjs` (wired into `pnpm validate`) detects regressions in each package's `files` field. npm publishes use `NPM_CONFIG_PROVENANCE=true` for supply-chain attestation (requires `id-token: write` permission in the workflow). No runtime changes.
