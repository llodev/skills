# Design — `pm-tasks-*` skill family

**Status**: approved for implementation
**Date**: 2026-06-11
**Author**: lloliveiradev (`llodev` org)
**Supersedes**: `~/.claude/skills/plan-to-task-cards/` (single skill, Trello/Asana/Jira)

---

## 1. Purpose

Refactor and republish the existing `plan-to-task-cards` skill as a family of agent skills under the `llodev` GitHub org and `@llodev` npm scope, covering 9 PM tools, with a clean separation between a shared core and per-tool adapters, plus a guarded autonomous mode usable by AI agents during execution.

### 1.1 Why now

- Current skill is monolithic and hardcoded for 3 tools — does not scale to 9.
- User wants the skill to be invokable by *other* agents during task execution (not only by a human), with safety guardrails.
- Publication strategy needed to expose work to the broader agent-skills ecosystem (Vercel `skills.sh`, npm, Claude Code marketplace).

### 1.2 Non-goals

- Building a SaaS or hosted product. Everything is open-source skill packages.
- Replacing native PM tool UIs.
- Custom dashboards/analytics. Audit log is JSONL for grep/jq; no UI on top.

---

## 2. Scope

### 2.1 v1 focus packages (deep implementation)

- `@llodev/pm-tasks-core` — extraction + contract + autonomous-mode policy.
- `@llodev/pm-tasks-trello` — full paste + MCP publish + 6 CRUD verbs.
- `@llodev/pm-tasks-asana` — full paste + MCP publish + 6 CRUD verbs.

The user already uses the existing `plan-to-task-cards` daily with Trello and Asana — these adapters port the proven Phases/MCP flow and add the new CRUD vocabulary and autonomous mode.

### 2.2 v1 scaffolds (structure only — NOT published)

`pm-tasks-{jira,linear,notion,clickup,monday,bitrix24,todoist}` — scaffolded with:

- Directory layout per § 4.2.
- `package.json` with `"private": true` reserving the npm name in the repo but blocking accidental publish.
- `SKILL.md` placeholder marked `status: scaffold` in frontmatter; description explicitly says "not implemented yet".
- README listing required MCP integration before publication.

**Not published anywhere in v1**: not in npm, not in `marketplace.json`, not advertised on `skills.sh`. They exist only in the monorepo as future placeholders.

Promotion criterion: an adapter graduates from scaffold to public when (a) MCP exists for the tool, (b) all 6 v1 verbs are implemented + tested against a real workspace, (c) `init` helper supports both scaffold and MCP-assisted paths. Promotion = drop `"private": true` from `package.json`, add entry to `marketplace.json`, ship a normal release via Changesets.

### 2.3 v1 CRUD vocabulary (canonical)

Six verbs, mapped per-adapter:

| Verb | Description |
|---|---|
| `task.create` | Create a new task/card/issue from a generic-card spec. |
| `checklist.check` | Mark a checklist item / subtask as complete. |
| `task.close` | Close / move to done. |
| `task.due-date.set` | Set or change due date. |
| `task.assignee.add` | Add an assignee/member (never remove in v1). |
| `task.comment.add` | Post a comment / note / story. |

### 2.4 Out of scope for v1

- `task.delete`, `task.archive`, `task.rename`, `task.description.replace`, `task.assignee.remove`, any member removal.
- Edit operations (`task.field.update`) — deferred to v2 with stricter guards.
- Bidirectional sync (PM tool → plan file). One-way only: plan → tool.

---

## 3. Repo & publication strategy

### 3.1 Single aggregator repo

`github.com/llodev/skills` (created). One repo, 10 packages (core + 9 adapters), each with its own release cadence and semver.

```
github.com/llodev/skills
├── .claude-plugin/marketplace.json          (Trilho C — Claude Code)
├── .changeset/                              (Changesets metadata)
├── .github/workflows/
│   ├── validate.yml
│   ├── contract-check.yml
│   ├── secrets-scan.yml
│   └── release.yml
├── pm-tasks-core/
├── pm-tasks-trello/
├── pm-tasks-asana/
├── pm-tasks-jira/                            (scaffold)
├── pm-tasks-linear/                          (scaffold)
├── pm-tasks-notion/                          (scaffold)
├── pm-tasks-clickup/                         (scaffold)
├── pm-tasks-monday/                          (scaffold)
├── pm-tasks-bitrix24/                        (scaffold)
├── pm-tasks-todoist/                         (scaffold)
├── docs/specs/                               (this file + future designs)
├── package.json (root, private workspace manifest)
├── pnpm-workspace.yaml
└── README.md
```

### 3.2 Three distribution channels, one release

All three triggered by the same merge-to-main:

| Channel | Install command | Source of truth |
|---|---|---|
| Vercel CLI | `npx skills add llodev/skills/pm-tasks-trello` | git tag `pm-tasks-trello@1.0.0` |
| npm scoped | `npm i @llodev/pm-tasks-trello` | `changeset publish` |
| Claude Code marketplace | `/plugin marketplace add llodev/skills` | `.claude-plugin/marketplace.json` |

### 3.3 Versioning rules

- Semver per package. Independent (Trello bump does not bump Asana).
- Tag format: `<package-name>@<version>` (e.g., `@llodev/pm-tasks-core@1.0.0`).
- `metadata.version` in each `SKILL.md` frontmatter matches `package.json#version` — enforced in CI.

### 3.4 License

MIT. `LICENSE` at the repo root and copied into each package directory at release time. `license: MIT` in every `SKILL.md` frontmatter.

---

## 4. Package anatomy

### 4.1 `pm-tasks-core/`

```
pm-tasks-core/
├── SKILL.md                              (≤ 4KB — routing + load-on-demand pointers)
├── package.json
├── README.md
├── LICENSE
├── CHANGELOG.md
├── references/
│   ├── generic-card.md                   (universal blocks: title/desc/checklists/timeline/labels)
│   ├── contract.md                       (CANONICAL contract consumed by adapters)
│   ├── crud-vocabulary.md                (6 verbs, idempotency rules, clientToken spec)
│   ├── autonomous-mode.md                (sentinel detection, allowlist semantics, guardrails)
│   ├── init-ux.md                        (standardized init flow for all adapters)
│   └── audit-log-format.md               (JSONL schema + rotation policy)
├── anti-patterns/
│   └── core.md                           (transversal rules)
└── scripts/
    └── init-lib.js                       (reusable init prompts + schema validation)
```

### 4.2 `pm-tasks-<tool>/` (adapter template)

```
pm-tasks-trello/
├── SKILL.md                              (≤ 5KB — triggers, phase routing, autonomous overlay)
├── package.json                          (depends on @llodev/pm-tasks-core)
├── README.md
├── LICENSE
├── CHANGELOG.md
├── schemas/
│   └── config.json                       (JSON Schema for .trello.json)
├── references/
│   ├── format.md                         (paste-ready formatting per tool)
│   ├── mcp-config.md                     (MCP setup + .trello.json discovery)
│   ├── publish.md                        (Phase 5 MCP publish sequence)
│   ├── operations.md                     (verb → MCP tool mapping, ref resolution)
│   └── autonomous.md                     (per-tool autonomous overlay)
├── anti-patterns/
│   └── tools.md                          (paste health + tool-specific pitfalls)
└── scripts/
    └── init.js                           (calls init-lib + tool-specific MCP probes)
```

### 4.3 Conventions enforced in all packages

- `SKILL.md` frontmatter: `name`, `description`, `license`, `metadata.version`, `metadata.tags`, `compatibility.agents`.
- Description ≤ 1000 chars but ≥ 200 — must include trigger keywords (PT + EN) and explicit mention of core dependency.
- Each adapter's `description` MUST name the tool, the three modes (paste / publish / autonomous), and at least 5 trigger words (e.g., "Trello", "criar card", "publicar", "marcar checklist", "fechar card").

---

## 5. Core ↔ adapter contract

### 5.1 `pm-tasks-core/references/contract.md` — single source of truth

Lists:

1. **Phases the core executes** (Phase 1 identify input → Phase 2 extract → Phase 2.5 anti-patterns → Phase 3 build generic card).
2. **Generic-card output schema** — fields adapters consume (`title`, `description`, `implementationChecklist`, `verificationChecklist`, `timeline`, `labels`, `scope`, `audience`, `fidelity`, `language`).
3. **CRUD vocabulary** (the 6 verbs) with semantic invariants per verb.
4. **`clientToken` idempotency contract** — how adapters must implement deduplication (see § 8.3).

### 5.2 How an adapter references the core

Adapter `SKILL.md` states (text, no mechanism):

> Before applying tool-specific formatting (Phase 4), execute Phases 1–3 per `pm-tasks-core/references/contract.md`. Do not re-implement extraction.

Path is logical (`pm-tasks-core/references/contract.md`), not absolute. Agent resolves via the skill loader of whichever runtime (Claude Code, Cursor, Codex…).

### 5.3 Standalone fallback

Each adapter's `SKILL.md` contains a `## Standalone fallback` section (~10 lines): if `pm-tasks-core` is unavailable, ask the user for minimum input (title + checklist) and skip extraction. Quality degraded; explicit message: "Install `pm-tasks-core` for full flow."

### 5.4 Contract versioning rule

- Renaming or removing a field in `contract.md` → **major bump of core**.
- Adding an optional field → minor.
- `.github/workflows/contract-check.yml` blocks PRs that mutate `contract.md` without a matching changeset major.
- After core major: `scripts/contract-major-pr.sh` opens automated PRs in each adapter bumping `dependencies` range.

---

## 6. Autonomous mode

### 6.1 Activation (three signals, in priority order)

1. **Prompt sentinel** — invoking agent includes `[autonomous]` or `--auto` literal.
2. **Env var** — `LLODEV_PM_TASKS_AUTONOMOUS=1` (for CI / cron).
3. **Never inferred.** No signal → preview + human approval is mandatory.

### 6.2 Allowlist gate (per-tool config)

Autonomous mode requires an explicit `autonomous` block in the tool's config:

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
      "boards": ["board-id-x"],
      "lists": ["list-id-backlog", "list-id-done"]
    },
    "rateLimit": {
      "writesPerMinute": 30,
      "commentsPerMinute": 10
    },
    "auditLog": "~/.local/share/llodev/pm-tasks/trello/audit.log"
  }
}
```

No block, or `enabled: false` → autonomous aborts with a structured error.

### 6.3 Hard-coded forbidden verbs (v1)

Regardless of allowlist, the following are **never** auto-executed:

- `task.delete`, `task.archive` — irreversible in most tools.
- `task.rename` — breaks URL/text references.
- `task.description.replace` — overwrites human work.
- `task.assignee.remove`, any `member.remove` — removes humans without notice.
- Any operation targeting a board/list/project outside the declared `scope`.

Attempts return `{ ok: false, code: "FORBIDDEN_VERB" | "OUT_OF_SCOPE" }` without calling MCP.

### 6.4 Write-through flow

- Skip Phase 5.2 (preview & approval).
- Apply allowlist + scope + rate-limit checks → execute MCP write.
- Emit structured result envelope (§ 8.4) to the caller (JSON, not human-formatted).
- Append a JSONL entry to the audit log.

### 6.5 Failure handling

Any failure (MCP error, rate limit, allowlist violation, network) returns:

```json
{ "ok": false, "code": "<CODE>", "verb": "<verb>", "message": "<human>", "details": { ... } }
```

Caller decides retry / abort / escalate. Skill does not retry on its own (idempotency handled at next call).

---

## 7. Configuration

### 7.1 Lookup precedence

1. `<git-repo-root>/.<tool>.json` — repo override.
2. `~/.config/llodev/pm-tasks/<tool>.json` — global default.
3. Neither found → abort with init instructions.

Shallow merge at top level — repo override fields replace global; arrays not deep-merged.

### 7.2 Schema (illustrative `.trello.json`)

```json
{
  "$schema": "https://llodev.github.io/skills/schemas/pm-tasks-trello.json",
  "version": "1",
  "workspace": "minha-org",
  "boards": [ { "id": "...", "name": "...", "alias": "proj-x" } ],
  "lists": [ { "boardAlias": "proj-x", "id": "...", "name": "Backlog", "alias": "backlog" } ],
  "labels": [ { "boardAlias": "proj-x", "id": "...", "name": "bug", "color": "red" } ],
  "members": [ { "id": "...", "username": "lloliveiradev", "alias": "me" } ],
  "defaults": {
    "boardAlias": "proj-x",
    "listAlias": "backlog",
    "closeListAlias": "done"
  },
  "taskAliases": [
    { "alias": "release-pipeline", "id": "abc123", "url": "..." }
  ],
  "autonomous": { /* § 6.2 */ }
}
```

JSON Schema lives in `pm-tasks-<tool>/schemas/config.json` and is validated in CI.

### 7.3 Secrets policy

- **Never** in the JSON.
- Lookup order in the MCP server (not the skill):
  1. OS keychain (macOS Keychain, Linux secret-service, Windows Credential Manager).
  2. Env var with prefix `LLODEV_PM_TASKS_<TOOL>_<NAME>`.
  3. `.env` (gitignored) using the same env names.
- Skill is text-only; MCP is credentials. Separation prevents skill files from ever holding tokens.

### 7.4 Init helper (`npx @llodev/pm-tasks-<tool> init`)

Four steps, standardized via `pm-tasks-core/references/init-ux.md`:

1. **Scope prompt** — local repo or global.
2. **MCP auto-detect** — adapter probes the tool's MCP with the lightest read operation (e.g., `trello.list_boards`).
   - MCP responds → path A (MCP-assisted).
   - MCP exists but unauthenticated → print exact env var / keychain entries to create, exit.
   - MCP not configured → path B (scaffold).
3a. **Path A (MCP-assisted)** — read-only MCP calls to enumerate workspaces/boards/lists/labels/members; user picks via interactive prompts; config written with real IDs. Final prompt: "Enable autonomous mode? (creates conservative defaults)" — default `n`.
3b. **Path B (scaffold)** — write JSON with placeholders and inline comments showing where to find each ID; print MCP setup instructions.
4. **Confirmation** — validate against schema; print path; print sample trigger command.

### 7.5 Code organization for init

- Generic UX (prompts, file write, schema validation) → `pm-tasks-core/scripts/init-lib.js`.
- Tool-specific MCP probes + response mapping → `pm-tasks-<tool>/scripts/init.js` (~50 LOC).
- Adapter `init.js` imports core's `init-lib`. Hard runtime dependency on core for the init helper — acceptable trade-off (skillpm/npm cascades automatically).

---

## 8. Operation contracts (v1 verbs)

### 8.1 Common invocation pattern

| Verb | Human trigger keywords (PT + EN) | Autonomous form |
|---|---|---|
| `task.create` | "criar card", "publicar plano em Trello", `--publish` | `[autonomous] create task in trello from plan` |
| `checklist.check` | "marca item 3 da task X" | `[autonomous] check item <n> of <task-ref>` |
| `task.close` | "fecha a task X" | `[autonomous] close <task-ref>` |
| `task.due-date.set` | "muda a data da task X" | `[autonomous] set due of <task-ref>` |
| `task.assignee.add` | "adiciona João na task X" | `[autonomous] add assignee <user> to <task-ref>` |
| `task.comment.add` | "comenta na task X: ..." | `[autonomous] comment on <task-ref>: ...` |

### 8.2 `<task-ref>` resolution order

Adapter resolves `<task-ref>` in this order:

1. Full task URL.
2. Native ID (tool-specific format).
3. Alias declared in config `taskAliases`.
4. clientToken match in the audit log (most recent entry).
5. Name partial match in the audit log scoped to `scope.boards` (most recent entry).
6. Ambiguous / not found → return `{ ok: false, code: "REF_NOT_RESOLVED", candidates: [...] }`.

### 8.3 Idempotency rules

- `task.create` — accepts optional `clientToken`. Before creating, search scope for a task with this token (stored in description, custom field, or external-id depending on tool). If found, return existing ref.
- `checklist.check` — naturally idempotent.
- `task.close` — naturally idempotent.
- `task.due-date.set` — idempotent (no-op if value matches).
- `task.assignee.add` — adapter checks current assignees before calling MCP.
- `task.comment.add` — **not natural**. Comment body is prefixed with `[ct:<clientToken>]`; adapter scans recent comments for the token before posting.

### 8.4 Result envelope (uniform across verbs)

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "trello",
  "ref": {
    "id": "<native-id>",
    "url": "<full-url>",
    "alias": null
  },
  "details": { "/* verb-specific */" }
}
```

In human mode, the envelope is rendered as a friendly confirm block. In autonomous mode, it is returned as JSON to the caller.

### 8.5 Where the per-tool mapping lives

`pm-tasks-<tool>/references/operations.md` documents:

- Verb → MCP tool name + parameter mapping.
- URL parser regex for `<task-ref>` from this tool.
- Tool-specific edge cases (rate limits, transient errors to retry, etc.).

---

## 9. Audit log

### 9.1 Path

`~/.local/share/llodev/pm-tasks/<tool>/audit.log` (JSONL, append-only).

Configurable via `autonomous.auditLog` field in the tool's config.

### 9.2 Entry schema

```jsonl
{"ts":"2026-06-11T18:00:00Z","verb":"task.create","tool":"trello","ok":true,"id":"abc123","url":"https://trello.com/c/abc123/...","name":"Implementar feature X","clientToken":"ct-xyz","scope":{"board":"proj-x","list":"backlog"},"session":"sess-001"}
{"ts":"2026-06-11T18:05:00Z","verb":"checklist.check","tool":"trello","ok":true,"id":"abc123","item":"build endpoint","session":"sess-001"}
```

Required fields: `ts`, `verb`, `tool`, `ok`, `session`. All others are verb-dependent.

### 9.3 Dual purpose

- **Audit** — forensics on what happened in which session.
- **State / lookup** — § 8.2 step 4 and 5 consult this log to resolve `<task-ref>`.

### 9.4 Rotation

`pm-tasks-core/scripts/rotate.sh` purges entries older than 90 days. Optional cron suggestion in core README.

### 9.5 Concurrency

Append-only single-line JSON writes are atomic at OS level for reasonable line sizes (< 4KB). Multiple agents in parallel do not corrupt. No locks.

---

## 10. Release & CI

### 10.1 Changesets

Each PR that changes runtime behavior includes a `.changeset/<name>.md` listing affected packages and bump type. Merge-to-main runs `release.yml` which:

1. `changeset version` — bumps `package.json`, `metadata.version` in frontmatter, `CHANGELOG.md`, and `marketplace.json` entries.
2. `changeset publish` — publishes the changed packages to npm.
3. Creates git tags `<package>@<version>`.
4. Creates GitHub Releases with notes from changeset bodies.

### 10.2 CI workflows (`.github/workflows/`)

| Workflow | Trigger | Validates |
|---|---|---|
| `validate.yml` | PR + push to main | Frontmatter YAML, JSON Schemas, internal links, `metadata.version` ↔ `package.json#version` sync |
| `contract-check.yml` | PR touching `pm-tasks-core/references/contract.md` | Matching changeset major bump on core |
| `secrets-scan.yml` | PR + push | trufflehog or gitleaks |
| `release.yml` | push to main | Changesets version + publish + tag + release + marketplace sync |

### 10.3 Pre-release channel

Branch `next` → publish `1.2.0-next.N` with npm dist-tag `next`. Users opt in:

```bash
npm i @llodev/pm-tasks-trello@next
```

### 10.4 Cadence

- Patch (weekly): bugfix, trigger tuning.
- Minor (monthly): new verb, new adapter promoted from scaffold to public, init UX improvement.
- Major (rare): contract break — always with `MIGRATION.md` and automated PRs to adapters.

---

## 11. Open questions / deferred

- **v2 — bidirectional sync**: read PM tool state back into plan files. Requires a different mental model (which is source of truth?). Out of v1.
- **v2 — `task.description.append`**: safe append to description (preserves human edits). Move to v2 with explicit allowlist verb.
- **v2 — webhook / event mode**: PM tool pings agent on state change. Requires hosted endpoint, out of skill scope.
- **Community adapters**: any adapter beyond the 9 listed → community contribution path documented in core README. v2.

---

## 12. Migration from current `plan-to-task-cards`

User keeps the current skill installed during transition. When `pm-tasks-trello` v1.0.0 ships:

1. User runs `npx skills add llodev/skills/pm-tasks-core llodev/skills/pm-tasks-trello`.
2. Migrates existing `.trello.json` (schema is identical to current; only the `autonomous` block is new and optional).
3. Verifies parity with one card creation against a real board.
4. Removes `~/.claude/skills/plan-to-task-cards/` once confident.

Same for Asana. The current Jira reference is preserved as a scaffold (`pm-tasks-jira`) but not promoted to v1.0.0.

---

## 13. Success criteria

A v1 release is successful when:

- User executes the exact same daily workflow against Trello and Asana, with feature parity vs the current monolithic skill.
- A second agent (e.g., during an autonomous coding session) can call `pm-tasks-trello` in autonomous mode and create + check + close a task, with audit log entries.
- A third-party developer can `npx skills add llodev/skills/pm-tasks-trello`, configure via `init`, and create a card from a plan within 5 minutes.
- Scaffolds for the other 7 tools exist in the repo with directory layout + reserved npm names, but are **not published** anywhere (not on npm, not in `marketplace.json`, not visible on `skills.sh`). They wait until each tool's MCP integration is complete.
