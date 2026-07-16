---
"@llodev/pm-tasks-jira": minor
---

Lifecycle Fidelity R4 (Jira). The typed transport `taskCreate` now maps the core `TaskCreateRequest.dueDate` to Jira `duedate` (`YYYY-MM-DD`), reaching create-time parity with the Phase 5 publish path. Adds a `references/operations.md` § Temporal handling section documenting the native-timestamp close: transitioning to `done` lets Jira auto-stamp `resolutiondate` (the actual completion) while `duedate` stays = plan and is **never overwritten** (the same native pattern as Asana, opposite of Trello). Jira has no wired start-date field — documented as an optional custom-field increment, not implemented. `estimate`/`labels`/`priority` remain on the config-aware SKILL-orchestrated path; no new config knobs. Hardened the Jira transport test mock with an allowed-key guard for `createJiraIssue` (param conformance).
