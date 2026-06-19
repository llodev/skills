---
"@llodev/pm-tasks-core": minor
---

v1.7.0 — Quality gates + dependabot sweep. Coverage floor (50/75/60/50 starting baseline, threshold ratcheted to current measured baseline per plan §Cross-cutting; ratchet up in future PRs) via Vitest v8 wired into `pnpm validate`. Package-size budget via `size-limit` (@size-limit/file preset) — per-package gzipped budgets enforced in `pnpm validate`. Skill-judge rubric golden master (SHA-256 + dimensions) + drift gate in `pre-release-check.sh`. Vitest 2.x → 3.2.6 across the workspace, closing 8 dependabot alerts (1 critical + 1 high + 6 medium: GHSA-5xrq-8626-4rwp, GHSA-fx2h-pf6j-xcff, GHSA-v6wh-96g9-6wx3, GHSA-4w7w-66w2-5vf9, GHSA-67mh-4wv8-2f99, GHSA-h67p-54hq-rp68). Dependabot major-ignore policy (typescript / vitest / ajv) now propagated to every npm directory.
