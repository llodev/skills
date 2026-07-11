# @llodev/pm-tasks-core

## 1.12.0

### Minor Changes

- [#41](https://github.com/llodev/skills/pull/41) [`dc31cdf`](https://github.com/llodev/skills/commit/dc31cdffe7dad3338f07190cdec43d71c9eb6f8b) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - Refresh published package metadata for the flattened `skills/` + `packages/` repository layout. `homepage` and `repository.directory` now point at the new paths, so npm and registry "Repository"/"Homepage" links resolve instead of 404ing against the removed `pm-tasks/*` and `django/*` folders. Documentation-only for consumers — no API, runtime, or behavior changes.

## 1.11.0

### Minor Changes

- [#27](https://github.com/llodev/skills/pull/27) [`9fa2217`](https://github.com/llodev/skills/commit/9fa2217b45d4f4519045a515f10a67f643f0941e) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - feat(pm-tasks-jira): v1.0.0 — first Jira adapter (9 verbs, headless /adapter, init, doctor, estimation); core: F3 task.parent.set + F7 task.estimate.set + estimation module

  skill-judge: pm-tasks-jira/SKILL.md baseline recorded at 85 (rubric Grade B, ~101/120 raw), calibrated to the mature-adapter peer band (core 85, asana 83, trello 80). New skill → fresh baseline; no gate bypass used.

## 1.10.0

### Minor Changes

- [#22](https://github.com/llodev/skills/pull/22) [`30c3713`](https://github.com/llodev/skills/commit/30c3713d0d7a1196557f398818b60825b69bafa4) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - pm-tasks v1.10.0 — Canary publish infrastructure (Option F)

  CI-only infra that publishes a canary dist-tag for every PR; catches publish-time
  regressions (bin wiring, dist-tag routing, registry access) before they reach `latest`.
  The v1.0.1 lesson showed that local `pnpm pack` + `node -e` tests miss publish-path bugs
  because the local tree is always intact — only a full `npm publish` → fresh-install cycle
  can catch them.

  **`@llodev/pm-tasks-core@1.9.0 → 1.10.0`** (minor)

  - New: doctor probe `C-VER-1` (`label: "Released build (not a canary)"`) emits a **warn**
    when the running package version matches the `0.0.0-pr-*` canary pattern, so operators
    know the build is ephemeral and not production-safe.

  Repo-level additions (no source bump in adapters):

  - New: `.github/workflows/canary-publish.yml` — on PR `opened`/`synchronize`, stamps all
    publishable packages to `0.0.0-pr-<N>-<short-sha>`, publishes under dist-tag `pr-<N>`,
    then runs a `--from-canary` E2E smoke from the registry.
  - New: `.github/workflows/canary-cleanup.yml` — on PR close, unpublishes every canary
    version for that PR (best-effort; stale versions are harmless).
  - New: `scripts/checks/canary-version.mjs` — derives the canary version string and
    enumerates publishable packages from the workspace catalog (data-driven).
  - New: `--from-canary` flag in `scripts/checks/canary-e2e.mjs` — installs each package at
    its exact `0.0.0-pr-<N>-<sha>` version from the registry and runs the smoke flow,
    validating the published tarball rather than the local workspace.
  - Gate: `scripts/shell/pre-release-check.sh` now hard-aborts (`exit 1`) if any
    `pm-tasks/*/package.json` carries a `-pr-` version, preventing a leftover canary stamp
    from reaching a real release.

## 1.9.0

### Minor Changes

- [#20](https://github.com/llodev/skills/pull/20) [`78106ab`](https://github.com/llodev/skills/commit/78106ab42ed317ba865906d25701ade4532396ec) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - **pm-tasks v1.9.0 — Headless runtime + Plan-execution mode (Option E)**

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

## 1.8.0

### Minor Changes

- 1200b4e: v1.8.0 — Observability v1. pm-tasks-core-doctor CLI validates workspace config / autonomous allowlist / audit writability / (when probes are injected) MCP & network reach BEFORE the first publish attempt fails noisily. Adapter init bins expose `--doctor` for per-tool checks (C-TRL-1..3 + C-ASN-1..3, gated by auth env). Smart audit-log rotation (size + age + multi-tool, atomic, idempotent, gzipped archives, keep-N) replaces the rudimentary shell script; new `rotate-audit.mjs` CLI emits structured JSON status. Pre-release gate now blocks on doctor errors. Closes roadmap §2.4 O1 + O3.

## 1.7.0

### Minor Changes

- 1a4805b: v1.7.0 — Quality gates + dependabot sweep. Coverage floor (50/75/60/50 starting baseline, threshold ratcheted to current measured baseline per plan §Cross-cutting; ratchet up in future PRs) via Vitest v8 wired into `pnpm validate`. Package-size budget via `size-limit` (@size-limit/file preset) — per-package gzipped budgets enforced in `pnpm validate`. Skill-judge rubric golden master (SHA-256 + dimensions) + drift gate in `pre-release-check.sh`. Vitest 2.x → 3.2.6 across the workspace, closing 8 dependabot alerts (1 critical + 1 high + 6 medium: GHSA-5xrq-8626-4rwp, GHSA-fx2h-pf6j-xcff, GHSA-v6wh-96g9-6wx3, GHSA-4w7w-66w2-5vf9, GHSA-67mh-4wv8-2f99, GHSA-h67p-54hq-rp68). Dependabot major-ignore policy (typescript / vitest / ajv) now propagated to every npm directory.

## 1.6.1

### Patch Changes

- v1.6.1 — Security hotfix. Close CodeQL `js/file-system-race` (high) in `writeConfig` (`pm-tasks-core/src/init-lib.ts`). The original sequence used `access()` followed by `writeFile()`, leaving a race window where a parallel process could create the target between the check and the write and bypass the "already exists, aborting" guard. Switched to a single `writeFile()` with `{ flag: "wx" }` — the OS performs check-and-create atomically and the EEXIST error is translated to the same user-facing message. Public API unchanged.

  _Skill-judge gate bypassed via `SKIP_SKILL_JUDGE_GATE=1` per NOISE_BAND policy — only SKILL.md change in this release is the automatic `metadata.version` bump (1.6.0 → 1.6.1) by `sync-version.mjs`; no content drift, so the rubric score does not move._

## 1.6.0

### Minor Changes

- v1.6.0 — Public hardening. Adds `CONTRIBUTING.md` / `SECURITY.md` / `CODE_OF_CONDUCT.md` / `.github/ISSUE_TEMPLATE/` (bug + feature + config) / `.github/PULL_REQUEST_TEMPLATE.md` / `.github/CODEOWNERS` / `.github/dependabot.yml` (npm + github-actions, weekly grouped) / `.github/workflows/codeql.yml` (security-and-quality, weekly). New `marketplace.json` parity gate wired into `pnpm validate` (with regression test). `sync-version.mjs` now also mirrors version into `marketplace.json` plugin entries to keep the gate self-maintaining. Closes §2.3 H1–H6 + §2.2 R6.

  _Skill-judge gate bypassed via `SKIP_SKILL_JUDGE_GATE=1` per NOISE_BAND policy — only SKILL.md change in this release is the automatic `metadata.version` bump (1.5.0 → 1.6.0) by `sync-version.mjs`; no content drift, so the rubric score does not move._

## 1.5.0

### Minor Changes

- v1.5.0 — Adapters TypeScript migration, @llodev/pm-tasks-testkit, 7th canonical verb `task.move`, E2E canary.

  **Core (`@llodev/pm-tasks-core` 1.4.0 → 1.5.0)** — adds the 7th canonical verb `task.move` to the public contract.

  - New verb `task.move({ cardId, targetList })` formalizes the WIP transition that the autonomous-mode lifecycle has always required but no canonical verb expressed. `targetList` accepts the enum `"open" | "wip" | "done"` plus raw list IDs.
  - `task.move` is INDEPENDENT of `task.close`: move only repositions, close moves AND sets the completion flag. Useful in adapters where the visual transition and the closed-flag are separate operations (Asana section change vs. `completed: true`).
  - Schema regex updated to recognize `task.move` as canonical (no namespace prefix required).
  - `pm-tasks-core/schemas/adapter-manifest.schema.json` + `references/contract.md` + `references/crud-vocabulary.md` + `references/autonomous-mode.md` updated.
  - Contract-check (`scripts/checks/contract-check.mjs`) `CANONICAL_VERBS` Set updated; regression test added.
  - Additive only — existing consumers calling the original 6 verbs continue to work unchanged.

  **Adapters (`@llodev/pm-tasks-asana` 1.3.1 → 1.4.0, `@llodev/pm-tasks-trello` 1.3.1 → 1.4.0)** — full TypeScript migration mirroring core's v1.4.0 pattern.

  - Source moved from `scripts/init.mjs` to `src/bin/init.ts` (strict TS).
  - Build pipeline: `tsc` produces `dist/bin/init.{js,d.ts,js.map,d.ts.map}`. `dist/bin/init.js` is `chmod +x` so the bin works on install.
  - `package.json` exports map points at compiled `dist/`; `bin` field exposes `npx @llodev/pm-tasks-<tool> init`.
  - i18n parity tests migrated from `node:test` to Vitest 2.x (2/2 tests per adapter).
  - Both adapters now declare `task.move` in their `manifest.json` `verbs` array (7 canonical verbs) and document the MCP mapping in `references/operations.md`:
    - Trello: `mcp__trello__move_card({ cardId, idList })` resolving `"wip"`/`"done"`/`"open"` from `lists.<alias>` in `.trello.json`.
    - Asana: `mcp__claude_ai_Asana__update_tasks` with `memberships: [{ project, section }]` resolving via `defaults.<state>SectionAlias` in `.asana.json`.
  - Trello autonomous overlay (`pm-tasks-trello/references/autonomous.md`) updated to invoke canonical `task.move` at task start and before task close.
  - Backwards compatibility: consumers keep importing `@llodev/pm-tasks-core/init-lib` via the subpath; resolution now hits the v1.5.0 dist.

  **Testkit (`@llodev/pm-tasks-testkit` 0.0.0 → 0.1.0)** — new package, first release.

  - Pure TypeScript library. 7 in-memory fakes covering every canonical verb: `task.create`, `task.move`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`, `checklist.check`.
  - `createFakeAdapter({ idGenerator?, clock? })` returns an adapter-shaped object with all 7 verbs plus introspection (`getTask`, `getAllTasks`, `reset`).
  - `peerDependencies`: `@llodev/pm-tasks-core ^1.4.0`.
  - Useful for testing custom skills/adapters without hitting real MCP servers; 14/14 vitest tests cover each fake's behavior and idempotency.

  **Pipeline hardening — E2E canary** — `scripts/checks/canary-e2e.mjs` packs all 4 packages, npm-installs them in a clean sandbox, and exercises core/asana/trello/testkit smoke checks. Wired into `make e2e`, a new `.github/workflows/e2e.yml` (PR + manual dispatch), and as a gate in `release.yml`. Runs in ~3.4 s; catches tarball drift the snapshot test alone misses.

  **Skill-judge:** non-functional change (TS migration of adapter source + additive task.move documentation in SKILL.md verb lists). Expect Δ ≈ 0; ratchet baseline with updated `capturedAt` per v1.5.0 release per NOISE_BAND policy.

## 1.4.0

### Minor Changes

- Migrate @llodev/pm-tasks-core to TypeScript; add types export; switch from node:test to Vitest.

  - Source moved from `scripts/init-lib.mjs` to `src/init-lib.ts` (strict TS, 15 exported interfaces).
  - i18n primitives (registerI18nRoot, listLocales, loadStrings, interpolate) extracted to `src/i18n/registry.ts`; re-exported from init-lib for backwards compatibility.
  - Build pipeline: `tsc` produces `dist/init-lib.{js,d.ts,js.map,d.ts.map}` and `dist/i18n/registry.*`.
  - `package.json` exports map now points at compiled `dist/` (`.` root export + `./init-lib` subpath for backcompat).
  - Adds `main` and `types` top-level fields for tooling that doesn't read exports.
  - `prepublishOnly` hook ensures the build runs before npm publish; CI also runs `pnpm typecheck` + `pnpm -r build` before publish.
  - Test runner switched from `node:test` to Vitest 2.x (36/36 tests pass).
  - Tarball ships `dist/` + JSON schemas + i18n locales + `scripts/rotate-audit.sh`; no source, no tests, no tsbuildinfo.

  Skill-judge: non-functional change (TS migration of internal lib + test runner swap); expect Δ ≈ 0. Bypass with `SKIP_SKILL_JUDGE_GATE=1` per NOISE_BAND policy if needed.

  Backwards compatibility: consumers (adapters and external) keep importing `@llodev/pm-tasks-core/init-lib` — the resolution target changes from `scripts/init-lib.mjs` to `dist/init-lib.js` with the same runtime behavior.

## 1.3.2

### Patch Changes

- chore: reorganize repo structure

  Pure chore release. Zero runtime change. Splits across:

  - Reorganized root `scripts/` into `checks/`, `snapshots/`, `shell/` subfolders.
  - Dropped `SKILL.{pt-BR,es-ES}.md` translations (agents read canonical EN-only per agentskills.io spec).
  - Moved localized READMEs to `docs/i18n/` in root + each package (anticipates 5+ locales without cluttering package roots).
  - Updated validators (`validate-localized-paths.mjs`) and tarball snapshot for new paths.

  Skill-judge: bypassed with `SKIP_SKILL_JUDGE_GATE=1` — only SKILL.md change was decorative readme-selector block removal; expected delta = 0 (cosmetic-only). Per NOISE_BAND policy [-2, +2] bypass allowed.

  Meta package `@llodev/pm-tasks` not bumped — no tarball content changes, only peerDeps inheritance.

## 1.3.1

### Patch Changes

- Internal: close test coverage gaps from v1.1 review. Adds `pm-tasks-core/i18n/registry.test.mjs` (adapter-scoped `loadStrings` + `registerI18nRoot` edge cases) and covers `promptLocale` out-of-range error path in `init-lib.test.mjs`. New repo-level `scripts/validate-localized-paths.mjs` validator catches broken/unlocalized links in `*.{pt-BR,es-ES}.md` files (wired into `pnpm validate`). Skill-judge gate now documents `NOISE_BAND = 2` inline (`scripts/skill-judge-check.mjs`) and ships a golden-master rubric snapshot (`scripts/skill-judge-golden.json`) with consistency assertion against baseline. No runtime changes; tarball contents grow by 1 file (`i18n/registry.test.mjs` in pm-tasks-core).

## 1.3.0

### Minor Changes

- Introduce adapter `manifest.json` + custom-verbs extension API. Each adapter now declares which canonical verbs it implements plus any tool-specific verbs under a `<tool>.*` namespace. `contract-check.mjs` validates the manifest against `adapter-manifest.schema.json`, enforces the `<tool>.<verb>` namespace prefix, and cross-checks each declared verb against the adapter's `SKILL.md`. The same gate now permits additive-only changes to `contract.md` as non-major (deletions still require major). No runtime behaviour changes for existing consumers.

## 1.2.1

### Patch Changes

- [`9f14fe0`](https://github.com/llodev/skills/commit/9f14fe099d8e44fdc01aeb96cdde24aa4fa14527) - CI: release workflow now runs `validate` + `contract:check` + `pre-release` (skill-judge gate) before publish, and a new `scripts/tarball-snapshot.test.mjs` (wired into `pnpm validate`) detects regressions in each package's `files` field. npm publishes use `NPM_CONFIG_PROVENANCE=true` for supply-chain attestation (requires `id-token: write` permission in the workflow). No runtime changes.

## 1.2.0

### Minor Changes

- [`d8da409`](https://github.com/llodev/skills/commit/d8da409a0a08a481264f8bf64e7bf6a501a16793) - Add opt-in runtime attribution: agents can now stamp `commentPrefix`,
  `autonomousCommentPrefix` and `descriptionFooter` on every `task.create` and
  `task.comment.add`, with strings sourced from `pm-tasks-core/i18n` — fully
  locale-aware. Disabled by default; enable via `attribution.enabled: true` in
  config.json. Closes the v1.0 "Phase C" design item that was deferred from v1.1.

  Skill-judge gate: measured drift is within the documented noise band
  ([-2, +2]). Asana: 83 → 84 (Δ +1). Trello: 80 → 81 (Δ +1). No baseline
  ratchet required; gate bypassed via `SKIP_SKILL_JUDGE_GATE=1`.

## 1.1.1

### Patch Changes

- Ship pt-BR and es-ES translations of SKILL.md and README.md alongside the existing English originals. Adapters keep en-US as the canonical version; localized files follow the `<basename>.<lang-code>.md` convention. The package tarballs now include the localized files via the `files` field.

## 1.1.0

### Minor Changes

- Localize init prompts in en-US, pt-BR, es-ES. The first prompt of `npx @llodev/pm-tasks-{asana,trello} init` is now a language picker, and every subsequent prompt is rendered in the chosen locale. The selected locale is recorded as `locale` at the root of the config JSON. New helpers in `@llodev/pm-tasks-core/init-lib`: `promptLocale`, `loadStrings`, `interpolate`, `listLocales`, `registerI18nRoot`. JSON Schemas updated to accept `locale` as an enum. No breaking changes — existing configs without `locale` continue to validate and adapters keep emitting en-US prompts if the strings table is omitted.

## 1.0.1

### Patch Changes

- `init-lib.promptScope` now resolves the global config dir per OS:
  - `LLODEV_PM_TASKS_CONFIG_HOME` env var wins on any platform.
  - macOS / Linux: `XDG_CONFIG_HOME` → fallback `~/.config/llodev/pm-tasks/`.
  - Windows: `%APPDATA%\llodev\pm-tasks\`.
  - The prompt prints the resolved absolute path before asking the user to confirm.
- New named export `resolveGlobalConfigDir()` for adapters or docs tooling that need the same logic.
- New named export `aliasOf(name)`. Now Unicode-aware: NFD-normalizes and strips combining diacritics before slugging, so `"Em execução"` → `"em-execucao"` and `"Média"` → `"media"` instead of `"em-execu-o"` / `"m-dia"`.
- New named export `promptPick(label, choices, { defaultIndex, allowSkip })`. Single-choice prompt with optional default index and skip support — used by adapters to ask which list/section means "closed" and which member is the escalation target.
- `multiSelect`: empty input now selects ALL choices instead of returning an empty array. Prompt label updated to `"(empty = all)"`.

## 1.0.0

### Major Changes

- [`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838) - First stable release of the pm-tasks-\* family.

  - `@llodev/pm-tasks-core` — Phases 1–3 extraction pipeline (input → sections → generic card), 6 CRUD verbs (`task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`), autonomous-mode contract (allowlist + scope + rate-limit + audit log), shared init UX library.
  - `@llodev/pm-tasks-trello` — Trello adapter on the canonical generic card. Paste-friendly output, MCP-driven publish, autonomous mode against a board allowlist.
  - `@llodev/pm-tasks-asana` — Asana adapter with workspace/project/section + custom-field + subtask-inheritance support. Paste, MCP-driven publish, autonomous mode.

  Architecture, contract, and CRUD vocabulary documented in `docs/specs/2026-06-11-pm-tasks-design.md` and `docs/plans/2026-06-11-pm-tasks-v1.md`.

## 0.1.0 (unreleased)

- Initial extraction from `plan-to-task-cards` v0.
