# @llodev/pm-tasks-jira

## 1.0.1

### Patch Changes

- [#34](https://github.com/llodev/skills/pull/34) [`2dc2125`](https://github.com/llodev/skills/commit/2dc21251c75465decf59c94d09f629adec0b2cc4) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - fix(pm-tasks-jira): sanitize network-derived metadata before persisting the init config

  The `init` flow assembles the local `.jira.json` from Atlassian REST responses
  (project keys, issue-type names, status/field ids, member display names) and
  writes it to disk. `runFlow` now passes the assembled config through
  `sanitizePersistedConfig`, which rejects any string carrying an ASCII control
  character or exceeding a length bound before it reaches the filesystem — so a
  malformed or hostile instance can't write corrupt data into a file downstream
  tooling reads. Rebuilding the config from guard-checked primitives also severs
  the network→file data flow flagged by CodeQL (`js/http-to-file-access`).

  No behavior change for well-formed Jira metadata.

## 1.0.0

### Major Changes

Initial release of the Jira adapter for the pm-tasks family.

**9 canonical verbs implemented:**

- `task.create` — create a Jira issue in a team-managed project
- `task.move` — transition an issue to a new status
- `task.close` — resolve/close an issue
- `task.due-date.set` — set issue due date
- `task.assignee.add` — assign an issue to a Jira account
- `task.comment.add` — add a comment to an issue
- `task.parent.set` (F3) — link an issue as a child of an epic or parent issue
- `task.estimate.set` (F7) — set story points / time estimate via `normalizeEstimate`
- `checklist.check` — update a sub-task status (via issue transition)

**Headless `/adapter` subpath:** `import { createAdapter } from "@llodev/pm-tasks-jira/adapter"` — same agent-agnostic `McpCaller` shape as trello/asana adapters.

**Init + doctor:** `pm-tasks-jira --init` bootstraps `.jira.json`; `--doctor` validates config, board connectivity, and field availability.

**Estimation module:** `normalizeEstimate(raw, unit)` maps plain numbers and textual estimates (`"3d"`, `"8h"`, `"L"`, `"XL"`) to Jira story-point values and time-tracking seconds.

**MCP backend:** `mcp__atlassian__*` tools via `https://mcp.atlassian.com/v1/mcp` (Streamable-HTTP; SSE endpoint retired 2026-06-30).
