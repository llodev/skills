# Trello MCP Configuration

The MCP server (`atlassian-trello-mcp`, run via `npx`) is identical across agents. Only the config file location and the JSON/TOML envelope differ. Env vars `TRELLO_API_KEY` + `TRELLO_TOKEN` must be set in the shell that launches the agent — they are inherited by the MCP child process.

## MCP setup — Claude Code

Project-scoped MCP servers live in `.mcp.json` at the repo root. Register via CLI:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Then approve via `/mcp` in the chat. Claude Code does NOT interpolate `${env:VAR}` — env vars must be set in the parent shell.

## MCP setup — Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "atlassian-trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "${env:TRELLO_API_KEY}",
        "TRELLO_TOKEN": "${env:TRELLO_TOKEN}"
      }
    }
  }
}
```

Cursor supports `${env:VAR}` interpolation.

## MCP setup — Codex

Codex reads MCP servers from `~/.codex/config.toml` (TOML, not JSON):

```toml
[mcp_servers.trello]
command = "npx"
args = ["-y", "atlassian-trello-mcp"]

[mcp_servers.trello.env]
TRELLO_API_KEY = "<your-key>"
TRELLO_TOKEN = "<your-token>"
```

For env-var indirection, prefer storing the actual values in your OS keychain and templating them in via your shell init.

## MCP setup — Windsurf

```json
// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "atlassian-trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "${env:TRELLO_API_KEY}",
        "TRELLO_TOKEN": "${env:TRELLO_TOKEN}"
      }
    }
  }
}
```

Same shape as Cursor; supports `${env:VAR}` interpolation.

## MCP setup — Cline and Roo Code

Both read from a JSON settings file under the VS Code user-data dir (Cline: `cline_mcp_settings.json`; Roo Code: `roo_code_mcp_settings.json` or `mcp_settings.json` depending on version). Same envelope as Cursor:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "atlassian-trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "<your-key>",
        "TRELLO_TOKEN": "<your-token>"
      }
    }
  }
}
```

## MCP setup — other MCP-capable agents

The server is constant: `npx -y atlassian-trello-mcp` with env vars `TRELLO_API_KEY` + `TRELLO_TOKEN`. Consult your agent's MCP docs for the config file location and exact JSON/TOML envelope. The server name (`atlassian-trello-mcp`) and required env vars do not change.

---

## Board config (`.trello.json`)

The adapter expects Trello metadata at the **repository root** in `.trello.json` (or `~/.config/llodev/pm-tasks/trello.json` as a global fallback). **Read the full file** before Phase 4 (formatting) and Phase 5 (publish).

The authoritative schema is [`../schemas/config.json`](../schemas/config.json) (JSON Schema 2020-12). The shape below mirrors that schema field-for-field.

### Top-level keys

| Key            | Required | Purpose                                                                                          |
| -------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `$schema`      | optional | URL pointer for editor IDE hover validation.                                                     |
| `version`      | **yes**  | Const `"1"` — schema version of this file.                                                       |
| `workspace`    | optional | Free-text workspace label (informational, not used by the API).                                  |
| `boards[]`     | **yes**  | Catalog of accessible boards: `{ id, name?, alias, url? }`.                                      |
| `lists[]`      | **yes**  | Catalog of board columns: `{ boardAlias, id, name?, alias }`.                                    |
| `labels[]`     | optional | Catalog of named labels: `{ boardAlias, id, name?, color?, alias }`.                             |
| `members[]`    | optional | Catalog of board members: `{ id, username?, fullName?, alias }`. **Do NOT include a personal "me" entry** committed to git — resolve at runtime (see below). |
| `defaults`     | optional | `{ boardAlias?, listAlias?, closeListAlias? }` — preferred defaults when the user omits them.    |
| `taskAliases[]`| optional | Stable aliases for individual cards: `{ alias, id, url? }`.                                      |
| `autonomous`   | optional | Autonomous-mode envelope (see [`./autonomous.md`](./autonomous.md) for full spec).               |

`alias` everywhere is `^[a-z0-9-]+$` — used by the agent as a stable, human-friendly key. `id` is the 24-char Trello object ID returned by the API.

### Example (matches the schema)

```json
{
  "$schema": "https://llodev.github.io/skills/schemas/pm-tasks-trello.json",
  "version": "1",
  "workspace": "llodev",
  "boards": [
    { "id": "6a2b574aefe6fe9621a3d5a7", "name": "Skills", "alias": "skills", "url": "https://trello.com/b/bR5bbtoH" }
  ],
  "lists": [
    { "boardAlias": "skills", "id": "6a2b57600f0f20cbea2277f0", "name": "Backlog", "alias": "backlog" },
    { "boardAlias": "skills", "id": "6a2b576292aee4b8eeb82ed1", "name": "WIP",     "alias": "wip" },
    { "boardAlias": "skills", "id": "6a2b5767058f005c9c063a8b", "name": "Done",    "alias": "done" }
  ],
  "labels": [
    { "boardAlias": "skills", "id": "6a2b574aefe6fe9621a3d5d2", "name": "core",    "color": "green",  "alias": "core" },
    { "boardAlias": "skills", "id": "6a2b574aefe6fe9621a3d5d7", "name": "adapter", "color": "blue",   "alias": "adapter" }
  ],
  "members": [
    { "id": "67d978bb...", "username": "alice", "fullName": "Alice Example", "alias": "alice" }
  ],
  "defaults": {
    "boardAlias": "skills",
    "listAlias": "backlog",
    "closeListAlias": "done"
  }
}
```

Secrets (`TRELLO_API_KEY`, `TRELLO_TOKEN`) NEVER live in this file. Use env vars or your OS keychain.

### Resolving "me" at runtime (NOT in committed config)

`me` is **whoever owns the Trello token in the environment** (`TRELLO_TOKEN`), not a fixed user in git.

At Phase **5.2.5**, call `trello_get_member` with `memberId: "me"` and use the returned `id` for `idMembers`. **Do not** add the current user to `members[]` in the committed file — each developer's token resolves to themselves.

Optional: if the resolved `id` is not in `members[]` (not on the board), **warn** in the preview but still allow assign if the API accepts it; otherwise **stop** and ask to invite the member to the board.

To assign someone else by default, omit it from the config and let the user pass it explicitly in the prompt, OR add an explicit member alias to `members[]` and reference it in the prompt by alias.

### List resolution

```
listAlias = userProvided ?? defaults.listAlias
listId    = lists.find(l => l.alias === listAlias && l.boardAlias === boardAlias)?.id
```

If `listAlias` is provided but not in `lists[]`, **stop** and list valid aliases — do not invent list IDs.

### Board resolution

```
boardAlias = userProvided ?? defaults.boardAlias
boardId    = boards.find(b => b.alias === boardAlias)?.id
```

If the user picks a board not in `boards[]`, refresh via MCP (`trello_get_user_boards`) and offer to merge into `.trello.json`.

---

## MCP config discovery (Phase 5.1)

Read `.trello.json` at the **project root** (full file, no range limits) before publish.

**If `.trello.json` is missing or has no `boards[]`:**

1. `trello_get_user_boards` (`filter: "open"`) — present board names, ask which board(s).
2. `get_lists` with each `boardId` — present list names; offer Backlog/WIP/Done as defaults if present.
3. `trello_get_board_labels` — merge **named** labels only into `labels[]` (skip `name: ""` stubs).
4. `trello_get_board_members` — fill `members[]` only with the board roster (NOT the active token user).
5. Offer to write `.trello.json` with resolved IDs — **never** add the active token's user to `members[]`.

**Never ask the user for 24-char IDs directly** — always resolve from names via MCP.

**Refreshing a stale config** when the board changed in the Trello UI: re-run the discovery tools above for the active board and offer to merge updates into `.trello.json` (preserve `defaults` choices unless the user asks to switch).

**MCP server:** `atlassian-trello-mcp` (see setup sections above); env `TRELLO_API_KEY` + `TRELLO_TOKEN`.

---

## Resolve labels and member (Phase 5.2.5)

**Run before** the preview (Phase 5.2) so resolved values appear in the confirmation block.

1. Start with the labels mentioned in the generic card's **LABELS** block.
2. For each label name → look up `labels[].id` by matching `label.name` (exact) or `label.alias` against the entry in the card.
3. Build `idLabels: string[]` (dedupe).
4. Resolve member:
   - `"me"` → `trello_get_member({ memberId: "me" })` → use returned `id` (and show `fullName` / `username` in preview).
   - Explicit `alias` from `members[]` → use that entry's `id`.
   - Omitted → no `idMembers`.
   - User override in the preview wins.
5. Emit **LABELS / MEMBER (resolved)** in the conversational wrapper — not inside the paste-only card body.

```
LABELS (resolved):
  core    → 6a2b574aefe6fe9621a3d5d2
  adapter → 6a2b574aefe6fe9621a3d5d7
MEMBER (resolved):
  Alice Example (me, current token) → 67d978bb...
```

If a label is mentioned but absent from `labels[]` → **do not** add to `idLabels`; list it under **omitted** (optional: offer `trello_create_label` only on explicit user request).

If a member alias is referenced but not in `members[]` → **stop**; list valid aliases.
