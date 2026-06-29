# @llodev/pm-tasks-jira

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
