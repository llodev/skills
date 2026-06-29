# Jira ingestion anti-patterns

Apply when Phase 4 / Phase 5 / Phase 5b target Jira. Authoritative formatting + publish detail lives in [`../SKILL.md`](../SKILL.md).

---

## Paste health and fallbacks

| Healthy paste                                                                                    | If it degrades → fallback                                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Use markdown headings in descriptions; Atlassian MCP renders them via ADF when `markdown: true`. | If heading rendering is inconsistent in a client, switch to bold section labels; avoid raw ADF construction. |
| One level of Subtasks only; Jira does not support nested sub-subtasks.                           | Flatten deep task trees into sibling issues or separate epics/stories before publishing.                     |

**Switching tools mid-thread:** re-load the new tool's adapter; do not carry Jira rules into Asana / Trello / Linear (see **Cross-tool** below).

---

## Jira

**NEVER match transitions by name.** Status names are locale-dependent (`"To Do"` vs. `"A fazer"` vs. `"Zu erledigen"`) and change with workflow customization. **Always** match by `to.statusCategory.key` (`"new"` / `"indeterminate"` / `"done"`). Hard-coding a transition name will silently fail or match the wrong status in any non-English workspace.

**NEVER hard-code issue type names.** Type names like `"Task"`, `"Story"`, `"Subtask"` are locale-dependent (e.g. `"Tarefa"`, `"Subtarefa"` in pt-BR). Always read `issueTypes{}` from `.jira.json` for the locale-correct name.

**NEVER omit `parent` when creating a Subtask.** Jira rejects `createJiraIssue` with `issueTypeName = issueTypes.subtask` if `parent` is absent. The `checklist.check` transport enforces this, but the Phase 4 SKILL layer must pass the correct parent key.

**NEVER set `duedate` or `priority` on a Subtask.** These fields are not applicable on Subtask issue types. Attempting to set them results in a Jira API error. The transport returns `NOT_APPLICABLE` for `task.due-date.set` on Subtasks — do not retry with a workaround.

**NEVER call `addCommentToJiraIssue` without `markdown: true`.** The Atlassian MCP renders the comment body as ADF (Atlassian Document Format) when `markdown` is `false` or absent. Markdown input from the SKILL layer becomes garbled ADF. `markdown: true` is load-bearing and must always be passed.

**NEVER document or append a description footer for estimates.** Jira descriptions are ADF; programmatic modification of ADF is fragile and not attempted. The `task.estimate.set` verb preserves the human-readable estimate as an `est:<slug>` label on the issue — not in the description. See [`references/estimation.md`](../references/estimation.md) for the label strategy.

**NEVER use the SSE transport endpoint for Atlassian MCP.** The SSE endpoint (`/events`) was retired 2026-06-30. Configure the Streamable-HTTP endpoint: `https://mcp.atlassian.com/v1/mcp`. The `mcp__atlassian__*` tool names and arguments are unchanged.

**NEVER call `task.sprint.set`.** It is not in the adapter's manifest. The Atlassian MCP exposes no agile/sprint API. The core factory returns `UNSUPPORTED_VERB`. Sprint management is out of scope for v1.x; roadmapped for v1.12.0.

**NEVER send `req.parentId` as anything other than a valid Jira issue key** for `task.parent.set`. The transport validates the format (`/^[A-Z][A-Z0-9]+-\d+$/`) and returns `INVALID_REQUEST` with a hint if it fails. Passing a GID, UUID, or display name will be rejected before any MCP call.

**NEVER guess `cloudId`, `projectKey`, or `issueTypes` values.** These must come from `.jira.json` written by `npx @llodev/pm-tasks-jira init`. Stale or invented values silently create issues in the wrong project or fail issue type resolution.

---

## Cross-tool

**NEVER** apply Jira's quirks (category-based transitions, Subtask field restrictions, `cloudId` config) to another adapter after switching targets mid-chat. Re-load that adapter and apply only its rules.

---

## UI is the source of truth for activity attribution

`getJiraIssue` returns field values (summary, status, labels, etc.) but does NOT return the full changelog or history entries. Programmatic verification of activity attribution (e.g., who transitioned an issue) is therefore incomplete by design.

When auditing whether an agent action was correctly attributed, open the issue in the Jira UI and inspect the activity feed / changelog. Do not infer history from MCP field reads.

## Subtask field restrictions

Jira Subtasks have a reduced field set compared to standard issue types. The following restrictions are enforced by Jira and propagated by the transport:

| Field    | Standard issue | Subtask        |
| -------- | -------------- | -------------- |
| duedate  | Supported      | NOT_APPLICABLE |
| priority | Supported      | NOT_APPLICABLE |
| parent   | Optional       | Required       |
| labels   | Supported      | Supported      |

The transport detects Subtask field rejection via error-string matching (no pre-read `getJiraIssue` before each operation). Do not attempt to set disallowed fields by catching errors on the SKILL layer — rely on the transport's `NOT_APPLICABLE` error responses.
