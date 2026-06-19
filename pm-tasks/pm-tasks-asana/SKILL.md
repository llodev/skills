---
name: pm-tasks-asana
description: >-
  Asana adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Asana, asks to "create Asana task", "publish to Asana", "post to Asana",
  "publish", "add comment in Asana", or uses --publish-asana; OR for CRUD on
  existing tasks (check subtask, close task, change due-date, assign person,
  comment); OR when invoked autonomously by another agent with [autonomous] /
  --auto sentinel. Asana hierarchy: workspace > project > section > parent task
  > subtasks (one level), with custom fields and multi-assignee support. Modes:
  paste-ready (no MCP needed), MCP publish (via claude.ai Asana MCP), autonomous
  (write-through with allowlist). Implements 7 CRUD verbs (task.create,
  task.move, checklist.check, task.close, task.due-date.set, task.assignee.add,
  task.comment.add) from pm-tasks/pm-tasks-core/references/contract.md. Requires
  @llodev/pm-tasks-core installed.
license: MIT
metadata:
  version: 1.4.0
  tags:
    - agent-skill
    - asana
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: asana
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# pm-tasks-asana

Adapter for Asana within the `@llodev/pm-tasks-*` family. Use the core skill's extraction phases, then apply Asana formatting and optionally publish/operate via the `claude.ai Asana` MCP server.

## Routing

| Mode        | Trigger                                                                                    | Path                                                                     |
| ----------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Paste-only  | "format as Asana task" without MCP intent                                                  | Phase 3 (core) → Phase 4 (this skill, format only) → output paste blocks |
| MCP publish | "publish to Asana", "create on Asana", "--publish-asana"                                   | Phase 3 → Phase 4 → Phase 5 (publish via MCP)                            |
| Autonomous  | `[autonomous]` or `--auto` in prompt OR `LLODEV_PM_TASKS_AUTONOMOUS=1`                     | Phase 3 → Phase 4 → Phase 5b (write-through, no preview)                 |
| CRUD ops    | "check subtask N on task X", "close task Y", "assign Alice to task Z", "comment on task X" | Phase 6 (operations, direct verb dispatch)                               |

## Asana model

Asana tasks have:

- **Name** (title, ≤80 chars for board view).
- **Description** (rich text; prefer `**Section**` bold labels — `##` headings render inconsistently).
- **Subtasks** — one level deep. Custom fields and assignee do NOT auto-propagate from parent; the adapter sets them explicitly per `subtaskDefaults.inheritParentFields` in `.asana.json`.
- **Sections** — group tasks within a project.
- **Custom fields** — per-project; API always uses option GIDs, never display names.
- **Multi-assignee** — Asana allows multiple followers; primary assignee is a single field. Use `task.assignee.add` to add followers.

## Phase 4 — Asana formatting

Apply the generic card from core's [`../pm-tasks-core/references/generic-card.md`](../pm-tasks-core/references/generic-card.md). Then map to Asana:

- Title → task `name`.
- Sections of the generic card → bold `**Section**` labels inside `description` (not `##`).
- "Implementation Checklist" + "Verification Checklist" → subtasks (flatten any nested bullets; Asana supports one level only).
- Labels → custom field options (resolved via `.asana.json` `customFields[]`).
- Due date → `due_on` (YYYY-MM-DD).
- Assignee → `assignee` GID resolved from `.asana.json` `members[]` or `me` at publish time.

## Phase 5 — MCP publish

**Prerequisites:** Asana MCP server (`claude.ai Asana`) connected in your agent. The MCP handles OAuth; the adapter never sees tokens. Configuration steps differ per agent — register the same Asana MCP endpoint your agent supports:

- **Claude Code**: `claude mcp add asana -s project -- npx -y claude-ai-asana-mcp` (or follow Anthropic's setup for the hosted `claude.ai Asana` connector).
- **Cursor / Windsurf / Cline / Roo Code**: add an entry to that agent's MCP settings JSON pointing at the same `claude-ai-asana-mcp` command (envelope identical to the Trello example in `pm-tasks-trello/references/mcp-config.md`).
- **Codex**: TOML entry under `[mcp_servers.asana]` in `~/.codex/config.toml`.
- **Other MCP-capable agents**: consult that agent's MCP docs; the server command and OAuth flow are constant.

Strict order: 5.1 read `.asana.json` (full file) → 5.2.5 resolve assignee + custom fields + per-subtask field map → 5.2 preview & approval → 5.3 publish via MCP → 5.4 error handling.

MCP publish sequence:

1. **Parent task** — `create_tasks` with `name`, `notes` (description), `projects: [projectGid]`, `memberships: [{ project, section }]`, `assignee` (resolved GID), `due_on`, `custom_fields` (JSON string of `{fieldGid: optionGid}`).
2. **Subtasks** — `create_tasks` per subtask with `parent: parentGid`, `name`, `assignee` (inherited or per-subtask), `custom_fields` matching `subtaskDefaults.inheritParentFields`.
3. **Tags** (optional) — `addTag` per tag GID.
4. **Confirm** — list parent + subtasks with permalinks.

### Attribution (opt-in)

Before calling the MCP create tool, read `config.attribution`. If `enabled === true`, prefix the comment with the `commentPrefix` returned by `getAttribution()` and append the `descriptionFooter` to the end of `description`. In autonomous mode (`[autonomous]` sentinel), the `commentPrefix` automatically becomes the `autonomousCommentPrefix`. See [references/attribution.md in pm-tasks-core](../pm-tasks-core/references/attribution.md) (added in v1.2.0).

## Phase 5b — Autonomous

Skip 5.2 preview & approval. Apply autonomous-mode contract from [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Audit log entries per [`../pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

Asana-specific autonomous scope: `autonomous.scope.projects[]` + `autonomous.scope.sections[]` must include the target GIDs. Any custom-field write must be in `autonomous.allow` (`task.create` covers create-time field set; ongoing field changes are out of scope for v1.x).

### Continuous operation in multi-task loops

Mandatory when the controller is executing a plan with multiple tasks autonomously. Mirror each task transition on the corresponding Asana task in real time — NEVER batch state updates at end-of-loop. See [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md) § **Continuous operation across multi-task loops** for the full contract and anti-patterns.

Asana-specific verb mapping:

| Transition              | Canonical verb + MCP call(s)                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task start              | `task.move(cardId, "wip")` → `mcp__claude_ai_Asana__update_tasks { task: <gid>, memberships: [{ project: <projectGid>, section: <wipSectionGid> }] }`                                                                                                                                                                                                                                                            |
| Step complete (subtask) | `checklist.check` → `mcp__claude_ai_Asana__update_tasks { task: <subtaskGid>, completed: true }`                                                                                                                                                                                                                                                                                                                 |
| Task complete (full)    | `task.move(cardId, "done")` → `mcp__claude_ai_Asana__update_tasks { task: <parentGid>, memberships: [{ project: <projectGid>, section: <doneSectionGid> }] }` then `task.comment.add` → `mcp__claude_ai_Asana__add_comment { task_id: <parentGid>, text: "🤖 [agent] Task complete. Commit: <SHA>. <branch>." }` then `task.close` → `mcp__claude_ai_Asana__update_tasks { task: <parentGid>, completed: true }` |
| Task failed             | `task.comment.add` → `mcp__claude_ai_Asana__add_comment` with failure mode + `mcp__claude_ai_Asana__update_tasks { task: <gid>, add_followers: ["<escalateToAliasGid>"] }` for human escalation. Do NOT call `task.move(_, "done")` or `task.close`.                                                                                                                                                             |

Resolve `<wipSectionGid>` / `<doneSectionGid>` from `.asana.json` using `defaults.wipSectionAlias` / `defaults.doneSectionAlias` to look up the matching entry in `sections[]` by alias. Both must already be in `autonomous.scope.sections` — otherwise the verb returns `OUT_OF_SCOPE`.

**Asana caveat (per [`anti-patterns/asana.md`](./anti-patterns/asana.md)):** the MCP `get_task` doesn't return activity stories, so verifying the lifecycle programmatically is incomplete. The UI activity feed IS the human's audit log — keep it dense and accurate.

## Phase 6 — CRUD operations (existing tasks)

For verbs other than `task.create`, jump directly to the operation. Verb → MCP tool mapping:

| Core verb           | Asana MCP tool                 | Notes                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | `create_tasks`                 | parent + subtasks per Phase 5                                                                                                                                                                                                           |
| `task.move`         | `update_tasks`                 | `memberships: [{ project, section: <resolvedGid> }]`. Resolve `"wip"` / `"done"` / `"open"` via `defaults.wipSectionAlias` / `defaults.doneSectionAlias` / `defaults.openSectionAlias` in `.asana.json`. Raw section GIDs pass through. |
| `checklist.check`   | `update_tasks`                 | for subtasks: `completed: true`; emulates checklist via subtask model                                                                                                                                                                   |
| `task.close`        | `update_tasks`                 | `completed: true` on parent                                                                                                                                                                                                             |
| `task.due-date.set` | `update_tasks`                 | `due_on: "YYYY-MM-DD"`                                                                                                                                                                                                                  |
| `task.assignee.add` | `update_tasks` + `addFollower` | primary assignee replaces; additional are followers                                                                                                                                                                                     |
| `task.comment.add`  | `add_comment` (story)          | adds a comment story to the task; apply attribution prefix if enabled                                                                                                                                                                   |

`<task-ref>` resolution: accept Asana permalinks (`https://app.asana.com/0/<project>/<task>`), bare GIDs, or aliases from `.asana.json` `taskAliases[]`.

## Result envelope

Every verb returns the core contract shape (see [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Result envelope):

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "asana",
  "ref": { "id": "<gid>", "url": "https://app.asana.com/0/<project>/<gid>", "alias": "<optional>" },
  "details": {
    /* Asana-specific (see table below) */
  }
}
```

Asana-specific `details` per verb:

| Verb                | `details` fields                                                         |
| ------------------- | ------------------------------------------------------------------------ |
| `task.create`       | `{ parentGid, subtaskGids[], projectGid, sectionGid?, customFields[]? }` |
| `task.move`         | `{ taskGid, sectionGid, targetList }`                                    |
| `checklist.check`   | `{ subtaskGid, completed: true }`                                        |
| `task.close`        | `{ parentGid, completed: true }`                                         |
| `task.due-date.set` | `{ taskGid, due_on }`                                                    |
| `task.assignee.add` | `{ taskGid, assignee, followers[]? }` (primary vs follower split)        |
| `task.comment.add`  | `{ taskGid, storyGid }`                                                  |

On failure: `{ ok: false, verb, tool, error: { code, message, retriable } }`. Common codes: `FORBIDDEN_VERB`, `OUT_OF_SCOPE`, `NOT_FOUND`, `RATE_LIMITED`, `PARTIAL_CREATE` (subtask failed mid-create — see [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Partial-create recovery).

## Anti-patterns

See [`anti-patterns/asana.md`](anti-patterns/asana.md) — paste health, custom-field rules, GID requirements, partial-create handling.

## Standalone fallback

If `@llodev/pm-tasks-core` is not installed: ask the user for minimum input (title + subtask names) and produce a paste-ready Asana task body from this content alone. Quality is degraded — no scope/audience/fidelity inference. Print: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Lookup order: `<git-root>/.asana.json` → `~/.config/llodev/pm-tasks/asana.json` → abort with init instructions. Schema: [`schemas/config.json`](schemas/config.json). Secrets NEVER in JSON — Asana MCP holds OAuth; `init` uses `LLODEV_PM_TASKS_ASANA_PAT` env var only.

## Init

```
npx @llodev/pm-tasks-asana init
```

See [`../pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) for the shared flow. Asana init reads workspaces / projects / sections / custom fields via the Asana REST API using a Personal Access Token (env `LLODEV_PM_TASKS_ASANA_PAT`).

Pass `--doctor` to run workspace health checks before prompting:

```sh
npx @llodev/pm-tasks-asana init --doctor
```

Runs core checks (C-FS-1..3, C-CFG-1..4) plus Asana-specific probes (C-ASN-1..3, gated on `LLODEV_PM_TASKS_ASANA_PAT`). Full check matrix in [`pm-tasks/pm-tasks-core/references/doctor.md`](../pm-tasks-core/references/doctor.md).
