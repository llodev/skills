# Linear autonomous mode overlay (v1)

Linear-specific overlay on the core autonomous-mode contract. Authoritative base contract: [`../../pm-tasks-core/references/autonomous-mode.md`](../../pm-tasks-core/references/autonomous-mode.md).

## Scope

The `autonomous.scope` block in `.linear.json` defines what the agent is allowed to touch without per-action confirmation:

```jsonc
{
  "autonomous": {
    "enabled": false, // must be explicitly true to activate
    "allow": [
      // verb allowlist (all 10 supported)
      "task.create",
      "task.move",
      "checklist.check",
      "task.close",
      "task.due-date.set",
      "task.assignee.add",
      "task.comment.add",
      "task.parent.set",
      "task.estimate.set",
      "task.sprint.set",
    ],
    "scope": {
      "teams": ["<teamId>"], // restrict writes to these team ids
      "projects": [], // optional project id filter
    },
    "rateLimit": {
      "writesPerMinute": 30,
      "commentsPerMinute": 10,
    },
    "auditLog": "./logs/linear/audit.log",
  },
}
```

## Activation

Three signals activate autonomous mode (checked in order):

1. `[autonomous]` sentinel anywhere in the user message.
2. `--auto` flag on the invocation.
3. `autonomous.enabled: true` in `.linear.json` with the calling agent providing a plan reference.

All three require `autonomous.enabled: true` in config. The gate is a hard block — no bypass.

## Allowlist gate

Every verb invocation is checked against `autonomous.allow[]`. If the verb is not in the allowlist, the transport returns `UNSUPPORTED_VERB` (not an error — a policy rejection). The calling agent must handle this and prompt the user.

Hard-coded forbidden verbs (never autonomous, regardless of allowlist): none in v1 — all 10 verbs are gated only by the allowlist. The core contract may add hard-coded forbidden verbs in future versions.

## Linear scope rules

- `autonomous.scope.teams` must contain the `team.id` from `.linear.json`. If the team id in the write request does not match any scope team, the transport returns `INVALID_REQUEST` with `{ reason: "out_of_scope" }`.
- `autonomous.scope.projects` is optional. When present, the target project must match. When absent, all projects in the scoped teams are accessible.
- State transitions must use types reachable in the team's workflow (`config.states[]` is the type allowlist). Targeting a type not present in `config.states[]` returns `INVALID_REQUEST`.

## Audit log

Every autonomous verb invocation emits a structured log entry per [`../../pm-tasks-core/references/audit-log-format.md`](../../pm-tasks-core/references/audit-log-format.md). The `auditLog` path defaults to `./logs/linear/audit.log` (relative to config file location) and is created on first write.

## Write-through flow

In autonomous mode:

1. Skip Phase 5 preview & approval.
2. Run allowlist + scope + rate-limit checks (synchronous, before any MCP call).
3. Call Linear MCP write tool.
4. Emit structured audit log entry.
5. Return core result envelope (JSON, not human-formatted) to the calling agent.

Attribution (if enabled) uses `autonomousCommentPrefix` instead of `commentPrefix` — see [`../../pm-tasks-core/references/attribution.md`](../../pm-tasks-core/references/attribution.md).
