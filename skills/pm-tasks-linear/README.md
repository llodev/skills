<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-linear

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-linear?color=blue)](https://www.npmjs.com/package/@llodev/pm-tasks-linear)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Linear adapter for the `@llodev/pm-tasks-*` family. Publishes generic cards as Linear issues and dispatches CRUD operations through the [Linear MCP](https://linear.app/docs/mcp). The **first** pm-tasks family adapter to implement `task.sprint.set` (via Linear cycles).

## Install

```bash
npm install @llodev/pm-tasks-linear @llodev/pm-tasks-core
# or
pnpm add @llodev/pm-tasks-linear @llodev/pm-tasks-core
```

## Setup the MCP

Linear uses the **Linear MCP** over Streamable-HTTP at `https://mcp.linear.app/mcp`. The MCP handles OAuth — the adapter never sees tokens.

For any MCP-capable agent (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

- **Claude Code**: `claude mcp add linear -s project -- npx -y @linear/mcp-server` (or follow [Linear's MCP setup guide](https://linear.app/docs/mcp)), then approve the OAuth flow in your browser.
- **Cursor / Windsurf / Cline / Roo Code**: add an MCP entry in that agent's settings pointing at `https://mcp.linear.app/mcp`.
- **Codex**: add an `[mcp_servers.linear]` entry in `~/.codex/config.toml`.

In Claude Code, verify with `claude mcp list` — `linear` should appear as authenticated.

## Setup the config

The `init` script enumerates your Linear team, states, labels, members, and estimation settings, then writes a `.linear.json`. Run it from within an agent session that already has the Linear MCP connected, or standalone with a Linear API key.

**MCP-driven (recommended):**

```bash
npx @llodev/pm-tasks-linear init
```

Walk through the prompts. The script uses the Linear MCP to discover your team metadata — no credentials needed.

**GraphQL standalone (no MCP):**

Create a personal API key at [linear.app/settings/api](https://linear.app/settings/api), then:

```bash
export LINEAR_API_KEY=lin_api_...
npx @llodev/pm-tasks-linear init
```

Pick where the config should live:

- **local** → `./.linear.json` (recommended for project-scoped configs, can be committed).
- **global** → platform default:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/linear.json`, falling back to `~/.config/llodev/pm-tasks/linear.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\linear.json`.
  - Override with `LLODEV_PM_TASKS_CONFIG_HOME=/your/path`.

The init prompt prints the absolute path it will write to.

Run workspace health checks anytime with:

```bash
npx @llodev/pm-tasks-linear init --doctor
```

> [!IMPORTANT]
> The API key is **only** used by `init` to discover your team metadata. The Linear MCP uses OAuth — never put the API key in `.linear.json`.

## Use

| Prompt example                                                   | What the agent does                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `"publish this plan as Linear issues"`                           | Phase 5 publish — parent issue + sub-issues + labels in batch         |
| `"check sub-issue LEO-43"`                                       | Phase 6 CRUD — `checklist.check` (moves sub-issue to completed state) |
| `"close LEO-42"`                                                 | Phase 6 CRUD — `task.close` (state resolved by type `completed`)      |
| `"set the estimate on LEO-42 to 5 points"`                       | Phase 6 CRUD — `task.estimate.set` (effort → points + label `est:`)   |
| `"move LEO-42 to LEO-12"`                                        | Phase 6 CRUD — `task.parent.set` (arbitrary depth)                    |
| `"assign cycle 3 to LEO-42"`                                     | Phase 6 CRUD — `task.sprint.set` (resolve cycle by number)            |
| `"[autonomous] create linear issues from plan @docs/plans/X.md"` | Phase 5b autonomous (requires `autonomous.enabled: true`)             |

## Linear-specific notes

**Sub-issues as checklists:** Linear has no native checklist. Checklist items from the generic card become **sub-issues** (`save_issue { parentId }`). `checklist.check` moves the sub-issue to a completed-type state — it does not edit description text.

**States by type:** The adapter resolves states by type string (`unstarted`, `started`, `completed`, `canceled`) — never by name. State names are locale-dependent and team-customizable.

**Single assignee:** Linear supports one assignee per issue. `task.assignee.add` is a set operation — it replaces the current assignee.

**Label replace-set:** Any label write overwrites the full label array. The adapter always reads current labels before writing (read-modify-write). Never write labels without reading first.

**Cycles = sprints:** `task.sprint.set` assigns an issue to a Linear cycle. Cycles are team-gated — enable them in team Settings before use. Returns `NOT_APPLICABLE` when cycles are disabled.

**save_issue upsert:** When `id` is absent, `save_issue` **creates** a new issue. Always pass `id` on updates — omitting it silently creates a duplicate.

**Lifecycle fidelity:** `task.create` writes the plan due-date to `dueDate`. Start (`startedAt`) and close (`completedAt`) are auto-stamped natively by the existing `task.move` / `task.close` calls — no extra calls needed — and `dueDate` (the plan) is **never overwritten**. See [`references/operations.md`](./references/operations.md) § Temporal handling and [`pm-tasks-core`'s lifecycle-fidelity reference](../pm-tasks-core/references/lifecycle-fidelity.md).

## Documentation

- [`SKILL.md`](SKILL.md) — full skill reference (routing, Linear model, all phases, CRUD verbs, result envelope)
- [`references/operations.md`](references/operations.md) — verb → MCP tool mapping, task-ref resolution, error codes
- [`references/estimation.md`](references/estimation.md) — estimation strategies, `est:<slug>` label idempotency
- [`references/autonomous.md`](references/autonomous.md) — Linear autonomous mode scope and allowlist
- [`anti-patterns/linear.md`](anti-patterns/linear.md) — NEVER rules for Linear
- [`schemas/config.json`](schemas/config.json) — `.linear.json` schema

## License

MIT
