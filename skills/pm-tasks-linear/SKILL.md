---
name: pm-tasks-linear
description: >-
  Linear adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Linear, asks to "create Linear issue", "publish to Linear", "log to Linear",
  "set cycle/sprint", "check sub-issue", or uses --publish-linear; OR for CRUD
  on existing issues (check sub-issue, close, due-date, assign, comment,
  estimate, parent, sprint); OR when invoked autonomously with [autonomous] /
  --auto sentinel. Linear model: issue upsert via save_issue; sub-issues as
  hierarchy AND checklist mechanism (parentId); states by type (unstarted/
  started/completed/canceled); cycles = sprints (team-gated); single assignee
  (set-not-add); labels are replace-set (est: idempotency read-modify-write).
  MCP: Linear MCP (Streamable-HTTP, OAuth, mcp__linear__ prefix). Modes:
  paste-ready, MCP publish, autonomous (write-through with allowlist),
  plan-execution. Implements 10 verbs (task.create, task.move, checklist.check,
  task.close, task.due-date.set, task.assignee.add, task.comment.add,
  task.parent.set, task.estimate.set, task.sprint.set). FIRST family adapter to
  implement task.sprint.set (via cycles). Requires @llodev/pm-tasks-core.
license: MIT
metadata:
  version: 1.0.0
  tags:
    - agent-skill
    - linear
    - plan-to-tasks
    - pm-tools
    - linear-mcp
  family: pm-tasks
  role: adapter
  tool: linear
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# pm-tasks-linear

Linear adapter for the `@llodev/pm-tasks-*` family. Publishes generic cards as Linear issues and dispatches CRUD verbs through the Linear MCP (`mcp__linear__*` tool prefix).

## Routing

| Trigger        | Signal                                              | Path                                     |
| -------------- | --------------------------------------------------- | ---------------------------------------- |
| Paste-only     | No MCP, no `.linear.json`                           | Phase 4 only — Markdown issue body       |
| MCP publish    | Linear MCP connected + `.linear.json` present       | Phase 4 → 5 (create parent + sub-issues) |
| Autonomous     | `[autonomous]` sentinel or `--auto` flag            | Phase 5b (write-through, no preview)     |
| CRUD ops       | Verb on existing issue (`LEO-12`, UUID, or URL)     | Phase 6 — jump directly                  |
| Plan-execution | Plan file path or `--plan-exec` with `.linear.json` | Phase 7 (discover + dispatch)            |

## Linear model

Linear issues have:

- **Title** (required; aim for ≤80 chars for board readability).
- **Description** (Markdown; MCP instructions require **literal newlines** — not `\n` escape sequences).
- **State** — resolved by **type string** (`backlog`, `unstarted`, `started`, `completed`, `canceled`, `duplicate`). States are team-scoped and stored in `.linear.json`. **NEVER match by state name** — names are locale-dependent and change with team customization.
- **Sub-issues** — `save_issue` with `parentId` = parent issue id. Arbitrary depth (unlike Jira's one-level Subtask). Sub-issues are both the **hierarchy mechanism** and the **checklist mechanism** (see Phase 4).
- **Cycles** — Linear's sprint primitive. Team-gated (`config.cycles.enabled`). Resolved by name/number/id via `list_cycles`. `task.sprint.set` returns `NOT_APPLICABLE` when cycles are disabled.
- **Single assignee** — `save_issue { assignee }`. Set-not-add — Linear supports only one assignee. Accepts id, name, email, or `"me"`.
- **Labels** — **replace-set**: any label write overwrites the full label array. The transport always reads current labels, strips `est:*`, merges, and writes the complete set (read-modify-write). Never write labels without reading first.
- **Identifiers** — `TEAMKEY-N` (e.g. `LEO-1`) or UUID are interchangeable on all MCP tools.

**MCP transport:** Linear MCP at Streamable-HTTP (`https://mcp.linear.app/mcp`). The MCP handles OAuth — the adapter never sees tokens. All tools use the prefix `mcp__linear__`.

**`save_issue` upsert:** 8 of 10 verbs collapse onto `save_issue`. When `id` is present → update. When `id` is absent → create. Omitting `id` silently creates a new issue — always pass `id` on updates.

## Phase 4 — Linear formatting

Apply the generic card from core's [`../pm-tasks-core/references/generic-card.md`](../pm-tasks-core/references/generic-card.md). Then map to Linear:

- Title → issue `title`.
- Sections of the generic card → Markdown headings in `description` (literal newlines, per MCP instructions).
- Labels → resolve by name from `config.labels[]`; pass through raw strings otherwise.
- Due date → `dueDate` (YYYY-MM-DD; sliced from ISO 8601). Native Linear field.
- Assignee → `save_issue { assignee }` by id/name/email/`"me"`. Single-assignee set.
- Estimate → `save_issue { estimate }` (numeric points) when `estimation.enabled` and `linearTarget === "points"`.
- **Checklists → sub-issues (M3 resolution):** The core `task.create` contract carries no `items[]`. During Phase 5 MCP publish, the SKILL orchestrates child creation: for each checklist item in the generic card, call `save_issue` with `parentId` = the created parent issue's id. This is the doc-layer resolution — Linear has no native checklist, so checklist items become **sub-issues**. `checklist.check` later moves the sub-issue to a completed-type state via `save_issue { id: subIssueId, state: <completed-type-id> }`.

## Phase 5 — MCP publish

**Prerequisites:** Linear MCP connected in your agent.

- **Claude Code**: `claude mcp add linear -s project -- npx -y @linear/mcp-server` (or follow [Linear's MCP setup guide](https://linear.app/docs/mcp)), then approve the OAuth flow.
- **Cursor / Windsurf / Cline / Roo Code**: add an MCP entry pointing at `https://mcp.linear.app/mcp`.
- **Codex**: add `[mcp_servers.linear]` in `~/.codex/config.toml`.

In Claude Code, verify with `claude mcp list` — `linear` should appear as authenticated.

Strict order: 5.1 read `.linear.json` → 5.2 resolve labels/members/states → 5.3 preview & approval → 5.4 publish → 5.5 error handling.

MCP publish sequence:

1. **Config discovery** — `requireConfig` loads `.linear.json` (see § Config for lookup order). Extract `team.id`, `states[]`, `labels[]`, `members[]`.
2. **Resolve** — match label names to ids from `config.labels[]`; resolve assignee from `config.members[]` or pass-through; resolve target state from `config.states[]` by type.
3. **Preview & approval** — show title, description excerpt, labels, assignee, estimate.
4. **Publish** — `save_issue` (no id) → parent issue. Then one `save_issue` per checklist item with `parentId` = created id.
5. **Confirm** — display issue identifier (`LEO-N`) + URL and each sub-issue identifier.
6. **Error handling** — on MCP error, surface the raw error; no partial-commit guarantees (sub-issue creates are individual calls).

### Attribution (opt-in)

Before calling `save_issue`, read `config.attribution`. If `enabled === true`, append the `descriptionFooter` returned by `getAttribution()` to the end of `description`, and prefix comments with `commentPrefix`. In autonomous mode (`[autonomous]` sentinel), the `commentPrefix` automatically becomes the `autonomousCommentPrefix`. See [references/attribution.md in pm-tasks-core](../pm-tasks-core/references/attribution.md).

## Phase 5b — Autonomous

Skip 5.3 preview & approval. Apply the autonomous-mode contract from [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Audit log entries per [`../pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

Linear-specific autonomous scope: `autonomous.scope.teams` must list the target team id from `.linear.json`. Issue state transitions must be to types reachable from the current workflow (`config.states[]` is the allowlist). See [`references/autonomous.md`](references/autonomous.md).

### Continuous operation in multi-task loops

Mandatory when the controller executes a plan with multiple tasks autonomously. Mirror each task transition on the corresponding Linear issue in real time — NEVER batch state updates at end-of-loop. See [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md) § **Continuous operation across multi-task loops**.

Linear-specific verb mapping:

| Transition        | Canonical verb + MCP call(s)                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task started      | `task.move` → `save_issue { id, state }` (type `started`)                                                                                                                           |
| Task completed    | `task.close` → `save_issue { id, state }` (type `completed`)                                                                                                                        |
| Sub-issue checked | `checklist.check` → `save_issue { id: subIssueId, state }` (type `completed`) (idempotent)                                                                                          |
| Task failed       | `task.comment.add` → `save_comment { issueId, body }` with failure mode + `task.assignee.add` to reassign for human escalation. Do NOT call `task.move(_, "done")` or `task.close`. |

**Linear note:** `get_issue` returns current state but not the full changelog. Verify lifecycle in the Linear UI activity feed when auditing.

## Phase 6 — CRUD operations (existing issues)

For verbs other than `task.create`, jump directly to the operation.

> **MANDATORY READ:** [`references/operations.md`](references/operations.md) — full verb → MCP tool mapping, `<task-ref>` resolution, error codes, and idempotency rules.

Verb → MCP tool mapping summary:

| Core verb           | Linear MCP tool                                         | Notes                                                                             |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `task.create`       | `save_issue` (no id)                                    | `title`+`team` required; sub-issues via `parentId` per Phase 5                    |
| `task.move`         | `save_issue` (id + state)                               | Resolve state by type: `open`→`unstarted`, `wip`→`started`, `done`→`completed`    |
| `checklist.check`   | `save_issue` (sub-issue id + state)                     | `req.itemId` = sub-issue id; check = type `completed`; uncheck = type `unstarted` |
| `task.close`        | `save_issue` (id + state)                               | Type `completed`; cancel = type `canceled`                                        |
| `task.due-date.set` | `save_issue` (id + dueDate)                             | `YYYY-MM-DD` sliced from ISO 8601                                                 |
| `task.assignee.add` | `save_issue` (id + assignee)                            | Single-assignee set-not-add; accepts id/name/email/`"me"`                         |
| `task.comment.add`  | `save_comment` (issueId + body)                         | Markdown, literal newlines; apply attribution prefix if enabled                   |
| `task.parent.set`   | `save_issue` (id + parentId)                            | Arbitrary depth; `null` parentId detaches                                         |
| `task.estimate.set` | `get_issue` (labels) → `save_issue` (estimate + labels) | Read-modify-write label merge; see § Estimation below                             |
| `task.sprint.set`   | `list_cycles` → `save_issue` (id + cycle)               | Team-gated; see § Sprint below                                                    |

`<task-ref>` resolution: Linear permalink (`https://linear.app/team/issue/LEO-12`) → bare identifier (`LEO-12`) → UUID → alias from `.linear.json` `taskAliases[]`.

### Estimation (task.estimate.set detail)

> **MANDATORY READ:** [`references/estimation.md`](references/estimation.md)

Estimation records **effort** — never a calendar deadline. The request carries `{ taskId, input: EstimateInput, config: EstimationConfig }`.

Flow:

1. `normalizeEstimate(req.input, req.config)` (core helper, never throws) → `NormalizedEstimate`.
2. Guard: if `config.estimation.linearTarget === "points"` and `n.points` is `null` → return `INVALID_REQUEST` with hint to pick a point-based strategy or set `linearTarget: "none"` and re-run `pm-tasks-linear init`.
3. Guard: if `config.estimation.enabled === false` → return `NOT_APPLICABLE`.
4. `get_issue({ id: taskId })` — read current labels (Linear `labels` is a replace-set).
5. Strip all prior `est:*` labels; append `est:<slug>` where `slug = slugify(normalized.humanReadable)`.
6. If `est:<slug>` label does not exist in `config.labels[]` → create via `create_issue_label { name, teamId }` (create-on-demand, M1).
7. Build native field patch: `linearTarget === "points"` → `estimate: n.points`; `linearTarget === "none"` → no native field.
8. `save_issue({ id: taskId, ...nativeFieldPatch, labels: mergedIds })` — ONE call.
9. Return `{ ok: true, data: { normalized, fieldWritten } }`.

The `est:<slug>` label is the durable human-readable record. Labels are plain strings: robust, idempotent, searchable.

### Sprint (task.sprint.set detail)

> **Note:** Linear is the FIRST pm-tasks family adapter to implement `task.sprint.set`.

Cycles are Linear's sprint primitive. They are **team-gated** — not all teams use cycles.

Flow:

1. Guard: `config.cycles.enabled === false` → return `NOT_APPLICABLE` with `{ reason: "cycles_disabled" }`.
2. `list_cycles({ teamId })` — fetch all cycles for the team.
3. Match `req.sprintRef` against `cycle.id` (exact), `cycle.name` (exact), or `String(cycle.number)` (exact). If no match, pass `req.sprintRef` directly as `cycle` (may be a raw UUID).
4. `save_issue({ id: req.taskId, cycle: cycleId })`.
5. Return `{ ok: true, data: { previousSprintRef: null, newSprintRef: cycleId } }`.

If `config.cycles.enabled` is true but no cycles exist yet on the team, step 2 returns an empty list and step 4 will likely fail at the MCP layer. Surface the raw error.

## Phase 7 — Plan-execution mode

When the calling agent passes a plan reference (a path to a markdown plan file, a plan slug, or an explicit list of expected issue titles), this skill loads `.linear.json` via `requireConfig` and uses `discoverPlanTasks` (from `@llodev/pm-tasks-core`) to triage which tasks in the plan already exist as Linear issues in scope. The skill returns `{ found, missing, ambiguous }` — the **calling agent** decides how to act on each bucket (create missing issues via Phase 4 + 5; disambiguate by picking the right ambiguous issue; proceed with existing).

The skill does **not** assume any particular implementation strategy. It does not drive the calling agent's task loop, does not depend on any specific orchestration framework. When the calling agent finishes a task and asks the skill to record progress, it invokes the standard verbs (`task.move`, `checklist.check`, `task.comment.add`, `task.close`) directly — the same path used by Phase 5b autonomous mode.

Full contract: [`skills/pm-tasks-core/references/plan-execution.md`](../pm-tasks-core/references/plan-execution.md). Linear note: use `list_issues` with team + title filters for scope queries.

## Result envelope

Every verb returns the core contract shape (see [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) § Result envelope):

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "linear",
  "ref": { "id": "LEO-42", "url": "https://linear.app/team/issue/LEO-42", "alias": null },
  "details": {}
}
```

Linear-specific `details` per verb:

| Verb                | `details` fields                                                       |
| ------------------- | ---------------------------------------------------------------------- |
| `task.create`       | `{ id: "LEO-42", url?: string }`                                       |
| `task.move`         | `{ previousListOrSectionId: null, newListOrSectionId: "<stateId>" }`   |
| `checklist.check`   | `{ previousState, newState }` (`"complete"` / `"incomplete"`)          |
| `task.close`        | `{ closed: true, movedToListOrSectionId: "<stateId>" }`                |
| `task.due-date.set` | `{ previousDueAt: null, newDueAt: "YYYY-MM-DD" }`                      |
| `task.assignee.add` | `{ added: true, currentAssigneeIds: ["<userId>"] }`                    |
| `task.comment.add`  | `{ commentId: "<id>", postedAt: "<ISO8601>" }`                         |
| `task.parent.set`   | `{ previousParentId: null, newParentId: "<issueId or null>" }`         |
| `task.estimate.set` | `{ normalized: NormalizedEstimate, fieldWritten: "estimate" or null }` |
| `task.sprint.set`   | `{ previousSprintRef: null, newSprintRef: "<cycleId>" }`               |

On failure: `{ ok: false, code: "<CODE>", details: { message, ... } }`. Stable error codes: `UNSUPPORTED_VERB`, `INVALID_REQUEST`, `NOT_APPLICABLE`, `NOT_FOUND`, `AUTH_ERROR`, `RATE_LIMITED`, `MCP_ERROR`. `NOT_APPLICABLE` is returned for `task.sprint.set` when cycles are disabled, and for `task.estimate.set` when estimation is disabled.

## Anti-patterns

> **MANDATORY READ:** [`anti-patterns/linear.md`](anti-patterns/linear.md)

Key rules (do not violate):

- NEVER write labels without reading first (replace-set — overwrites everything).
- NEVER fake checklists with `- [ ]` in description — use sub-issues.
- NEVER hard-code state names — resolve by type.
- NEVER omit `id` when updating — silently creates a duplicate.
- NEVER assume cycles exist on a team.

## Standalone fallback

If `@llodev/pm-tasks-core` is not installed: ask the user for minimum input (title + sub-issue names) and produce a paste-ready Linear issue body from this content alone. Quality is degraded — no scope/audience/fidelity inference. Print: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Lookup order: `<git-root>/.linear.json` → `~/.config/llodev/pm-tasks/linear.json` → abort with init instructions. Schema: [`schemas/config.json`](schemas/config.json). Secrets NEVER in JSON — Linear MCP handles OAuth; `init` uses `LINEAR_API_KEY` (env only) for standalone GraphQL discovery.

Key fields written by `init`:

- `team` — `{ id, key, name }`.
- `states` — `[{ id, name, type }]` (move/close targets, scoped to team; `type` is the stable reference).
- `labels` — `[{ id, name }]` (workspace-level label registry).
- `members` — `[{ id, name, email, alias? }]`.
- `estimation` — `{ strategy, linearTarget: "points"|"none", enabled, scale? }`.
- `cycles` — `{ enabled }` (gate for `task.sprint.set`).
- `locale` — chosen at init; used for narration.
- `attribution` — opt-in block; see core attribution reference.
- `autonomous` — `{ enabled, allow[], scope: { teams[], projects[] }, rateLimit, auditLog }`.

## Init

```
npx @llodev/pm-tasks-linear init
```

See [`../pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) for the shared flow. Two discovery paths:

**MCP-driven (default, recommended):** Requires the Linear MCP connected in your agent session.

- `list_teams` — select team (`key` + `name`).
- `list_issue_statuses { team }` — discover states (move/close targets) with their stable `type`.
- `list_issue_labels` — workspace-level label registry.
- `list_users` — member roster (id/name/email).
- `get_team { id }` — team settings (`cyclesEnabled`, `issueEstimationType`).
- `list_cycles { teamId }` — confirm cycles are available.

**GraphQL standalone:** For environments where MCP is not available. Set `LINEAR_API_KEY` in env (personal API key — no Bearer prefix needed). The init script queries the Linear GraphQL API at `https://api.linear.app/graphql` directly for the same discovery.

```bash
export LINEAR_API_KEY=lin_api_...
npx @llodev/pm-tasks-linear init
```

> [!IMPORTANT]
> The API key is **only** used by `init` to discover team metadata. The MCP uses OAuth — never put the key in `.linear.json`.

Pass `--doctor` to run workspace health checks:

```sh
npx @llodev/pm-tasks-linear init --doctor
```

Doctor checks (C-LIN-*): config present and valid, team resolvable, states cover at least one `completed`-type, estimation/cycles flags coherent, autonomous scope sane.

The init prompt prints the absolute path it will write to, so you always see exactly where the file goes. Walk through the prompts and pick local (`./.linear.json`, recommended, committable) or global (`~/.config/llodev/pm-tasks/linear.json`).
