<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-jira/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-jira/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-jira/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-jira

> Jira adapter for the `@llodev/pm-tasks-*` family — turn implementation plans into Jira issues + sub-tasks and operate them via paste, MCP publish, or autonomous write-through, with strategy-agnostic effort estimation.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-jira?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-jira)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

What you get:

- **Paste-ready output** — agent renders a generic card; you paste into Jira manually.
- **MCP publish** via the Atlassian Remote MCP (OAuth, Streamable-HTTP — no tokens in JSON). Parent issue + sub-tasks + labels in one batch.
- **CRUD operations** on existing issues: `checklist.check`, `task.move`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`, `task.parent.set`, `task.estimate.set`.
- **Effort estimation, never deadlines** — strategy-agnostic (story points, fibonacci, planning poker, t-shirt, affinity, three-point/PERT, ideal days/hours), written to your Story Points field or time tracking.
- **Autonomous mode** — `[autonomous]` / `--auto` sentinel for write-through under allowlist + scope + rate limits. Multi-task loops mirror state to Jira in real time.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-jira

# Vercel CLI (install core manually too)
npx skills add llodev/skills/pm-tasks/pm-tasks-core
npx skills add llodev/skills/pm-tasks/pm-tasks-jira
```

## Setup the MCP

Jira uses the **Atlassian Remote MCP** over the Streamable-HTTP endpoint `https://mcp.atlassian.com/v1/mcp`. The MCP handles OAuth — the adapter never sees tokens.

For any MCP-capable agent (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

- **Claude Code**: `claude mcp add atlassian -s project -- npx -y @anthropic-ai/mcp-server-atlassian` (or follow Atlassian's Remote MCP setup guide for your site), then approve the OAuth flow in your browser.
- **Cursor / Windsurf / Cline / Roo Code**: add an MCP entry in that agent's settings pointing at `https://mcp.atlassian.com/v1/mcp`.
- **Codex**: add an `[mcp_servers.atlassian]` entry in `~/.codex/config.toml`.

In Claude Code, verify with `claude mcp list` — `atlassian` should appear as authenticated.

> [!NOTE]
> The legacy SSE endpoint (`/events`) was retired 2026-06-30 — use the Streamable-HTTP endpoint above.

## Setup the config

The `init` script enumerates your Atlassian site, project, issue types, and Story Points field, then writes a `.jira.json`. Run it from within an agent session that already has the Atlassian MCP connected, or standalone with an API token. For the standalone path, create a token at https://id.atlassian.com/manage-profile/security/api-tokens, then:

```bash
export ATLASSIAN_API_TOKEN=...
export ATLASSIAN_EMAIL=you@example.com
npx @llodev/pm-tasks-jira init
```

Walk through the prompts. Pick where the config should live:

- **local** → `./.jira.json` (recommended for project-scoped configs, can be committed).
- **global** → a platform default, customizable. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/jira.json`, falling back to `~/.config/llodev/pm-tasks/jira.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\jira.json`.
  - Override on any OS with `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — the file lands at `$LLODEV_PM_TASKS_CONFIG_HOME/jira.json`.

The `init` prompt prints the absolute path it will write to, so you always see exactly where the file goes. Run workspace health checks anytime with:

```bash
npx @llodev/pm-tasks-jira init --doctor
```

> [!IMPORTANT]
> The API token is **only** used by `init` to discover your project metadata. The MCP itself uses OAuth — never put tokens in the JSON.

## Use

| Prompt example                                                 | What the agent does                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `"publish this plan as Jira issues"`                           | Phase 5 publish — parent + sub-tasks + labels in one batch                |
| `"check subtask 3 on KAN-42"`                                  | Phase 6 CRUD — `checklist.check` on the sub-task                          |
| `"close KAN-42"`                                               | Phase 6 CRUD — `task.close` (transition resolved by status category)      |
| `"set the estimate on KAN-42 to 5 points"`                     | Phase 6 CRUD — `task.estimate.set` (effort → Story Points + `est:` label) |
| `"set the parent of KAN-43 to KAN-12"`                         | Phase 6 CRUD — `task.parent.set`                                          |
| `"[autonomous] create jira issues from plan @docs/plans/X.md"` | Phase 5b autonomous (requires `autonomous.enabled: true`)                 |

## Jira-specific notes

> [!NOTE]
> **Transitions are resolved by status category** (`new` / `indeterminate` / `done`), not by name — so `task.move` / `task.close` work the same in any workspace language (e.g. pt-BR `"Tarefa"` / `"Concluído"`).

> [!NOTE]
> **Checklist items become Sub-tasks** — one level deep, each created under its parent issue. A parent issue key is required.

> [!WARNING]
> **`task.sprint.set` is NOT supported** — the Atlassian MCP exposes no agile/sprint API, so the core factory returns `UNSUPPORTED_VERB`. Sprint and capacity planning are roadmapped for v1.12.0.

- **Estimation records effort, never a calendar deadline.** Story Points need a board field — `init` auto-detects it (`customfield_10016` by default); if it's absent, `task.estimate.set` returns `INVALID_REQUEST` with a hint to enable it. The human-readable original is preserved as an idempotent `est:` label.
- **Due dates on a sub-task** return `NOT_APPLICABLE` — team-managed Jira sub-tasks don't carry their own due date.
- **Issue types are read from config** (`issueTypes{}`, locale-specific names) — never hard-coded. See [`anti-patterns/jira.md`](./anti-patterns/jira.md).

## Documentation

- [`SKILL.md`](./SKILL.md) — phase routing + CRUD vocabulary.
- [`schemas/config.json`](./schemas/config.json) — `.jira.json` JSON Schema.
- [`references/operations.md`](./references/operations.md) — verb → MCP tool mapping.
- [`references/estimation.md`](./references/estimation.md) — estimation strategies + label preservation.
- [`anti-patterns/jira.md`](./anti-patterns/jira.md) — recurring gotchas.
- [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md) — autonomous-mode contract.

## License

MIT — see [LICENSE](./LICENSE).
