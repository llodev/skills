---
"@llodev/pm-tasks-core": minor
"@llodev/pm-tasks-asana": minor
"@llodev/pm-tasks-trello": minor
---

**pm-tasks v1.9.0 — Headless runtime + Plan-execution mode (Option E)**

Three coordinated minor bumps shipping the agent-agnostic headless runtime
and the F15 plan-execution mode. Skill-driven flows are unchanged; this
release adds a programmatic entry point and a new mode the calling agent
can opt into when it has a plan file to execute.

**`@llodev/pm-tasks-core@1.8.0 → 1.9.0`** (minor)

- New: `@llodev/pm-tasks-core/runtime` subpath exposes `createCoreRuntime`,
  the `Transport` interface, 7 verb handlers, `RuntimeContext`, and the
  full set of request/response types. Pure: no MCP imports, no transport
  implementation — adapters provide the wiring.
- New: `@llodev/pm-tasks-core/plan-execution` module exports
  `requireConfig` + `ConfigRequiredError`, `discoverPlanTasks` +
  `resolvePlanRef` + `parseH3Titles` + `filenameToSlug` (discovery
  helpers — `PlanRef` accepts `string[]` titles, a `.md` path with H3
  parsing, or a bare slug), `onTaskStart` + `onTaskComplete` (boundary
  hooks with best-effort dispatch, `ALREADY_IN_STATE` → skipped
  classification, process-local idempotency memo keyed by
  `${taskId}|${commitSha}`), and `__resetHookCacheForTests` (test escape
  hatch).
- New: `pm-tasks-core/references/plan-execution.md` documents the full
  contract (triggers, discovery semantics, hook classification table,
  failure modes, `ConfigRequiredError` shape).
- New: `pm-tasks-core/references/agent-agnostic-lint.md` + a stand-alone
  `scripts/checks/agent-agnostic-lint.mjs` that bans `superpowers`,
  `sdd`, `Claude Code`, `Claude-only`, `Claude assumes` in SKILL body
  content while allowlisting `claude-code` in `compatibility.agents`
  frontmatter, vendor product names (`claude.ai Asana`,
  `claude-ai-asana-mcp`), and other context-aware exemptions.
- Internal: tarball size budget raised 14.1 → 18.5 kB across Phase 4
  and Phase 5 (covering the plan-execution module + hook helpers + full
  JSDoc on every exported symbol).

**`@llodev/pm-tasks-asana@1.5.0 → 1.6.0`** (minor)

- New: `@llodev/pm-tasks-asana/adapter` subpath exposes
  `createAdapter({ configPath, mcp, session?, language? })` returning a
  `Runtime`. The `mcp: McpCaller` callback is the caller's only
  obligation — receives a fully-qualified `mcp__claude_ai_Asana__*` tool
  name + args object, returns the MCP server's raw response.
- New: `pm-tasks-asana/src/transport-asana.ts` implements the
  `Transport` interface against `mcp__claude_ai_Asana__*` tools.
  Asana-specific deltas: `closeListOrSectionId` ignored at the transport
  layer (Asana has no list-on-close concept), ISO-8601 → `YYYY-MM-DD`
  conversion via `isoToDueOn` helper for `taskDueDateSet`,
  `INVALID_REQUEST` short-circuit BEFORE the MCP call on malformed
  `dueAt`, single-assignee model for `taskAssigneeAdd`.
- SKILL.md routing table gained a Plan-execution row; Phase 7 narrative
  section forward-references the new `references/plan-execution.md`
  doc in `pm-tasks-core`.

**`@llodev/pm-tasks-trello@1.5.0 → 1.6.0`** (minor)

- New: `@llodev/pm-tasks-trello/adapter` subpath exposes
  `createAdapter({ configPath, mcp, session?, language? })` returning a
  `Runtime`. Same shape and contract as the Asana adapter.
- New: `pm-tasks-trello/src/transport-trello.ts` implements the
  `Transport` interface against `mcp__trello__*` tools. Trello-specific
  behavior: `taskClose` archives the card AND optionally moves it to
  `closeListOrSectionId` when provided (Trello's "Done" list pattern).
- SKILL.md routing table gained a Plan-execution row mirroring the
  Asana adapter; identical Phase 7 narrative section.

**Skill-judge gate**

Modified `pm-tasks-asana/SKILL.md` and `pm-tasks-trello/SKILL.md`
(Phase 4.3) added the Plan-execution mode routing row + Phase 7 section.
Measured drift sits within the documented noise band ([-2, +2]); the
agent-agnostic-lint rule shipped in this release codifies the
allowlist that earlier scoring assumed. If drift is within tolerance,
bypass with `SKIP_SKILL_JUDGE_GATE=1 make release-version`.

**Breaking changes**

None. All Phase 1-5 additions are pure surface area additions:

- `/runtime` and `/adapter` subpaths are NEW exports (no prior consumers)
- `/plan-execution` helpers are NEW exports
- Existing skill-driven flows + the 7-verb CRUD contract on the autonomous
  path are unchanged

**Migration**

No migration needed. Existing consumers continue to import from the
package root. New code can opt into the runtime by importing from
`@llodev/pm-tasks-{trello,asana}/adapter` or the helpers from
`@llodev/pm-tasks-core/runtime` and `@llodev/pm-tasks-core/plan-execution`.
