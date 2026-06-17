# Init UX (shared across pm-tasks-<tool> adapters)

Every `pm-tasks-<tool>` adapter exposes `npx @llodev/pm-tasks-<tool> init` and follows this four-step flow. Implementation library at `pm-tasks/pm-tasks-core/src/init-lib.ts` (compiled to `dist/init-lib.js`; consumers import via `@llodev/pm-tasks-core/init-lib`).

## Step 1 — Scope prompt

```
Where should the config live?
  > local    → ./.{tool}.json (per-repo override)
    global   → ~/.config/llodev/pm-tasks/{tool}.json
```

Default highlight: `local` if inside a git repo, `global` otherwise.

## Step 2 — MCP auto-detect

Adapter probes the tool's MCP with the lightest read operation:

- Trello → `list_boards`
- Asana → `list_workspaces`
- Linear → `viewer`
- Notion → `users.me`
- ...

Three outcomes:

| Outcome                        | Action                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| MCP responded                  | Go to Step 3A (MCP-assisted).                                             |
| MCP exists but unauthenticated | Print exact env var names (`LLODEV_PM_TASKS_<TOOL>_<NAME>`) to set, exit. |
| MCP not configured             | Print MCP setup instructions for the adapter, go to Step 3B (scaffold).   |

## Step 3A — MCP-assisted (happy path)

Read-only MCP calls enumerate workspace → boards/projects → lists/sections → labels → members. User picks via interactive prompts (multi-select for arrays).

Final prompt: _"Enable autonomous mode? (adds an `autonomous` block with conservative defaults: 6 verbs, rate 30/min, no hard-coded scope — you add it afterwards)"_ — default `n`.

Write the config; validate against `schemas/config.json`; exit.

## Step 3B — Scaffold (fallback)

Write `.{tool}.json` with placeholders and inline `// comments` showing where to find each ID. Print MCP setup instructions referencing the adapter's `references/mcp-config.md`. Exit.

## Step 4 — Confirmation

Print:

- Path written
- Schema validation result
- Sample trigger prompt the user can paste (`"create a card on <tool> from this plan"`)
- Reminder: secrets go in env vars or OS keychain, NEVER in this JSON.

## Implementation API (consumed by adapters)

Adapter `scripts/init.mjs` imports from `@llodev/pm-tasks-core/init-lib`:

```javascript
import {
  promptScope,
  promptYesNo,
  multiSelect,
  writeConfig,
  validateConfig,
  probeMCP,
  printInstructions,
} from "@llodev/pm-tasks-core/init-lib";
```

Each adapter implements its own MCP-probing logic and field-mapping; UX primitives are shared.
