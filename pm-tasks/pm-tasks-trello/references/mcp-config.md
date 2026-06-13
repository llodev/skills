# Trello MCP Configuration

## MCP setup — Claude Code

In Claude Code, the canonical place for project-scoped MCP servers is `.mcp.json` at the repo root. Use the CLI:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Then approve via `/mcp` in the chat. Env vars `TRELLO_API_KEY` + `TRELLO_TOKEN` must be set in your shell — Claude Code inherits the parent process env.

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

Cursor supports the `${env:VAR}` interpolation syntax; Claude Code does not.

---

## Board config (`.trello.json`)

The adapter expects Trello metadata at the **repository root** in `.trello.json`. **Read the full file** before Phase 4 (formatting) and Phase 5 (publish).

### Schema

| Key             | Purpose                                                             |
| --------------- | ------------------------------------------------------------------- |
| `board`         | `name` + `id` — default board for publish                           |
| `boards[]`      | Catalog of all accessible boards (`trello_get_user_boards`)         |
| `defaultList`   | Fallback list when user omits `listName`                            |
| `lists[]`       | Catalog `{ name, id }` for columns on `board`                       |
| `labels[]`      | Named labels only `{ name, id, color? }` — API uses **ids**         |
| `members[]`     | Board members `{ id, fullName, username }`                          |
| `cardDefaults`  | Default `member` (`"me"` \| username) and optional `labels` (names) |
| `cardCreateApi` | How to pass `idLabels` / `idMembers` on `create_card`               |
| `agentHints`    | Path/keyword → label **name** for inference                         |
| `mcpRefresh`    | Tool names to repopulate catalogs when workspace changes            |

Authoritative schema (JSON Schema 2020-12): [`../schemas/config.json`](../schemas/config.json).

### Assignee `me` (not in committed config)

`cardDefaults.member: "me"` means **whoever owns the Trello token** in the environment (`TRELLO_TOKEN`), not a fixed user in git.

At Phase **5.2.5**, call `trello_get_member` with `memberId: "me"` and use the returned `id` for `idMembers`. **Do not** add `currentUser` to `.trello.json` — each developer's token resolves to themselves without editing the repo.

Optional: if the resolved `id` is not in `members[]` (not on the board), **warn** in the preview but still allow assign if the API accepts it; otherwise **stop** and ask to invite the member to the board.

To assign someone else by default, set `cardDefaults.member` to their `username` from `members[]` (shared config) or override in the preview **e** flow.

### List resolution

```
listName = userProvided ?? defaultList.name
listId   = lists.find(l => l.name === listName)?.id ?? defaultList.id
```

If `listName` is provided but not in `lists[]`, **stop** and list valid names — do not invent list IDs.

### Board resolution

```
boardId = boards.find(b => b.name === userBoardName)?.id ?? board.id
```

If the user picks a board not in `boards[]`, refresh via MCP and offer to merge into `.trello.json`.

---

## MCP config discovery (Phase 5.1)

Read `.trello.json` at the **project root** (full file, no range limits) before publish.

**Example schema** (the file on disk is authoritative):

```json
{
  "board":       { "name": "Your Best Day", "id": "..." },
  "boards":      [ { "name": "Portfolio", "id": "..." }, { "name": "Your Best Day", "id": "..." } ],
  "defaultList": { "name": "Backlog", "id": "..." },
  "lists":       [ { "name": "Backlog", "id": "..." }, { "name": "Em Desenvolvimento", "id": "..." } ],
  "labels":      [ { "name": "api", "id": "...", "color": "blue_light" } ],
  "members":     [ { "id": "...", "fullName": "...", "username": "..." } ],
  "cardDefaults": { "member": "me", "labels": [] },
  "cardCreateApi": {
    "tool": "create_card",
    "assignAtCreate": { "idLabels": "...", "idMembers": "..." },
    "resolveLabel": "Lookup labels[] by exact name",
    "resolveMember": "\"me\" → MCP trello_get_member at 5.2.5; else members[] by username or fullName"
  },
  "agentHints": {
    "labelsFromPath": { "apps/api": "api", "apps/web": "web" },
    "labelsFromPlanKeywords": { "firebase": "database", "test": "tests" }
  },
  "mcpRefresh": {
    "boards": "trello_get_user_boards",
    "lists": "get_lists",
    "labels": "trello_get_board_labels",
    "members": "trello_get_board_members",
    "resolveMe": "trello_get_member(memberId: \"me\") — runtime at publish; never persist in file"
  }
}
```

**If `.trello.json` is missing or `board.id` is null:**

1. `trello_get_user_boards` (`filter: "open"`) — present board names, ask which board.
2. `get_lists` with `boardId` — present list names (default **Backlog** if it exists).
3. `trello_get_board_labels` — merge **named** labels only into config (skip `name: ""` stubs).
4. `trello_get_board_members` — fill `members[]` only (board roster, not the active token user).
5. Offer to write or update `.trello.json` with resolved IDs — **never** write `currentUser` into the file.

**Never ask for 24-char IDs directly** — resolve from names via MCP.

**Refreshing config** when the board changed in Trello UI — run tools in `mcpRefresh` for the active `board.id` and offer to merge into `.trello.json` (preserve `board` / `defaultList` choices unless the user asks to switch).

**MCP server:** `atlassian-trello-mcp` (see setup above); env `TRELLO_API_KEY` + `TRELLO_TOKEN`.

---

## Resolve labels and member (Phase 5.2.5)

**Run before** the preview (Phase 5.2) so resolved values appear in the confirmation block.

1. Start from `cardDefaults.labels` (label **names**).
2. Add labels inferred from file map / plan keywords via `agentHints` (names only).
3. Add labels from the generic card **LABELS** block when each name exists in `labels[]` (exact match).
4. For each name → `labels[].id`; build `idLabels: string[]` (dedupe).
5. Resolve member:
   - `"me"` → `trello_get_member({ memberId: "me" })` → use returned `id` (and show `fullName` / `username` in preview)
   - explicit `username` or `fullName` → `members[].id` (exact match)
   - omit / `null` → no `idMembers`
     User override in preview **e** flow wins.
6. Emit **LABELS / MEMBER (resolved)** in the conversational wrapper — not inside paste-only card body.

```
LABELS (resolved):
  api        → 6a14effeaf06fb6dd4402fdc
  web        → 6a14ff2dad5a9c7eff5c68c3
MEMBER (resolved):
  [fullName] (me, token atual) → [id from trello_get_member]
```

If a label name is missing from `labels[]` → **do not** add to `idLabels`; list it under **omitidas** (optional: offer `trello_create_label` only on explicit user request).

If `member` is set but not found in `members[]` → **stop**; list valid usernames.
