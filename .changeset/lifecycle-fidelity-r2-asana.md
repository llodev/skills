---
"@llodev/pm-tasks-asana": minor
---

Lifecycle Fidelity R2 (Asana). The typed transport `taskCreate` now maps the core `TaskCreateRequest.dueDate` to Asana `due_on` (create-time parity with the Phase 5 publish path; malformed input short-circuits to `INVALID_REQUEST`). Adds a `references/operations.md` § Temporal handling section documenting the create/start/close split: on WIP move the agent stamps `start_on` (re-sending the current `due_on`, as the MCP requires), and at close Asana's native `completed_at` is the actual completion while `due_on` stays = plan (never overwritten). `estimate`/`labels`/`priority` remain on the config-aware SKILL-orchestrated path (the transport is config-free); no new config knobs.
