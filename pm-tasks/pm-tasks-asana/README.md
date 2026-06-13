# @llodev/pm-tasks-asana

Asana adapter for the `@llodev/pm-tasks-*` family. Convert implementation plans into Asana parent tasks + subtasks (paste-ready or published via MCP) and operate them (`checklist.check`, `task.close`, `task.comment.add`, etc.).

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-asana

# Vercel CLI (install core manually too)
npx skills add llodev/skills/pm-tasks-core
npx skills add llodev/skills/pm-tasks-asana
```

## Setup the MCP

Asana uses OAuth via the `claude.ai Asana` MCP. If you've already connected your Asana account in Cursor or Claude Code settings, you're done — no extra step.

For any MCP-capable agent (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

1. Open the agent's MCP settings.
2. Enable / register `claude.ai Asana` (or your agent's equivalent Asana MCP).
3. Approve the OAuth flow in your browser.

In Claude Code, verify with `claude mcp list` — `claude.ai Asana` should appear as authenticated. Other agents have their own listing commands; see your agent's MCP docs.

## Setup the config

The `init` script runs **outside** the MCP, so it needs a Personal Access Token to enumerate your workspaces / projects / sections / custom fields. Generate one at https://app.asana.com/0/my-apps, then:

```bash
export LLODEV_PM_TASKS_ASANA_PAT=...
npx @llodev/pm-tasks-asana init
```

Walk through the prompts. Output: `.asana.json` (repo) or `~/.config/llodev/pm-tasks/asana.json` (global).

The PAT is **only** used by `init`. The MCP itself uses OAuth — never put tokens in the JSON.

## Use

- `"publish this plan as Asana tasks"` → publish flow (parent + subtasks)
- `"check subtask 3 on task X in Asana"` → CRUD op
- `"close task Y"` → close
- `"comment on task X: ..."` → comment
- `"[autonomous] create task in asana from plan @docs/plans/X.md"` → autonomous (requires `autonomous.enabled: true` in config)

## Asana-specific notes

- **Subtasks are one level deep** — the adapter flattens nested checklists into a single subtask layer.
- **Custom fields do NOT inherit by default** — list field IDs in `subtaskDefaults.inheritParentFields` so the adapter copies them from parent to subtasks at create time.
- **Assignee is a single field** — use `task.assignee.add` to add followers; the primary assignee replaces on conflict.

## License

MIT — see [LICENSE](./LICENSE).
