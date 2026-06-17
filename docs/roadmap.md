# @llodev/skills — Roadmap

Date: 2026-06-16. Baseline: `main` at commit `0ae773c` (v1.3.0 merged via squash, PR #4). Forward-looking roadmap — single source of truth for the project; each item carries **real status** (delivered / partial / pending) and **priority**.

**Active P0 plan:** [`plans/2026-06-16-pm-tasks-v1.3.2-v1.5-org-ts-migration.md`](plans/2026-06-16-pm-tasks-v1.3.2-v1.5-org-ts-migration.md) — repo organization (v1.3.2) + TypeScript migration (v1.4.0 core, v1.5.0 adapters+testkit+E2E) + 7th canonical verb `task.move`. Predecessor plan ([`plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md`](plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md)) covered v1.2.0 → v1.3.1 (delivered).

> [!NOTE]
> "Pending" means "not implemented". "Partial" means part of it exists but has an open gap. Items marked as resolved have been removed from the backlog even if they appear as TODO in older review notes.

---

## 1. Already delivered

Items previously identified as gaps that have been delivered and should not be re-tracked. Reference for what's behind us; not actionable backlog.

| Source                        | Item                                                                                               | Real status                         | Where it was resolved                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0.x                        | Skill-judge baseline + quality gate pre-release                                                    | ✅ delivered                        | `scripts/skill-judge-baseline.json` + `skill-judge-check.mjs` + `pre-release-check.sh` + Makefile `pre-release`                                                         |
| v1.0.x                        | i18n config + init (locale picker, 3 locales in schema)                                            | ✅ delivered                        | `pm-tasks-core/i18n/{en-US,pt-BR,es-ES}.json` + `init-lib` `loadStrings/interpolate`                                                                                    |
| v1.0.x                        | Localized docs (SKILL.md, README.md in pt-BR/es-ES)                                                | ✅ delivered                        | Each package has `SKILL.<locale>.md` + `README.<locale>.md` + `package.json files`                                                                                      |
| v1.0.x                        | Tactical fixes (task.close/dueComplete, UI-as-truth, URL/MCP gotchas)                              | ✅ delivered (Phase 4 of v1.1 plan) | Commits on branch v1.1                                                                                                                                                  |
| v1.1.x                        | Autonomous mode stateful in multi-task loops                                                       | ✅ documented                       | `pm-tasks-core/references/autonomous-mode.md` § "Continuous operation"                                                                                                  |
| v1.1.x                        | Stale frontmatter `1.1.0` in localized SKILL.md files                                              | ✅ fixed                            | Commit `048e78b`                                                                                                                                                        |
| v1.1.x                        | `errInvalidConfig` unused + `Config written` hardcoded EN                                          | ✅ fixed                            | Commit `048e78b`                                                                                                                                                        |
| v1.0.x                        | Convention `<basename>.<lang-code>.md`                                                             | ✅ adopted                          | Doc + real usage across all 3 active packages                                                                                                                           |
| v1.1.x                        | Push v1.1 + PR → main + CI publishes 3 packages                                                    | ✅ delivered                        | Branch v1.1 merged via squash; tags + releases published by Changesets action                                                                                           |
| v1.0.x                        | Migrate workflow `~/.claude/skills/plan-to-task-cards/` to packages                                | ✅ delivered                        | Daily workflow already consumes `@llodev/pm-tasks-*` in production                                                                                                      |
| v1.0.x                        | Asana dogfood in a clean workspace                                                                 | ✅ delivered                        | Validated in a real session                                                                                                                                             |
| v1.1.x                        | Spot-check pt-BR/es-ES with human review                                                           | ✅ delivered                        | Validated by repo owner                                                                                                                                                 |
| v1.1.x                        | `promptYesNo` cross-locale tolerance — explanatory comment                                         | ✅ delivered                        | `pm-tasks-core/scripts/init-lib.mjs` § promptYesNo                                                                                                                      |
| v1.2.0 (PR #1)                | Phase C — runtime attribution opt-in (commentPrefix / autonomousCommentPrefix / descriptionFooter) | ✅ delivered v1.2.0                 | `pm-tasks-core/scripts/init-lib.mjs#getAttribution` + 3 i18n keys × 3 locales + `references/attribution.md`                                                             |
| v1.2.1 (PR #3)                | CI release workflow validate + contract-check + pre-release gates + npm provenance                 | ✅ delivered v1.2.1                 | `.github/workflows/release.yml` (post-PR #3)                                                                                                                            |
| v1.2.1 (PR #3)                | Tarball snapshot test (detect `files` field drift)                                                 | ✅ delivered v1.2.1                 | `scripts/tarball-snapshot.test.mjs` + `scripts/tarball-snapshot.json` golden, wired in `pnpm validate`                                                                  |
| v1.3.0 (PR #4)                | Adapter `manifest.json` + custom-verbs extension API                                               | ✅ delivered v1.3.0                 | `pm-tasks-core/schemas/adapter-manifest.schema.json` + `pm-tasks-{asana,trello}/manifest.json` + Phase B in `scripts/contract-check.mjs` + new section in `contract.md` |
| v1.3.0 (PR #4)                | Contract gate distinguishes additive changes in `contract.md` (do not require major)               | ✅ delivered v1.3.0                 | `scripts/contract-check.mjs` § Phase A additive check; docs in `.changeset/README.md` § Contract gate                                                                   |
| PR #2 (separate, out of plan) | Meta-package version coupled to family minor (spurious jump 1.0 → 2.0 → 3.0)                       | ✅ resolved                         | `.changeset/config.json` `onlyUpdatePeerDependentsWhenOutOfRange: true` + peer ranges relaxed to `^1.0.0` + doc in `.changeset/README.md` § Meta-package versioning     |

---

## 2. Real backlog

### 2.1 Carry-over backlog

Items from prior reviews that have not yet shipped.

| #   | Item                                                                                       | Source      | Size | Blocks release? |
| --- | ------------------------------------------------------------------------------------------ | ----------- | ---- | --------------- |
| D   | Tests for `registerI18nRoot` / `loadStrings` adapter-scoped + `promptLocale` invalid path  | v1.1 review | S    | No              |
| E   | Path-correctness validator for localized `.md` files (`references/contract.pt-BR.md` etc.) | v1.1 review | S    | No              |
| F   | Document `NOISE_BAND` in skill-judge gate (currently "silent diff vs test name")           | v1.1 review | XS   | No              |

> [!NOTE]
> Items B, C, G, H removed — all resolved (B/C/G) or moved to manual monitoring outside the roadmap (H, `skills.sh` indexing is an external cron for the index).

### 2.2 Polish items delivered during this review

- ✅ Explanatory comment for `promptYesNo` cross-locale tolerance added.
- ✅ Human review of pt-BR/es-ES translations done by repo owner.

---

## 3. Engineering gaps (code / process)

Identified by scanning the current repository. Each includes **why it matters** in the pm-tasks + agent skills context.

### 3.1 Tests and quality

| #     | Gap                                                                                                                                  | Why                                                                                                                                 | Effort |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E1    | **No E2E test** consuming a published package (local tarball via `pnpm pack` + `npx`). Today we only have unit tests for `init-lib`. | Bug in v1.0.1 (bin entry / shebang) escaped because `node scripts/init.mjs` worked locally but `npx @llodev/pm-tasks-asana` failed. | M      |
| E2    | **No golden master** for the skill-judge baseline. Score only lives in `baseline.json`; no snapshot of the rubric input.             | Score changes silently if the `skill-judge` rubric changes — we lose the explanation for "why 85".                                  | S      |
| ✅ E3 | **No contract conformance test** proving adapter ↔ `contract.md`. `contract-check.mjs` exists but was loose.                         | When a new verb is added to core, adapters could fall behind without an alarm. **delivered v1.3.0**                                 | S      |
| E4    | **No coverage gate** (Istanbul / c8).                                                                                                | Cannot enforce minimum coverage on PRs.                                                                                             | S      |
| E5    | **No mutation testing**.                                                                                                             | `init-lib` tests could be weak without us noticing.                                                                                 | M      |
| ✅ E6 | **No tarball snapshot test** (`pnpm pack` + list files).                                                                             | We already had the `files` field bug excluding i18n; a snapshot would have caught it. **delivered v1.2.1**                          | S      |

### 3.2 TypeScript / DX

| #   | Gap                                                                                                               | Why                                                                                                                                 | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T1  | Repo is 100% `.mjs` (recorded decision). No `.d.ts` shipped → TS consumers have no types for exported `init-lib`. | Third-party adapters (Jira, Linear when they arrive) would gain type `loadStrings(scope, locale): Promise<Record<string, string>>`. | M      |
| T2  | No minimal JSDoc `@type` annotations in `init-lib.mjs`.                                                           | Even without TS, JSDoc gives autocomplete and an implicit contract.                                                                 | S      |

### 3.3 Release engineering

| #     | Gap                                                                                                          | Why                                                                                                                  | Effort |
| ----- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------ |
| ✅ R1 | **CI `release` did not run `validate` or `contract-check` before publishing**. Only ran `changesets/action`. | A bug that passed lefthook (running locally) could have published broken. Validate was PR-only. **delivered v1.2.1** | XS     |
| R2    | **No per-package CHANGELOG.md** — we rely on GitHub Releases generated by Changesets.                        | npm consumers don't see the changelog on install.                                                                    | S      |
| ✅ R3 | **No npm provenance** (`--provenance`). Standard in 2026.                                                    | Supply-chain signal. **delivered v1.2.1**                                                                            | XS     |
| R4    | **No canary publish** (version `0.0.0-pr-<n>`) to test tarball before final release.                         | Still depends on manual `pnpm pack`.                                                                                 | M      |
| R5    | **No package-size budget** (bundlephobia / size-limit).                                                      | Skills are markdown + JSON, but tarballs grew >50kB with i18n; no explicit ceiling.                                  | S      |
| R6    | **No dependabot / renovate.json**. `ajv` `^8.17.1` can age silently.                                         | Supply-chain hygiene.                                                                                                | XS     |

### 3.4 Repository hygiene

| #   | Gap                                                                                   | Why                                                                            | Effort |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| H1  | No `CONTRIBUTING.md`.                                                                 | Repo is public on llodev; without a guide, external contribution is guesswork. | S      |
| H2  | No `SECURITY.md`.                                                                     | npm registry expects a reporting channel.                                      | XS     |
| H3  | No `CODE_OF_CONDUCT.md`.                                                              | Standard GitHub community files.                                               | XS     |
| H4  | No issue / PR templates (`.github/ISSUE_TEMPLATE/`).                                  | Speeds up triage; useful when scaffolds become real adapters.                  | S      |
| H5  | No `CODEOWNERS`.                                                                      | No auto-assign review by package.                                              | XS     |
| H6  | `marketplace.json` not versioned in the roadmap (exists via Claude Code marketplace). | No test proving parity between `marketplace.json` and published npm packages.  | S      |

### 3.5 Observability / debugging

| #   | Gap                                                                                                                             | Why                                                                          | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| O1  | **Audit log exists but with no intelligent automated rotation** (`pm-tasks-core/scripts/rotate-audit.sh` is rudimentary shell). | In real use, audit grows fast; rotation needs to be idempotent + size-aware. | S      |
| O2  | **No opt-in telemetry**. We don't know which verbs are most used or which adapters fail most.                                   | Blocks data-driven roadmap decisions.                                        | M      |
| O3  | **No `pm-tasks doctor` command** (validates config, MCP accessible, allowlist OK, audit writable).                              | Today users only discover that MCP is offline when they try to publish.      | S      |

---

## 4. Project Management gaps (new features)

Cut from real usage context (engineers + agencies using pm-tasks daily). Prioritized by observed pain.

### 4.1 High-value PM features

| #   | Feature                                          | Description                                                                                            | Tools that support             | Effort |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------ | ------ |
| F1  | **Reverse sync (read-back)**                     | Pull cards from the tool → update the local plan (status, dates, comments). Bidirectional.             | All                            | L      |
| F2  | **Sprint / iteration support**                   | `task.sprint.set` as 7th verb. Jira / Linear / ClickUp have native sprints.                            | Jira, Linear, ClickUp, Monday  | M      |
| F3  | **Parent/child hierarchy (epic → story → task)** | Today we only have checklist items (1 level). Asana supports natively; Jira/Linear have epics.         | Jira, Linear, Asana, ClickUp   | M      |
| F4  | **Cross-tool migration**                         | `pm-tasks-migrate from=trello to=linear` maps cards via core vocabulary.                               | All that implement the 6 verbs | L      |
| F5  | **Time tracking**                                | `task.time.log(hours, comment)` 8th verb. Jira / Linear / ClickUp / Todoist have native time-tracking. | Jira, ClickUp, Linear, Todoist | M      |
| F6  | **Dependency graph** (blocks/blocked-by)         | `task.blocks.add(otherTaskId)`. Jira, Linear, Monday support this.                                     | Jira, Linear, Monday           | M      |
| F7  | **Story points / estimation**                    | `task.estimate.set(points)`. Linear / Jira native.                                                     | Jira, Linear, ClickUp          | S      |
| F8  | **Card templates**                               | Pre-define a card archetype (e.g., "bug report") with checklist + labels + custom fields.              | All                            | S      |
| F9  | **Multi-board orchestration**                    | Single plan distributed across multiple boards/projects (e.g., backend → board A, frontend → board B). | All                            | M      |
| F10 | **WIP limits enforcement**                       | Blocks `task.create` if destination column exceeded WIP.                                               | Trello, Jira, Linear           | S      |
| F11 | **Standup notes verb**                           | `task.standup.post(channel)` summarizes agent card status from the last 24h.                           | All                            | M      |
| F12 | **Velocity / burndown reporter**                 | Read-only analytics aggregating audit log + tool API.                                                  | All                            | M      |

### 4.2 Best practices turned features

| #     | Item                                                                                                                                                                       | Why                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| P1    | **`@llodev/pm-tasks-testkit`** — separate package with fakes for the 6 verbs, useful for plugins to test without a real MCP.                                               | Today each adapter reinvents its own mocks.                               |
| P2    | **`@llodev/pm-tasks-cli`** — standalone CLI that consumes adapters via dynamic `import()`. Useful for use outside IDE/agent context.                                       | Today the only entry point is via skill activation.                       |
| ✅ P3 | **Custom-verbs extension API** — allows adapters to declare their own verbs (e.g., `card.cover-image.set` exclusive to Trello) without altering core. **delivered v1.3.0** | Non-canonical verbs previously forced adapters to violate contract-check. |
| P4    | **Plugin SDK + contract.test.mjs reuse** — export from core a test suite that third-party adapters can run with `npx pm-tasks-contract-tests`.                             | Raises ecosystem quality without requiring PRs to the monorepo.           |

---

## 5. Missing pm-tasks-\* skills (ranked by market)

Today we have 3 active (core, asana, trello) + 7 scaffolds. Implementation ranking by **market share of real teams using PM tools** (2025–26):

| #      | Skill                   | Market rationale                                                                                                                                                  | MCP status                                                          | Effort                                            | Priority |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| **S1** | **`pm-tasks-jira`**     | Absolute leader in dev/agile (~40% of dev market). Atlassian is the default at any company with >100 devs. Covers the largest TAM in the family by a wide margin. | Atlassian Remote MCP GA + Atlassian Rovo MCP, both production-ready | L (custom fields, projects, JQL, state workflows) | 🔴 P0    |
| **S2** | **`pm-tasks-linear`**   | Premium dev market. Disproportionate mindshare vs. share (startups, scale-ups, open-source). Opinionated model (cycle = native sprint) eases the adapter.         | Linear MCP official GA                                              | M (cycles, triage, priorities, sub-issues)        | 🔴 P0    |
| **S3** | **`pm-tasks-clickup`**  | Fastest-growing PM tool, especially strong in agencies/SMB and hybrid teams (dev + marketing).                                                                    | ClickUp MCP community maturing                                      | M (lists, custom statuses, rich custom fields)    | 🟠 P1    |
| **S4** | **`pm-tasks-notion`**   | Largest install base, PM via databases. Covers market that does NOT buy Jira (founders, creators, micro-teams).                                                   | Notion MCP official GA                                              | M (relational databases, dynamic properties)      | 🟠 P1    |
| **S5** | **`pm-tasks-monday`**   | Strong in non-dev enterprise (operations, marketing, HR). Large enterprise TAM.                                                                                   | Monday MCP in development                                           | M (boards, items, custom columns)                 | 🟡 P2    |
| **S6** | **`pm-tasks-todoist`**  | Largest consumer base (~30M). Useful for freelancer / solo dev / 1–2 people. MCP trivial to build (simple API).                                                   | Todoist MCP community stable                                        | S (tasks, projects, labels — simple model)        | 🟡 P2    |
| **S7** | **`pm-tasks-bitrix24`** | Geographic niche (LATAM, Eastern Europe, SMB with integrated CRM). Relevant penetration in Brazil.                                                                | No official MCP; well-documented REST API                           | M (pure REST, no MCP, needs own client)           | 🟢 P3    |

### 5.1 Additional skills to consider (outside current scaffolds)

| #   | Skill                          | Rationale                                                                                                                                                 | Priority                     |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| S8  | **`pm-tasks-github-projects`** | GitHub Projects (v2) is native PM on GitHub; direct integration with PRs/issues. Official MCP (`github-mcp-server`) already covers it. Pure dev audience. | 🟠 P1 (high value, low cost) |
| S9  | **`pm-tasks-height`**          | Modern PM with native AI; growing in the same segment as Linear.                                                                                          | 🟢 P3                        |
| S10 | **`pm-tasks-basecamp`**        | Legacy-but-alive; stable SMB.                                                                                                                             | 🟢 P3                        |
| S11 | **`pm-tasks-airtable`**        | Not pure PM but used as such by many teams; flexible databases.                                                                                           | 🟢 P3                        |
| S12 | **`pm-tasks-wrike`**           | Enterprise (Citrix-owned); large footprint but low mindshare.                                                                                             | ⚪ P4                        |
| S13 | **`pm-tasks-smartsheet`**      | Enterprise (PMI), large TAM but overlaps with Monday.                                                                                                     | ⚪ P4                        |

---

## 6. Prioritized roadmap (single ordered list)

Proposed execution order. Criterion: **value × pain × retrofit cost**.

> [!IMPORTANT]
> **Guiding principle (2026-06-15):** quality / tests / foundation **before** any new PM tool adapter. Retrofit cost grows linearly with the number of published adapters. Today we only have 2 active (asana + trello) — ideal window for architectural lock-in. Jira / Linear / ClickUp are reserved for P1 and only start after P0 closes.
>
> P0 execution plan: **[`plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md`](plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md)**.

### 🔴 P0 — Foundation & Quality (v1.2 → v1.4)

No new adapters. 5 planned releases (3 minor + 2 patch). Stays at v1.x — none of the changes are breaking.

1. ✅ **v1.2.0 — Phase C: runtime attribution** [§2.1 A] — **delivered (PR #1)**
   - `commentPrefix` / `autonomousCommentPrefix` / `descriptionFooter` opt-in, locale-aware.
   - Closes the most visible pending feature, explicitly deferred in v1.1.
2. ✅ **v1.2.1 — CI release hardening** [§3.3 R1 + §3.1 E6 + §3.3 R3] — **delivered (PR #3)**
   - `release.yml` workflow gains steps for `validate` + `contract-check` + skill-judge + tarball snapshot. Publish with `--provenance`.
   - Large blast radius, XS-S effort. Patch.
3. ✅ **v1.3.0 — Contract conformance + custom-verbs API** [§3.1 E3 + §4.2 P3] — **delivered (PR #4)**
   - `manifest.json` per adapter + namespace for custom verbs (`<tool>.*`).
   - **Most critical delivery of the plan** — retrofitting 4+ adapters afterward costs 4× more.
4. **v1.3.1 — Test gaps + docs polish** [§2.1 D + E + F + §3.1 E2] — **next**
   - `registerI18nRoot` / `loadStrings` adapter-scoped tests, `promptLocale` invalid path, path-correctness validator for localized `.md` files, `NOISE_BAND` documented inline, golden master for skill-judge rubric.
5. **v1.4.0 — DX foundation** [§3.2 T1 + §3.1 E1 + §3.3 R4 + §4.2 P1] — **planned**
   - Handcrafted `.d.ts` shipped by core + adapters, JSDoc fallback in `.mjs` files.
   - E2E canary test (`pnpm pack` + `npx <pkg>` in a clean sandbox) on every PR.
   - `@llodev/pm-tasks-testkit` published (fakes for the 6 canonical verbs).

### 🟠 P1 — First new adapters (v1.5)

6. **`pm-tasks-jira`** [§5 S1] — largest TAM in the family.
7. **`pm-tasks-linear`** [§5 S2] — premium dev; cycle aligns with our vocabulary.
8. **F2 — 7th canonical verb `task.move`** (WIP transitions) — formalizes the move-to-WIP step the autonomous contract already requires but lacks a verb for. Delivered as part of v1.5.0 plan Task 3.0.
9. **F3 — Sprint / iteration support** (8th verb `task.sprint.set`) [§4.1]
   - Enables natural-fit Jira / Linear / ClickUp.
10. **F4 — Parent/child hierarchy** (epic → story → task) [§4.1]
    - Required for Jira (epics) and Linear (sub-issues).

### 🟡 P2 — Expansion (v1.6 → v1.7)

10. **`pm-tasks-clickup`** [§5 S3]
11. **`pm-tasks-notion`** [§5 S4]
12. **`pm-tasks-github-projects`** [§5 S8]
13. **F5 — Time tracking** (8th verb) [§4.1]
14. **F7 — Story points / estimation** [§4.1]
15. **F1 — Reverse sync (read-back)** [§4.1]
    - Bidirectional is a large architectural change; deliver after we have 4–5 mature adapters.
16. **F13 — Batch card+checklists creation** (custom namespaced verb `<adapter>.task.batch-create-with-checklists`) — Trello / Asana REST APIs lack native batch endpoints for nested resources; today each item is a separate POST. Wrapping in a custom verb that fan-outs parallel requests internally (or clones via Trello `idChecklistSource` template) cuts publish time ~10× for large plans. Roll out per-adapter as opt-in.
17. **F14 — Runtime adapter as library (headless mode)** — expose each adapter's resolution logic (label/member resolution from `.tool.json` aliases, attribution prefix from `config.locale`, audit log append, MCP call orchestration) as a callable module that subagents OR end users can invoke without activating the full skill flow. Today the adapter has only two entry points: full skill activation (heavy) or raw MCP calls (loses all config-driven guarantees — labels, members, locale, attribution, audit). A library mode (`import { createAdapter } from '@llodev/pm-tasks-trello/adapter'`) covers two real use cases: (a) high-volume bulk operations dispatched to cheaper subagents, (b) direct user invocation from Node scripts when no agent is running. Natural follow-up to v1.5.0 TS migration since the surface is already typed.
18. **F15 — SDD ↔ pm-tasks-\* adapter hooks** — `superpowers:subagent-driven-development` (SDD) has no integration points for adapter callouts. When the user invokes `/superpowers:subagent-driven-development <plan> --trello --auto`, the `--trello --auto` flags are silently ignored: SDD only orchestrates implementer/reviewer subagents and doesn't translate task-lifecycle events into `task.move` / `checklist.check` / `task.comment.add` calls. Observed in v1.3.2 and v1.4.0 phase executions — Trello cards stayed in Backlog with empty checklists until a manual end-of-phase sweep. Two ways forward: (a) add a thin "task lifecycle" hook in SDD that dispatches a Haiku subagent at task start (move to WIP) and task end (check items + comment) when an adapter is declared autonomous in the workspace; (b) build a wrapper skill that composes SDD + pm-tasks-trello autonomous mode and surfaces a unified slash command. Depends on F14 (headless library mode) to keep the hook cost low — the wrapper should call adapter primitives directly, not activate the full skill. Pairs with v1.5.0's `task.move` 7th canonical verb (Task 3.0 of the active plan).

### 🟢 P3 — Long tail (v1.8+)

16. **`pm-tasks-monday`** [§5 S5]
17. **`pm-tasks-todoist`** [§5 S6]
18. **`pm-tasks-bitrix24`** [§5 S7]
19. **`pm-tasks-height` / `pm-tasks-basecamp` / `pm-tasks-airtable`** [§5 S9–S11]
20. **F4 — Cross-tool migration** [§4.1] — viable after ≥4 adapters.
21. **F6 — Dependency graph** [§4.1]
22. **F8 — Card templates** [§4.1]
23. **F10 — WIP limits enforcement** [§4.1]
24. **F11 — Standup notes verb** [§4.1]
25. **F12 — Velocity / burndown reporter** [§4.1]
26. **`@llodev/pm-tasks-cli`** [§4.2 P2]

### ⚪ P4 — Distant backlog

27. **`pm-tasks-wrike` / `pm-tasks-smartsheet`** [§5 S12–S13]
28. **Opt-in telemetry** [§3.5 O2]
29. **Multi-board orchestration** [§4.1 F9]
30. **Mutation testing** [§3.1 E5]

### Continuous polish (any release)

- §3.3 R2/R5/R6: per-package CHANGELOG, size budget, dependabot.
- §3.4 H1-H6: community files (CONTRIBUTING, SECURITY, CoC, templates, CODEOWNERS, marketplace parity).
- §3.5 O1/O3: intelligent audit rotation + `pm-tasks doctor`.
- §4.2 P4: plugin SDK + external `contract.test.mjs` reuse.

---

## 7. Risks and external dependencies

| Risk                                                                                                  | Mitigation                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A tool's MCP goes down or changes its contract                                                        | Each adapter needs a smoke test against MCP in CI (with secrets in env, not in the PR).                                             |
| Phase C (runtime attribution) interacts with Phase A (locale config) — refactor could break v1.1 i18n | TDD required; `getAttribution()` must consume `loadStrings(scope, locale)` without hardcoding. P0 plan §Phase 1 details this.       |
| Contract conformance test (v1.3.0) must land **before** the first new adapter                         | Positioned as v1.3.0 in the P0 plan — Jira/Linear (P1) only start after. Intentional bypass blocks release with a specific message. |
| Tarball size explodes with 6+ adapters localized in N languages                                       | Tarball snapshot test (v1.2.1) detects inflation; size-limit (R5) lands as a gate in P3.                                            |
| Handcrafted TypeScript `.d.ts` drifts out of sync with `.mjs` source                                  | `types-check.mjs` in the `validate` script runs `tsc --noEmit` against `.d.ts` files on every PR.                                   |

---

## 8. Version history

**Released:**

- v1.0.0 (2026-06-13) — first public release of 4 packages; scaffolds reserve namespaces.
- v1.0.1–v1.0.3 (2026-06-14) — hotfixes for bin entry / publishConfig / files field.
- v1.1.x (2026-06-14) — skill-judge gate + i18n init + localized docs (pt-BR/es-ES) + autonomous mode stateful doc + tactical fixes Phase 4.
- v1.2.0 (2026-06-16) — Phase C runtime attribution (commentPrefix / autonomousCommentPrefix / descriptionFooter + i18n). PR #1.
- v1.2.1 (2026-06-16) — CI release hardening (validate + contract-check + skill-judge + tarball snapshot + npm provenance). PR #3.
- v1.3.0 (2026-06-16) — Contract conformance test + custom-verbs extension API (`manifest.json`, namespace `<tool>.*`). PR #4.

**Planned (P0 — plan in [`plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md`](plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md)):**

- v1.3.1 — Test gaps + docs polish (i18n adapter-scoped tests + path-correctness validator + `NOISE_BAND` doc + golden master skill-judge).
- v1.4.0 — DX foundation (TypeScript `.d.ts` + E2E canary + `@llodev/pm-tasks-testkit`).

**Planned (P1):**

- v1.5.x — `pm-tasks-jira` + `pm-tasks-linear` + verb `task.sprint.set` + parent/child hierarchy.

---

> [!TIP]
> When an item from this roadmap ships, mark it ✅ in §1 of this doc and remove it from §2.1 / §6 if it appeared there. This doc is the single source of truth; there is no separate per-version tracking doc.
