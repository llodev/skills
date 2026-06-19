---
"@llodev/pm-tasks-core": minor
"@llodev/pm-tasks-asana": minor
"@llodev/pm-tasks-trello": minor
---

v1.8.0 — Observability v1. pm-tasks-core-doctor CLI validates workspace config / autonomous allowlist / audit writability / (when probes are injected) MCP & network reach BEFORE the first publish attempt fails noisily. Adapter init bins expose `--doctor` for per-tool checks (C-TRL-1..3 + C-ASN-1..3, gated by auth env). Smart audit-log rotation (size + age + multi-tool, atomic, idempotent, gzipped archives, keep-N) replaces the rudimentary shell script; new `rotate-audit.mjs` CLI emits structured JSON status. Pre-release gate now blocks on doctor errors. Closes roadmap §2.4 O1 + O3.
