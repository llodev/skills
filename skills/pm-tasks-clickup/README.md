<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-clickup

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-clickup?color=blue)](https://www.npmjs.com/package/@llodev/pm-tasks-clickup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ClickUp adapter for the `@llodev/pm-tasks-*` family. Publishes plans as ClickUp tasks with subtasks and runs nine CRUD verbs on existing tasks through the ClickUp MCP. It works for a manager publishing a plan, a team member publishing or updating tasks, and an AI agent executing a plan autonomously, with the same verbs.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm install @llodev/pm-tasks-clickup @llodev/pm-tasks-core
# or
pnpm add @llodev/pm-tasks-clickup @llodev/pm-tasks-core

# Vercel CLI (install core manually too)
npx skills add llodev/skills/skills/pm-tasks-core
npx skills add llodev/skills/skills/pm-tasks-clickup
```

## Set up the MCP

The runtime verbs go through the ClickUp MCP server at `https://mcp.clickup.com/mcp`. The MCP handles OAuth: the adapter never sees a credential for the verbs.

- Agents that accept a remote MCP URL (Cursor, Windsurf, Cline, Roo Code and others): add an MCP entry named `clickup` pointing at `https://mcp.clickup.com/mcp`, then approve the OAuth flow in your browser.
- Agents that run MCP servers as local commands: bridge it with `mcp-remote`:

```json
{
  "mcpServers": {
    "clickup": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.clickup.com/mcp"] }
  }
}
```

The tools appear as `clickup_*` (your agent may add a server prefix).

## Set up the config

`init` discovers your workspace, lists and statuses, and writes `.clickup.json`. Discovery is read-only: nothing is written to ClickUp. There are two ways to run it.

**(a) In a terminal, with a personal API token.** Create the token in ClickUp → Settings → Apps → API Token, put it in your environment, then run init:

```bash
export CLICKUP_API_TOKEN=<your personal token>
npx @llodev/pm-tasks-clickup init
```

The prompts pick the narration locale, the workspace (only when you have several), the lists to use, the in-progress (`wip`) status of each list, an optional member cache, an estimation strategy and an optional autonomous block. The file goes to `./.clickup.json`, or to `--output <path>`. If the file exists, you are asked before it is overwritten.

**(b) Inside an agent session with the ClickUp MCP connected.** Without a token the CLI stops and asks you to run init inside an agent session. That means: ask the agent to set up `.clickup.json`. The agent reads the hierarchy, each list's statuses and the members through the MCP, asks you to pick the lists and each list's `wip` status, writes the file following `schemas/config.json`, then runs the doctor.

## Verbs

| Verb                | What it does in ClickUp                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `task.create`       | Creates a task in a list (name, Markdown description, tags, priority, due date, initial status by name)         |
| `task.move`         | Changes the status to the list's pinned `open`, `wip` or `done`; or moves a root task to another list by its id |
| `checklist.check`   | Completes or reopens a checklist item, which is a subtask (`done` / `open` status)                              |
| `task.close`        | Sets the list's pinned `done` status; a task already done or cancelled is left alone                            |
| `task.due-date.set` | Sets the due date (a calendar day, `YYYY-MM-DD`)                                                                |
| `task.assignee.add` | Adds an assignee (id, `"me"`, email or username) and keeps the current ones                                     |
| `task.comment.add`  | Posts a comment; with an idempotency token it is posted once                                                    |
| `task.parent.set`   | Makes the task a subtask of another task (ClickUp moves it into the parent's list)                              |
| `task.estimate.set` | Records effort: native time estimate on leaf tasks, plus an `est:` tag                                          |

When nothing needs to change, `task.move` and `checklist.check` answer `ALREADY_IN_STATE`, which means "nothing to do", not an error. The other verbs answer `ok: true` without writing.

## Modes

| Mode           | When                                                     | What happens                                                                                       |
| -------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Paste-ready    | No MCP connected                                         | A Markdown description with the checklist as `- [ ]` lines, ready to paste into ClickUp            |
| MCP publish    | MCP connected and `.clickup.json` present                | Preview, approval, then the task and one subtask per checklist item                                |
| Autonomous     | `[autonomous]` / `--auto` and `autonomous.enabled: true` | Writes without per-action approval, within `autonomous.allow` and `autonomous.scope.lists`         |
| Plan-execution | A plan file or slug plus `.clickup.json`                 | Finds the plan's open tasks in the configured lists and keeps their status in sync as work goes on |

## Use

| Prompt example                                                    | What the agent does                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `"publish this plan to ClickUp"`                                  | MCP publish: task plus subtasks, after your approval                                                          |
| `"move the login task to in progress"`                            | `task.move` to the list's pinned `wip` status                                                                 |
| `"check the 'write tests' subtask"`                               | `checklist.check` on that subtask                                                                             |
| `"close the login task"`                                          | `task.close` (pinned `done` status)                                                                           |
| `"due date of the login task: next Friday"`                       | `task.due-date.set`, with "next Friday" taken from ClickUp's clock                                            |
| `"assign me to the login task"`                                   | `task.assignee.add` with `"me"`                                                                               |
| `"estimate the login task at 3 ideal hours"`                      | `task.estimate.set` (`ideal_hours`, task without subtasks: `time_estimate` 180 minutes + `est:3-ideal-hours`) |
| `"[autonomous] execute docs/plans/X.md and keep ClickUp in sync"` | Autonomous plan execution (requires `autonomous.enabled: true`)                                               |

## Config reference

```jsonc
{
  "version": "1",
  "locale": "en-US", // narration language: en-US, pt-BR or es-ES
  "workspace": { "id": "<workspace_id>", "name": "<workspace name>" },
  "lists": [
    {
      "id": "<list_id>",
      "name": "Backlog",
      "space": "<space name>",
      "statuses": {
        "open": "to do",
        "wip": "in progress",
        "done": "complete",
        "closed": "cancelled",
      },
    },
  ],
  "defaultListId": "<list_id>",
  "members": [{ "id": "<user_id>", "name": "<name>", "alias": "<alias>" }], // optional cache
  "estimation": {
    "enabled": true,
    "strategy": "ideal_hours",
    "clickupTarget": "time",
    "hoursPerDay": 6,
  },
  "defaults": { "assigneeAlias": "me", "escalateToAlias": "<alias>" },
  "autonomous": {
    "enabled": false,
    "allow": ["task.create", "task.move", "checklist.check", "task.close", "task.comment.add"],
    "scope": { "lists": ["<list_id>"] },
    "rateLimit": { "writesPerMinute": 30, "commentsPerMinute": 10 },
    "auditLog": "./logs/clickup/audit.log",
  },
}
```

| Field              | Meaning                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lists[].statuses` | Status names pinned per list by role. `open` and `done` are required; `wip` is your pick; `closed` is the `closed`-type status when it differs from `done` |
| `defaultListId`    | Where new tasks go when no list is named                                                                                                                   |
| `members`          | Optional cache with unique `alias` values; assignment also works without it                                                                                |
| `estimation`       | Optional. Absent or `enabled: false` → `task.estimate.set` is not applicable                                                                               |
| `defaults`         | `"me"` or a `members[].alias`                                                                                                                              |
| `autonomous`       | `init` writes `enabled: false`; set it to `true` yourself when you want the agent to write without asking                                                  |
| `attribution`      | Optional opt-in block from `@llodev/pm-tasks-core` that stamps agent identity on descriptions and comments                                                 |

No credential is ever stored in this file.

## Doctor

```bash
npx @llodev/pm-tasks-clickup init --doctor
```

Runs the shared pm-tasks checks plus the ClickUp checks: config present, workspace id, every list pins `open` and `done`, estimation coherent, autonomous scope and default aliases resolve. With `CLICKUP_API_TOKEN` set it also checks live that the workspace is reachable and that every pinned status still exists in its list (a status renamed or deleted in ClickUp shows up here, with the list and role to fix). Without a token the live checks are skipped with a note. Flags: `--json`, `--fix-hints-only`, `--config <path>`.

## ClickUp-specific notes

**Statuses are pinned, not guessed.** ClickUp statuses belong to each list and carry a type (`open`, `custom`, `done`, `closed`), but no type means "in progress", so you choose `wip` per list at `init`. Localized and custom names work. If you rename a status later, run the doctor, then `init` again.

**Checklist items are subtasks.** The ClickUp MCP cannot write native checklists, so each checklist item becomes a subtask, and checking an item sets the subtask's `done` status.

**Assignees are added, never replaced.** ClickUp's update replaces the whole assignee list; the adapter reads the current assignees and writes them back together with the new one.

**Estimates do not double count.** The native time estimate is written only on tasks without subtasks, because ClickUp can roll subtask estimates up into the parent. The `est:` tag is always written, and exactly one remains.

**Dates are calendar days in the account's timezone.** Relative dates are computed from ClickUp's clock, not the agent's. The due date stays the plan at close; completion is the `done` status.

**Person or agent account, same behavior.** `"me"` is whoever the MCP is signed in as. A dedicated agent account for autonomous runs is an option, not a requirement.

**Plan limits come from ClickUp, not from the adapter.** ClickUp limits some features by plan: usage caps per feature, and ClickApps (such as Tasks in Multiple Lists or Sprints) that a workspace admin must enable. The adapter does not know your plan's limits, and they can change, so check them for your plan before relying on a verb. When ClickUp refuses a call for plan reasons, the verb fails with ClickUp's own error text (for example `Your plan is limited to … usages of feature`). The cause is the account, not your config.

## Known limitations

- No sprint verb. The ClickUp MCP has no sprint action. A sprint is a list, and the only way to place a task in a second list is the MCP's `clickup_add_task_to_list`, which needs the Tasks in Multiple Lists ClickApp and a plan that allows it. The MCP's task read also has no field for a task's extra lists, so an assignment could not be read back. `task.move` with the sprint list id moves a root task there, but the task leaves its home list, and status changes on it fail until you register that list with `init`.
- Native ClickUp checklists can be read but not written.
- A due date cannot be cleared through the adapter.
- A subtask cannot be detached from its parent through the MCP.
- If a pinned `done` status was renamed in ClickUp, unchecking a subtask reports "nothing to do"; run the doctor.
- ClickUp has no conditional update, so a change made between the adapter's read and its write is not detected.
- Comment idempotency looks at the first page of comments only.
- `init` discovers only non-archived spaces, folders and lists.
- Rate limits depend on your ClickUp plan.

## Security

`CLICKUP_API_TOKEN` is used only by `init` and the doctor, read only from the environment, and only for read-only discovery. Never paste it into a chat, an issue, a commit or `.clickup.json`. The verbs use the MCP's OAuth, not the token.

## Documentation

- [`SKILL.md`](SKILL.md): the full skill (routing, ClickUp model, all phases, verbs, result envelope)
- [`references/operations.md`](references/operations.md): verb → MCP tool mapping, results, error reasons, idempotency
- [`references/estimation.md`](references/estimation.md): strategies, leaf-only estimate, `est:` tag
- [`references/autonomous.md`](references/autonomous.md): autonomous allowlist, scope and audit log
- [`anti-patterns/clickup.md`](anti-patterns/clickup.md): NEVER rules for ClickUp
- [`schemas/config.json`](schemas/config.json): the `.clickup.json` schema

## License

MIT
