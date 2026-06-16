---
name: pm-tasks-trello
description: >-
  Trello adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Trello, asks to "create card", "publish to Trello", "post to Trello",
  "publish", or uses --publish; OR for CRUD on existing cards (check checklist
  item, close card, change due-date, add member, comment); OR when invoked
  autonomously by another agent with [autonomous] / --auto sentinel. Modes:
  paste-ready (no MCP needed), MCP publish (via atlassian-trello-mcp),
  autonomous (write-through with allowlist). Implements 6 CRUD verbs
  (task.create, checklist.check, task.close, task.due-date.set,
  task.assignee.add, task.comment.add) from
  pm-tasks/pm-tasks-core/references/contract.md. Requires @llodev/pm-tasks-core
  installed.
license: MIT
metadata:
  version: 1.1.2
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

<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-trello

Adapter for Trello within the `@llodev/pm-tasks-*` family. Use the core skill's extraction phases, then apply Trello formatting and optionally publish/operate via the `atlassian-trello-mcp` MCP server.

## Routing

| Mode        | Trigger                                                                              | Path                                                                     |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Paste-only  | "format as Trello card" without MCP intent                                           | Phase 3 (core) → Phase 4 (this skill, format only) → output paste blocks |
| MCP publish | "publish to Trello", "create on Trello", "--publish"                                 | Phase 3 → Phase 4 → Phase 5 (publish via MCP)                            |
| Autonomous  | `[autonomous]` or `--auto` in prompt OR `LLODEV_PM_TASKS_AUTONOMOUS=1`               | Phase 3 → Phase 4 → Phase 5b (write-through, no preview)                 |
| CRUD ops    | "check item N on task X", "close card Y", "add Alice to task Z", "comment on task X" | Phase 6 (operations, direct verb dispatch)                               |

## Phase 4 — Trello formatting

**MANDATORY — READ ENTIRE FILE** [`references/format.md`](references/format.md) before producing any Trello-specific output. Then apply [`anti-patterns/tools.md`](anti-patterns/tools.md) § Trello.

## Phase 5 — MCP publish

**Prerequisites:** `atlassian-trello-mcp` configured (see [`references/mcp-config.md`](references/mcp-config.md)). Env vars `TRELLO_API_KEY` + `TRELLO_TOKEN` in shell.

Strict order: 5.1 config discovery → 5.2.5 resolve labels/member → 5.2 preview & approval → 5.3 publish via MCP → 5.4 error handling.

Full sequence in [`references/publish.md`](references/publish.md).

### Attribution (opt-in)

Before calling the MCP create tool, read `config.attribution`. If `enabled === true`, prefix the comment with the `commentPrefix` returned by `getAttribution()` and append the `descriptionFooter` to the end of `description`. In autonomous mode (`[autonomous]` sentinel), the `commentPrefix` automatically becomes the `autonomousCommentPrefix`. See `references/attribution.md` in pm-tasks-core (added in v1.2.0; file created in Task 1.5).

## Phase 5b — Autonomous

Skip 5.2 preview & approval. Apply autonomous-mode contract from [`pm-tasks/pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Tool-specific overlay in [`references/autonomous.md`](references/autonomous.md). Audit log entries per [`pm-tasks/pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

## Phase 6 — CRUD operations (existing cards)

For verbs other than `task.create`, jump directly to the operation. **MANDATORY — READ ENTIRE FILE** [`references/operations.md`](references/operations.md) which lists verb → MCP tool mapping and `<task-ref>` resolution for Trello URLs/IDs. For `task.comment.add`, apply attribution prefix if `config.attribution.enabled === true` (see Phase 5 § Attribution).

## Standalone fallback

If `@llodev/pm-tasks-core` is not installed: ask the user for minimum input (title + checklist items) and produce a paste-ready Trello card from this content alone. Quality is degraded — no scope/audience/fidelity inference. Print: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Lookup order: `<git-root>/.trello.json` → `~/.config/llodev/pm-tasks/trello.json` → abort with init instructions. Schema: [`schemas/config.json`](schemas/config.json). Secrets NEVER in JSON — only env vars / keychain.

## Init

```
npx @llodev/pm-tasks-trello init
```

See [`pm-tasks/pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) for the shared flow.
