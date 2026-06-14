# Autonomous mode

Operations executed without a human reviewing each step. Designed for invocation by AI agents during task execution.

## Activation (three signals)

1. **Prompt sentinel** — caller includes `[autonomous]` or `--auto` literally.
2. **Env var** — `LLODEV_PM_TASKS_AUTONOMOUS=1` (for CI / cron).
3. **Never inferred.** Without sentinel or env, preview + human approval is mandatory.

## Allowlist gate (in tool config)

Autonomous mode requires an `autonomous` block in `.<tool>.json` (or its global counterpart):

```json
{
  "autonomous": {
    "enabled": true,
    "allow": [
      "task.create",
      "checklist.check",
      "task.close",
      "task.due-date.set",
      "task.assignee.add",
      "task.comment.add"
    ],
    "scope": {
      "boards": ["<board-or-project-id>"],
      "lists": ["<list-or-section-id>"]
    },
    "rateLimit": { "writesPerMinute": 30, "commentsPerMinute": 10 },
    "auditLog": "~/.local/share/llodev/pm-tasks/<tool>/audit.log"
  }
}
```

Block missing OR `enabled: false` → autonomous aborts with `{ ok: false, code: "INVALID_CONFIG" }`.
Verb not in `allow` → `{ code: "ALLOWLIST_VIOLATION" }`.
Target outside `scope` → `{ code: "OUT_OF_SCOPE" }`.
Rate exceeded → `{ code: "RATE_LIMITED" }`.

## Hard-coded forbidden verbs (v1)

Regardless of allowlist:

- `task.delete`, `task.archive`
- `task.rename`
- `task.description.replace`
- `task.assignee.remove`, any `member.remove`
- Any operation outside `scope`

Returns `{ code: "FORBIDDEN_VERB" }` without touching MCP.

## Write-through flow

- Skip Phase 5.x preview & approval.
- Run allowlist + scope + rate-limit checks.
- Call MCP write tool.
- Emit structured envelope to caller (JSON, not human-formatted).
- Append entry to audit log per [`audit-log-format.md`](audit-log-format.md).

## Failure handling

Any failure → structured envelope. Skill does NOT auto-retry. Caller decides retry/abort/escalate. If the verb supports `clientToken`, caller can safely retry the exact same call (will be deduped).

## Forensics

The audit log is the source of truth for "what happened in this autonomous session". Also serves as the lookup index for `taskRef` step 4–5 in [`crud-vocabulary.md`](crud-vocabulary.md).
