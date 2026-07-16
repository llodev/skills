---
"@llodev/pm-tasks-trello": minor
---

Lifecycle Fidelity R3 (Trello). The typed transport `taskCreate` now maps the core `TaskCreateRequest.dueDate` to Trello `due` (full ISO 8601; create-time parity with the Phase 5 publish path). Adds a `references/operations.md` § Temporal handling section documenting the create/start/close split: on WIP move the agent stamps the native `start` field, and at close — because Trello has no auto completion timestamp — the agent **overwrites** `due` = actual completion + `dueComplete: true` + moves to Done, preserving the plan (original due + estimate) in a single localized description footer (replace-not-duplicate; never clobbers the attribution footer). This is the mirror image of Asana's native no-overwrite close. `estimate`/`labels`/`priority` remain on the config-aware SKILL-orchestrated path (the transport is config-free); no new config knobs.
