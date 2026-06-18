---
name: pm-tasks-core
description: >-
  Core extraction + vocabulary for the @llodev/pm-tasks-* family. Use when
  working with any pm-tasks-<tool> adapter (Trello, Asana, etc.) — provides
  Phases 1–3 (identify input, extract structure, build the generic card) plus
  the canonical CRUD vocabulary (task.create, checklist.check, task.close,
  task.due-date.set, task.assignee.add, task.comment.add) consumed by adapters.
  Also defines autonomous-mode contract (sentinels, allowlist, scope, audit log)
  and the shared init UX. Triggered indirectly by any prompt that an adapter
  handles (e.g. "create Trello card", "publish plan to Asana", "[autonomous]
  create task"). Do NOT activate alone — it has no tool-specific formatting.
license: MIT
metadata:
  version: 1.6.0
  tags:
    - agent-skill
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: core
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# pm-tasks-core

Shared core for all `pm-tasks-<tool>` adapters. Defines the extraction phases, the generic-card structure, the CRUD vocabulary, the autonomous-mode contract, the configuration lookup rules, and the audit-log format. Adapters reference this skill by path — no formal dependency mechanism in the spec.

## Routing

Adapters invoke this skill BEFORE applying their tool-specific formatting. The exact pointer is documented in [`references/contract.md`](references/contract.md).

## Phases

| Phase | Purpose                                                      | Reference                                                  |
| ----- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 1     | Identify the input (plan file vs inline paste vs implicit)   | [`references/contract.md`](references/contract.md) § 1     |
| 2     | Extract sections by intent (goal, prereqs, tasks, done-when) | [`references/contract.md`](references/contract.md) § 2     |
| 2.5   | Anti-patterns gate                                           | [`anti-patterns/core.md`](anti-patterns/core.md)           |
| 3     | Build the generic card                                       | [`references/generic-card.md`](references/generic-card.md) |

Adapters then execute Phases 4+ per their own SKILL.md.

## CRUD vocabulary (verbs adapters implement)

See [`references/crud-vocabulary.md`](references/crud-vocabulary.md). Six verbs, all idempotent (with `clientToken` rules for non-natural cases).

## Autonomous mode

See [`references/autonomous-mode.md`](references/autonomous-mode.md). Activated only by sentinel `[autonomous]` / `--auto` / env `LLODEV_PM_TASKS_AUTONOMOUS=1`. Requires explicit allowlist + scope + rate limit in the tool's config. Never inferred.

## Configuration

Lookup order: `<git-root>/.<tool>.json` → `~/.config/llodev/pm-tasks/<tool>.json` → abort. Secrets NEVER in JSON (env vars / OS keychain only).

## Audit log

Append-only JSONL at `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. Schema in [`references/audit-log-format.md`](references/audit-log-format.md). Doubles as the lookup index for `<task-ref>` resolution.

## Init helper

Adapters expose `npx @llodev/pm-tasks-<tool> init`. Shared UX in [`references/init-ux.md`](references/init-ux.md). Implementation library at `@llodev/pm-tasks-core/init-lib` (TypeScript source under `./src/init-lib.ts`; compiled to `./dist/init-lib.js`).

## Standalone fallback

This skill is not useful without an adapter. If activated alone, tell the user to install at least one `pm-tasks-<tool>` package.
