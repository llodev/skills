# ClickUp autonomous mode overlay

ClickUp-specific overlay on the core autonomous-mode contract. Base contract: [`../../pm-tasks-core/references/autonomous-mode.md`](../../pm-tasks-core/references/autonomous-mode.md).

## The block

```jsonc
{
  "autonomous": {
    "enabled": false, // init writes false on purpose; must be explicitly true to activate
    "allow": [
      // verb allowlist: a subset of the nine manifest verbs
      "task.create",
      "task.move",
      "checklist.check",
      "task.close",
      "task.due-date.set",
      "task.assignee.add",
      "task.comment.add",
      "task.parent.set",
      "task.estimate.set",
    ],
    "scope": {
      "lists": ["<listId>"], // writes allowed only in these list ids (each must be in lists[])
    },
    "rateLimit": { "writesPerMinute": 30, "commentsPerMinute": 10 },
    "auditLog": "./logs/clickup/audit.log",
  },
}
```

`init` writes this block only when the user asks for it, with `allow` = every manifest verb, `scope.lists` = the chosen lists and `enabled: false`.

## Activation

Autonomous mode needs **both**:

1. A signal: the `[autonomous]` sentinel or the `--auto` flag in the request (or `LLODEV_PM_TASKS_AUTONOMOUS=1` for CI and cron).
2. `autonomous.enabled === true` in `.clickup.json`.

Block missing or `enabled` not `true` → do not write; report `INVALID_CONFIG` and ask the human. Never infer autonomous mode.

## Who enforces what

The transport cannot know whether a call is autonomous, so it enforces none of the policy. You do, before every write:

| Rule                                                                            | Enforced by                                                                               | Checked statically by                            |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Verb in `autonomous.allow`                                                      | You → `ALLOWLIST_VIOLATION`                                                               | doctor C-CFG-2 (`allow` ⊆ manifest verbs)        |
| Home list in `scope.lists`                                                      | You → `OUT_OF_SCOPE`                                                                      | doctor C-CFG-3, C-CLK-6 (scope ids in `lists[]`) |
| Home list in `lists[]` at all                                                   | The transport, for `task.move` / `checklist.check` / `task.close` (`list_not_configured`) | none (a task's list is known only at runtime)    |
| `rateLimit`                                                                     | You → `RATE_LIMITED`                                                                      | none                                             |
| Forbidden verbs (delete, archive, rename, description replace, assignee remove) | Not in this adapter's manifest at all                                                     | n/a                                              |

## Knowing a task's home list

Scope is about the list a task lives in, and only `clickup_get_task` tells you that (`list.id`). Skip the extra read only when the list is already known from a scoped source:

- you created the task in a scoped list in this run;
- the plan-execution lister returned it (it scans only `scope.lists`, else `lists[]`);
- you just read it with `clickup_get_task`.

Watch the verbs that change the home list: `task.move` with a list id and `task.parent.set` (ClickUp moves the child into the parent's list). The destination must be in `scope.lists` too, or the next verb on that task is out of scope.

## Identity

The adapter behaves the same whether the MCP is authenticated as a person or as an AI-agent account: `"me"` is whoever is authenticated. A dedicated agent account makes autonomous writes easy to tell apart in ClickUp's activity, but it is an option, not a requirement.

## Escalation

On failure or a blocker: `task.comment.add` with the failure mode, then `task.assignee.add` with the member that `defaults.escalateToAlias` names (`"me"` or a `members[].alias`; map the alias to `members[].id` first). The union write keeps the current assignees. Leave the task in `wip`: no `task.move(_, "done")`, no `task.close`.

## Audit log

When verbs go through the runtime (`createAdapter`), core appends one JSONL entry per verb to `$LLODEV_PM_TASKS_LOG_DIR/clickup/audit.log`, else `$XDG_DATA_HOME/llodev/pm-tasks/clickup/audit.log`, else `~/.local/share/llodev/pm-tasks/clickup/audit.log`. `autonomous.auditLog` does not change that path. Direct MCP calls you make yourself (subtasks in Phase 5, start dates, lookups) are not logged by the runtime: log them per [`../../pm-tasks-core/references/audit-log-format.md`](../../pm-tasks-core/references/audit-log-format.md).

## Write-through flow

1. Skip the Phase 5 preview and approval.
2. Check activation, allowlist, scope and rate limit (before any MCP call).
3. Call the verb.
4. Treat `ALREADY_IN_STATE` as done, not as a failure.
5. Return the core result envelope (JSON) to the calling agent.

Attribution, when enabled, uses `autonomousCommentPrefix` instead of `commentPrefix`; see [`../../pm-tasks-core/references/attribution.md`](../../pm-tasks-core/references/attribution.md).
