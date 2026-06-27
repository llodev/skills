---
name: pm-tasks-jira
description: >-
  Jira adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Jira, asks to "create Jira issue", "publish to Jira", "log to Jira",
  "check subtask in Jira", or uses --publish-jira; OR for CRUD on existing
  issues (check subtask, close issue, change due-date, assign person, comment,
  set estimate, set parent); OR when invoked autonomously by another agent with
  [autonomous] / --auto sentinel. Jira model: team-managed, Kanban; issue →
  Subtask hierarchy (one level); transitions resolved at runtime by status
  category (locale-safe); estimate via story_points or timetracking field.
  Modes: paste-ready (no MCP), MCP publish (via Atlassian Remote MCP,
  Streamable-HTTP transport), autonomous (write-through with allowlist).
  Implements 9 verbs (task.create, task.move, checklist.check, task.close,
  task.due-date.set, task.assignee.add, task.comment.add, task.parent.set,
  task.estimate.set) from pm-tasks/pm-tasks-core/references/contract.md.
  F2 task.sprint.set is NOT supported — Atlassian MCP exposes no sprint API.
  Requires @llodev/pm-tasks-core installed.
license: MIT
metadata:
  version: 1.0.0
  tags:
    - agent-skill
    - jira
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: jira
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# pm-tasks-jira

Adapter for Jira within the `@llodev/pm-tasks-*` family. Use the core skill's extraction phases, then apply Jira formatting and optionally publish/operate via the Atlassian Remote MCP server.

## Routing

| Mode           | Trigger                                                                                                         | Path                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Paste-only     | "format as Jira issue" without MCP intent                                                                       | Phase 3 (core) → Phase 4 (this skill, format only) → output paste blocks                                               |
| MCP publish    | "publish to Jira", "create on Jira", "--publish-jira"                                                           | Phase 3 → Phase 4 → Phase 5 (publish via MCP)                                                                          |
| Autonomous     | `[autonomous]` or `--auto` in prompt OR `LLODEV_PM_TASKS_AUTONOMOUS=1`                                          | Phase 3 → Phase 4 → Phase 5b (write-through, no preview)                                                               |
| CRUD ops       | "check subtask N on KAN-1", "close KAN-2", "assign Alice to KAN-3", "comment on KAN-4", "set estimate on KAN-5" | Phase 6 (operations, direct verb dispatch)                                                                             |
| Plan-execution | Plan file path in prompt (`docs/plans/*.md`), OR `--plan-exec` flag, OR plan reference paired with `.jira.json` | Phase 7 (discover existing issues via `discoverPlanTasks`; calling agent dispatches per-task verbs at task boundaries) |

## Jira model

Jira issues have:

- **Summary** (title, ≤255 chars; aim for ≤80 for board readability).
- **Description** (Atlassian Document Format / ADF; transport sends markdown with `markdown: true`; do NOT attempt raw ADF construction).
- **Issue type** — resolved from `.jira.json` `issueTypes{}`. Keys are canonical (`task`, `story`, `bug`, `epic`, `subtask`); values are locale-specific names (e.g. `"Tarefa"`, `"Subtarefa"` in pt-BR workspaces). **NEVER hard-code type names** — always read from config.
- **Subtasks** — one level deep. A Subtask **requires** a `parent` issue key at create time. Subtasks have **reduced fields**: `duedate` and `priority` are NOT applicable; `task.due-date.set` returns `NOT_APPLICABLE` on Subtasks.
- **Transitions** — resolved at runtime via `getTransitionsForJiraIssue`, matched by `to.statusCategory.key` (`"new"` / `"indeterminate"` / `"done"`). **NEVER match by transition name** — names are locale-dependent and change with workflow customization.
- **Labels** — plain strings; robust and searchable. Used to preserve human-readable estimates as `est:<slug>`.
- **Assignee** — single account; `editJiraIssue { assignee: { accountId } }`. Jira does not support multi-assignee at the API level.

**MCP transport:** Atlassian Remote MCP at Streamable-HTTP endpoint `https://mcp.atlassian.com/v1/mcp`. The SSE endpoint (`/events`) was retired 2026-06-30. All `mcp__atlassian__*` tools are unchanged; only the transport layer differs.

**F2 sprint:** `task.sprint.set` is NOT supported. The Atlassian MCP exposes no agile/sprint API. The core factory returns `UNSUPPORTED_VERB` for this verb. Capacity and sprint planning are roadmapped for v1.12.0.

## Phase 4 — Jira formatting

Apply the generic card from core's [`../pm-tasks-core/references/generic-card.md`](../pm-tasks-core/references/generic-card.md). Then map to Jira:

- Title → issue `summary`.
- Sections of the generic card → markdown headings in `description` (ADF handles them when sent with `markdown: true`).
- "Implementation Checklist" + "Verification Checklist" → **Subtask summaries** (one Subtask per item; Jira supports one level only; Subtask `parent` = parent issue key).
- Labels → `labels[]` array. Resolve from `.jira.json` `labels[]` or pass through raw.
- Due date → `duedate` (YYYY-MM-DD; sliced from ISO 8601). **Not applicable for Subtasks** — omit silently.
- Assignee → `lookupJiraAccountId` by display name or email; `editJiraIssue { assignee: { accountId } }`.
- Issue type → v1 maps all created cards to the configured `issueTypes.task` (Subtasks use `issueTypes.subtask`). Per-type override is not yet supported — `TaskCreateRequest` carries no type field.

## Phase 5 — MCP publish

**Prerequisites:** Atlassian Remote MCP connected in your agent. Configure with Streamable-HTTP transport `https://mcp.atlassian.com/v1/mcp`. The MCP handles OAuth; the adapter never sees tokens.

- **Claude Code**: `claude mcp add atlassian -s project -- npx -y @anthropic-ai/mcp-server-atlassian` (or follow Atlassian's Remote MCP setup guide for your site).
- **Cursor / Windsurf / Cline / Roo Code**: add an MCP entry in that agent's settings JSON pointing at the same endpoint and credentials.
- **Codex**: TOML entry under `[mcp_servers.atlassian]` in `~/.codex/config.toml`.

Strict order: 5.1 read `.jira.json` (full file) → 5.2 preview & approval → 5.3 publish via MCP → 5.4 error handling.

MCP publish sequence:

1. **Parent issue** — `createJiraIssue` with `cloudId`, `projectKey`, `issueTypeName` (from `issueTypes.task`), `summary`, `description` (markdown; clientToken embedded as `[ct:<token>]` in description body).
2. **Subtasks** — `createJiraIssue` per subtask with `issueTypeName` (from `issueTypes.subtask`), `summary`, `parent: <parentKey>`. No `duedate` or `priority`.
3. **Confirm** — display parent issue key + URL (`https://<site>/browse/<KEY>`) and each subtask key.

### Attribution (opt-in)

Before calling the MCP create tool, read `config.attribution`. If `enabled === true`, prefix the comment with the `commentPrefix` returned by `getAttribution()` and append the `descriptionFooter` to the end of `description`. In autonomous mode (`[autonomous]` sentinel), the `commentPrefix` automatically becomes the `autonomousCommentPrefix`. See [references/attribution.md in pm-tasks-core](../pm-tasks-core/references/attribution.md) (added in v1.2.0).

## Phase 5b — Autonomous

Skip 5.2 preview & approval. Apply autonomous-mode contract from [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Audit log entries per [`../pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

Jira-specific autonomous scope: `autonomous.scope.projectKey` must match the target project in `.jira.json`. Issue transitions must be to categories already accessible in the board's workflow.

### Continuous operation in multi-task loops

Mandatory when the controller executes a plan with multiple tasks autonomously. Mirror each task transition on the corresponding Jira issue in real time — NEVER batch state updates at end-of-loop. See [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md) § **Continuous operation across multi-task loops**.

Jira-specific verb mapping:

| Transition              | Canonical verb + MCP call(s)                                                                                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task start              | `task.move(key, "indeterminate")` → `getTransitionsForJiraIssue` → match `statusCategory.key == "indeterminate"` → `transitionJiraIssue`                                                                                                                       |
| Step complete (subtask) | `checklist.check` → `transitionJiraIssue(subtaskKey, "done")`                                                                                                                                                                                                  |
| Task complete (full)    | `task.move(key, "done")` → `transitionJiraIssue` to `done` category, then `task.comment.add` → `addCommentToJiraIssue(body: "Task complete. Commit: <SHA>.", markdown: true)`, then `task.close` → `transitionJiraIssue` to `done` category again (idempotent) |
| Task failed             | `task.comment.add` → `addCommentToJiraIssue` with failure mode + `task.assignee.add` to reassign for human escalation. Do NOT call `task.move(_, "done")` or `task.close`.                                                                                     |

**Jira caveat (per [`anti-patterns/jira.md`](./anti-patterns/jira.md)):** `getJiraIssue` returns field values but not the full changelog. Verify lifecycle in the Jira UI activity feed when auditing — the UI is the human's audit log.

## Phase 6 — CRUD operations (existing issues)

For verbs other than `task.create`, jump directly to the operation. Verb → MCP tool mapping:

| Core verb                | Jira MCP tool (`mcp__atlassian__*`)                  | Notes                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`            | `createJiraIssue`                                    | parent + subtasks per Phase 5; type from `issueTypes`; clientToken embedded in description as `[ct:<token>]`                                                    |
| `task.move`              | `getTransitionsForJiraIssue` → `transitionJiraIssue` | `req.targetListOrSectionId` = status category key (`"new"` / `"indeterminate"` / `"done"`); locale-safe via category matching; `previousListOrSectionId` = null |
| `checklist.check`        | `createJiraIssue(Subtask)` + `transitionJiraIssue`   | complete: create Subtask with `parent=taskId`, then transition to `"done"`; incomplete: transition existing subtask key to `"new"`                              |
| `task.close`             | `getTransitionsForJiraIssue` → `transitionJiraIssue` | transitions to `"done"` category; same engine as `task.move`; `movedToListOrSectionId` = resulting status id                                                    |
| `task.due-date.set`      | `editJiraIssue`                                      | `fields: { duedate: "YYYY-MM-DD" }` (sliced from `req.dueAt` ISO 8601); Subtask → `NOT_APPLICABLE` error (error-driven detection, no pre-read)                  |
| `task.assignee.add`      | `lookupJiraAccountId` (if needed) + `editJiraIssue`  | `req.userId`: if matches accountId pattern → fast-path skip lookup; else `lookupJiraAccountId { query: userId }` → `editJiraIssue { assignee: { accountId } }`  |
| `task.comment.add`       | `addCommentToJiraIssue`                              | `body: req.text, markdown: true` (load-bearing — omitting `markdown: true` causes ADF rendering failure); apply attribution prefix if enabled                   |
| `task.parent.set` (F3)   | `editJiraIssue`                                      | `fields: { parent: { key: req.parentId } }`; `req.parentId` must be a valid issue key (`KAN-12`); `previousParentId` always `null`                              |
| `task.estimate.set` (F7) | `getJiraIssue` (read labels) + `editJiraIssue`       | normalize via core `normalizeEstimate`; write native field + idempotent `est:<slug>` label in one call; see § Estimation below                                  |

`<task-ref>` resolution: Jira permalink (`https://<site>/browse/KEY-N`) → bare issue key (`KAN-42`) → alias from `.jira.json` `taskAliases[]`.

### Estimation (task.estimate.set detail)

Estimation records **effort** — never a calendar deadline. The request carries `{ taskId, input: EstimateInput, config: EstimationConfig }`.

Flow:

1. `normalizeEstimate(req.input, req.config)` (core helper, never throws) → `NormalizedEstimate`.
2. Guard: if `jiraTarget === "story_points"` and `req.config.fieldId` is absent or empty → return `INVALID_REQUEST` with hint to enable Story Points in Board settings and re-run `pm-tasks-jira init`. No MCP calls made.
3. `getJiraIssue({ cloudId, issueKey, fields: ["labels"] })` — read current labels.
4. Strip all prior `est:*` labels; append `est:<slug>` where `slug = slugify(normalized.humanReadable)`.
5. Build native field patch:
   - `jiraTarget === "story_points"` → `{ [req.config.fieldId]: n.points }`
   - `jiraTarget === "time"` → `{ timetracking: { originalEstimate: n.timeString } }`
   - `jiraTarget === "none"` → no native field (labels-only write)
6. `editJiraIssue({ fields: { ...nativeFieldPatch, labels: newLabels } })` — ONE call.
7. Return `{ ok: true, data: { normalized, fieldWritten } }`.

The `est:<slug>` label is the durable human-readable record — **not** a description footer. Jira descriptions are ADF; modifying them is fragile and not attempted. See [`references/estimation.md`](references/estimation.md) for full strategy taxonomy and `jiraTarget` mapping.

## Phase 7 — Plan-execution mode

When the calling agent passes a plan reference (a path to a markdown plan file, a plan slug, or an explicit list of expected issue summaries), this skill loads `.jira.json` via `requireConfig` and uses `discoverPlanTasks` (from `@llodev/pm-tasks-core`) to triage which tasks in the plan already exist as issues in scope. The skill returns `{ found, missing, ambiguous }` — the **calling agent** decides how to act on each bucket (create missing issues via Phase 4 + 5; disambiguate by picking the right ambiguous issue; proceed with existing).

The skill does **not** assume any particular implementation strategy. It does not drive the calling agent's task loop, does not depend on any specific orchestration framework, and does not require any markup beyond what is already documented for `task.create` and the autonomous-mode contract. When the calling agent finishes a task and asks the skill to record progress, it invokes the standard verbs (`task.move`, `checklist.check`, `task.comment.add`, `task.close`) directly — the same path used by Phase 5b autonomous mode.

Full contract: [`pm-tasks/pm-tasks-core/references/plan-execution.md`](../pm-tasks-core/references/plan-execution.md) (added in v1.9.0). Jira note: use `searchJiraIssuesUsingJql` for scope queries (replaces Asana `search_tasks`).

## Result envelope

Every verb returns the core contract shape (see [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Result envelope):

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "jira",
  "ref": { "id": "KAN-42", "url": "https://<site>/browse/KAN-42", "alias": null },
  "details": {
    /* Jira-specific (see table below) */
  }
}
```

Jira-specific `details` per verb:

| Verb                     | `details` fields                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `task.create`            | `{ id: "KAN-42", url?: string }` (url present when MCP returns it)                      |
| `task.move`              | `{ previousListOrSectionId: null, newListOrSectionId: "<statusId>" }`                   |
| `checklist.check`        | `{ previousState, newState }` (`"complete"` / `"incomplete"`)                           |
| `task.close`             | `{ closed: true, movedToListOrSectionId: "<statusId>" }`                                |
| `task.due-date.set`      | `{ previousDueAt: null, newDueAt: "YYYY-MM-DD" }` — or `NOT_APPLICABLE` on Subtask      |
| `task.assignee.add`      | `{ added: true, currentAssigneeIds: ["<accountId>"] }`                                  |
| `task.comment.add`       | `{ commentId: "<id>", postedAt: "<ISO8601>" }`                                          |
| `task.parent.set` (F3)   | `{ previousParentId: null, newParentId: "<issueKey>" }`                                 |
| `task.estimate.set` (F7) | `{ normalized: NormalizedEstimate, fieldWritten: <fieldId> or "timetracking" or null }` |

On failure: `{ ok: false, code: "<CODE>", details: { message, ... } }`. Stable error codes: `UNSUPPORTED_VERB`, `INVALID_REQUEST`, `NOT_APPLICABLE`, `NOT_FOUND`, `AUTH_ERROR`, `RATE_LIMITED`, `MCP_ERROR`. `UNSUPPORTED_VERB` is returned by the core factory for verbs not in the adapter's manifest (e.g. `task.sprint.set`).

## Anti-patterns

See [`anti-patterns/jira.md`](anti-patterns/jira.md) — transition-by-name pitfall, Subtask field restrictions, locale type-name anti-pattern, SSE endpoint retirement, description-footer anti-pattern for estimates.

## Standalone fallback

If `@llodev/pm-tasks-core` is not installed: ask the user for minimum input (title + subtask names) and produce a paste-ready Jira issue body from this content alone. Quality is degraded — no scope/audience/fidelity inference. Print: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Lookup order: `<git-root>/.jira.json` → `~/.config/llodev/pm-tasks/jira.json` → abort with init instructions. Schema: [`schemas/config.json`](schemas/config.json). Secrets NEVER in JSON — Atlassian MCP holds OAuth; `init` uses `mcp__atlassian__atlassianUserInfo` to discover the site and project via MCP.

## Init

```
npx @llodev/pm-tasks-jira init
```

See [`../pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) for the shared flow. Jira init uses:

- `atlassianUserInfo` — verify MCP connection and get user email.
- `getAccessibleAtlassianResources` — list sites; select `cloudId`.
- `getVisibleJiraProjects` — select project by key.
- `getJiraIssueTypeMetaWithFields` — discover issue types (builds `issueTypes{}`) and detect the Story Points field for estimation (`fieldId`, matched by name; default `customfield_10016`). Absent on basic boards → time tracking is used instead.

Writes all resolved values (including `fieldId` if found) to `.jira.json`.

Pass `--doctor` to run workspace health checks:

```sh
npx @llodev/pm-tasks-jira init --doctor
```

Runs core checks (C-FS-1..3, C-CFG-1..4) plus Jira-specific probes (C-JIR-1, C-JIR-2, gated on MCP connectivity). Full check matrix: [`pm-tasks/pm-tasks-core/references/doctor.md`](../pm-tasks-core/references/doctor.md).
