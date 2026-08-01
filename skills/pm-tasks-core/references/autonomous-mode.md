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
      "task.move",
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

## Continuous operation across multi-task loops

Autonomous mode is **stateful** when the controlling agent is executing a plan with multiple tasks (subagent-driven-development, executing-plans, manual TDD loops, etc.). Each task transition in code MUST be mirrored on the PM tool in real time — same session, NOT batched at the end of the loop.

This is the single most common misinterpretation of autonomous mode: treating it as a one-shot publish flag instead of an ongoing posture. The allowlist verbs (`checklist.check`, `task.close`, `task.comment.add`) exist precisely so the loop can keep the PM tool in sync as it goes.

### Per-task lifecycle (mandatory)

For each task the controller works on, in order:

1. **Start**: `task.move(cardId, "wip")` — move the card from the open/backlog list to the in-progress list. This must be the first PM-tool call when work begins on a task.
2. **Per step**: `checklist.check` the matching checklist item as soon as that step is verified complete. Do NOT wait for the whole task to finish.
3. **On completion**:
   - `task.move(cardId, "done")` — reposition the card to the done/close list first, so the visual transition is immediately visible.
   - `task.comment.add` with the commit SHA: `🤖 [agent] Task complete. Commit: <SHA>. <branch>.`
   - `task.close` — sets the completion flag (`dueComplete: true` on Trello, `completed: true` on Asana). `task.move` and `task.close` are kept separate because some adapters implement the visual transition (section change) independently from the closed-flag.
4. **On failure / blocker**: `task.comment.add` with the failure mode. If `defaults.escalateToAlias` is set, `task.assignee.add` (or equivalent) adds the human as collaborator/follower. Do NOT call `task.move(_, "done")` or `task.close` — leave the card in WIP with the escalation visible.

### Anti-patterns

NEVER:

- Leave cards in `backlog` while the code work is in progress (humans lose visibility into what's running).
- Skip the per-step `checklist.check` and only mark "Steps" complete at the end (the audit log on disk has the data, but the PM tool — which is what the human watches — looks frozen).
- Skip the per-task commit-SHA comment (breaks the human's ability to map cards ↔ commits in their PM tool).
- Batch all moves into a final sweep after the loop completes (defeats the purpose of running autonomously, masks failures until everything is "done").

### Why this matters

Humans use the PM tool — Trello, Asana, Jira, etc. — to monitor progress in real time. If the autonomous loop batches state at end-of-loop, the human has no visibility into:

- which task is currently running
- whether a long task is making progress vs hanging
- whether to escalate, intervene, or kill the run
- which commits correspond to which task

The disk audit log captures everything programmatically, but a human checking Trello at minute 30 of a 90-minute autonomous run needs to see real-time card movement. **The PM tool IS the human's audit log.** The disk file is the agent's audit log; both must be kept in sync.

### Quick checklist before claiming autonomous compliance

Before reporting a task complete in an autonomous loop:

- [ ] `task.move(cardId, "wip")` called when work started (not after)
- [ ] Each implementation step was marked done via `checklist.check` as it completed (not at the end)
- [ ] `task.move(cardId, "done")` called before `task.close` on completion
- [ ] A comment with the commit SHA was posted on completion
- [ ] `task.close` called to set the completion flag
- [ ] On failure: comment + escalation, no `task.move(_, "done")`, no `task.close`

If any of the above is "no" for a given task, the autonomous mode contract was not honored for that task.

## Failure handling

Any failure → structured envelope. Skill does NOT auto-retry. Caller decides retry/abort/escalate. If the verb supports `clientToken`, caller can safely retry the exact same call (will be deduped).

## Forensics

The audit log is the source of truth for "what happened in this autonomous session". Also serves as the lookup index for `taskRef` step 4–5 in [`crud-vocabulary.md`](crud-vocabulary.md). Agent-authored free-text (commit/PR/comment copy) uses the configured `locale`; task content uses the plan's language.
