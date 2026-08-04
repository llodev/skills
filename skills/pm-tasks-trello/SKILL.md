---
name: pm-tasks-trello
description: >-
  Trello adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Trello, asks to "create card", "publish to Trello", "post to Trello",
  "publish", or uses --publish; OR for CRUD on existing cards (check checklist
  item, close card, change due-date, add member, comment); OR when invoked
  autonomously by another agent with [autonomous] / --auto sentinel. Modes:
  paste-ready (no MCP needed), MCP publish (via atlassian-trello-mcp),
  autonomous (write-through with allowlist). Implements 7 CRUD verbs
  (task.create, task.move, checklist.check, task.close, task.due-date.set,
  task.assignee.add, task.comment.add) from
  skills/pm-tasks-core/references/contract.md. Requires @llodev/pm-tasks-core
  installed.
license: MIT
metadata:
  version: 1.9.0
  tags:
    - agent-skill
    - trello
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: trello
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# pm-tasks-trello

Adapter for Trello within the `@llodev/pm-tasks-*` family. Use the core skill's extraction phases, then apply Trello formatting and optionally publish/operate via the `atlassian-trello-mcp` MCP server.

## Routing

| Mode           | Trigger                                                                                                           | Path                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Paste-only     | "format as Trello card" without MCP intent                                                                        | Phase 3 (core) → Phase 4 (this skill, format only) → output paste blocks                                              |
| MCP publish    | "publish to Trello", "create on Trello", "--publish"                                                              | Phase 3 → Phase 4 → Phase 5 (publish via MCP)                                                                         |
| Autonomous     | `[autonomous]` or `--auto` in prompt OR `LLODEV_PM_TASKS_AUTONOMOUS=1`                                            | Phase 3 → Phase 4 → Phase 5b (write-through, no preview)                                                              |
| CRUD ops       | "check item N on task X", "close card Y", "add Alice to task Z", "comment on task X"                              | Phase 6 (operations, direct verb dispatch)                                                                            |
| Plan-execution | Plan file path in prompt (`docs/plans/*.md`), OR `--plan-exec` flag, OR plan reference paired with `.trello.json` | Phase 7 (discover existing cards via `discoverPlanTasks`; calling agent dispatches per-task verbs at task boundaries) |

## Phase 4 — Trello formatting

**MANDATORY — READ ENTIRE FILE** [`references/format.md`](references/format.md) before producing any Trello-specific output. Then apply [`anti-patterns/tools.md`](anti-patterns/tools.md) § Trello.

## Phase 5 — MCP publish

**Prerequisites:** `atlassian-trello-mcp` configured (see [`references/mcp-config.md`](references/mcp-config.md)). Env vars `TRELLO_API_KEY` + `TRELLO_TOKEN` in shell.

Strict order: 5.1 config discovery → 5.2.5 resolve labels/member → 5.2 preview & approval → 5.3 publish via MCP → 5.4 error handling.

Full sequence in [`references/publish.md`](references/publish.md).

### Attribution (opt-in)

Before calling the MCP create tool, read `config.attribution`. If `enabled === true`, prefix the comment with the `commentPrefix` returned by `getAttribution()` and append the `descriptionFooter` to the end of `description`. In autonomous mode (`[autonomous]` sentinel), the `commentPrefix` automatically becomes the `autonomousCommentPrefix`. See [references/attribution.md in pm-tasks-core](../pm-tasks-core/references/attribution.md) (added in v1.2.0).

## Phase 5b — Autonomous

Skip 5.2 preview & approval. Apply autonomous-mode contract from [`skills/pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Tool-specific overlay in [`references/autonomous.md`](references/autonomous.md). Audit log entries per [`skills/pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

## Phase 6 — CRUD operations (existing cards)

For verbs other than `task.create`, jump directly to the operation. **MANDATORY — READ ENTIRE FILE** [`references/operations.md`](references/operations.md) which lists verb → MCP tool mapping and `<task-ref>` resolution for Trello URLs/IDs. For `task.comment.add`, apply attribution prefix if `config.attribution.enabled === true` (see Phase 5 § Attribution).

Temporal handling (create-time `due`, `start` on WIP move, and the overwrite-`due`-and-footer close) is documented in [`references/operations.md`](references/operations.md) § Temporal handling.

### `trello.task.batch-create-with-checklists` (custom verb)

Batch-creates multiple cards, each with its checklists, in bounded parallel —
~10× faster than one-at-a-time on large plans. Cards route through the audited
`task.create` path; checklists are created two-phase (all checklists, then all
items) with a concurrency cap of 8 to respect Trello's 300 req/10s limit. One
card failing does not abort the batch. Autonomous-gateable via
`autonomous.allow`. Headless entry: `@llodev/pm-tasks-trello/adapter` →
`trelloBatchCreateWithChecklists`. This release's speedup is parallelism;
`idChecklistSource` template cloning (exposed by the Trello MCP) is a possible
future optimization for repeated checklist templates.

## Phase 7 — Plan-execution mode

When the calling agent passes a plan reference (a path to a markdown plan file, a plan slug, or an explicit list of expected task titles), this skill loads `.trello.json` via `requireConfig` and uses `discoverPlanTasks` (from `@llodev/pm-tasks-core`) to triage which tasks in the plan already exist as cards in scope. The skill returns the triage report `{ found, missing, ambiguous }` — the **calling agent** decides how to act on each bucket (create missing cards via Phase 4 + 5; disambiguate by picking the right ambiguous card; proceed with existing).

The skill does **not** assume any particular implementation strategy. It does not drive the calling agent's task loop, does not depend on any specific orchestration framework, and does not require any markup beyond what is already documented for `task.create` and the autonomous-mode contract. When the calling agent finishes a task and asks the skill to record progress, it invokes the standard verbs (`task.move`, `checklist.check`, `task.comment.add`, `task.close`) directly — the same path used by Phase 5b autonomous mode.

Full contract: triggers, discovery semantics, `ConfigRequiredError` handling, failure modes table, and the hook contract for Phase 5 are documented in [`skills/pm-tasks-core/references/plan-execution.md`](../pm-tasks-core/references/plan-execution.md) (added in v1.9.0).

## Standalone fallback

If `@llodev/pm-tasks-core` is not installed: ask the user for minimum input (title + checklist items) and produce a paste-ready Trello card from this content alone. Quality is degraded — no scope/audience/fidelity inference. Print: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Lookup order: `<git-root>/.trello.json` → `~/.config/llodev/pm-tasks/trello.json` → abort with init instructions. Schema: [`schemas/config.json`](schemas/config.json). Secrets NEVER in JSON — only env vars / keychain.

> **Narration language.** When `.trello.json` sets `locale`, agent-authored narration — comments the agent writes, autonomous commit/PR copy, code comments — MUST use it. The plan's language still governs card title/description/checklist text. `pm-tasks-core-doctor` `C-LANG-1` warns if unset or set to a locale with no installed i18n bundle. See pm-tasks-core § Narration language.

## Init

```
npx @llodev/pm-tasks-trello init
```

See [`skills/pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) for the shared flow.

Pass `--doctor` to run workspace health checks before prompting:

```sh
npx @llodev/pm-tasks-trello init --doctor
```

Runs core checks (C-FS-1..3, C-CFG-1..4) plus Trello-specific probes (C-TRL-1..3, gated on `TRELLO_API_KEY`/`TRELLO_TOKEN`). Full check matrix in [`skills/pm-tasks-core/references/doctor.md`](../pm-tasks-core/references/doctor.md).
