# Contributing to @llodev/skills

Thank you for contributing to the skills monorepo. This guide covers the local development workflow, release conventions, and quality gates that keep the project stable and professional.

## Quick start

First clone and set up the development environment:

```bash
git clone https://github.com/llodev/skills.git
cd skills
make hooks       # install lefthook — runs on every commit
pnpm install     # install workspace dependencies
pnpm validate    # run frontmatter + schema + link checks
```

You're ready to work. See [`Makefile`](Makefile) for the full list of targets.

## Branch naming

The branch **is the version**. Examples:

- Feature branch: `v1.6.0`, `v1.6.1`, `v1.7.0`
- Documentation branch: `docs/contributing-guide`, `docs/roadmap-update`
- Hotfix branch: `v1.6.2` (same rule as features)

**No prefixes** (`feat/`, `release/`). **No suffixes** (`-attribution`, `-hardening`). The theme goes in the PR title and the changeset, not the branch.

## Releases: 1 PR = 1 changeset = 1 release

This repo follows a **strict one-to-one mapping** between PRs, changesets, and npm releases.

**Why this matters:** [`pnpm changeset version`](https://github.com/changesets/changesets) collapses multiple pending changesets into a single version bump. If you batch 5 changesets in one PR, intermediate versions (v1.3.0, v1.3.1, v1.4.0, etc.) never exist on npm — only the highest bump ships. Consumers can't test intermediate milestones, and bisect granularity is lost.

**The fix:** One PR per phase, one changeset per PR, one version per release.

For detailed flow — record intent with `make changeset`, apply with `make release-version`, publish with `make release-publish` — see [`.changeset/README.md`](.changeset/README.md).

## Commits & hooks

### Conventional Commits

Every commit message must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
type(scope): subject

optional body
```

Valid types: `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `build` · `ci` · `perf` · `style` · `revert`

Example: `docs(repo): add CONTRIBUTING.md` or `fix(pm-tasks-asana): handle empty subtask lists`

### Lefthook gates

When you commit, lefthook runs three hooks in parallel:

1. **prettier** — formats staged files (`.ts`, `.tsx`, `.js`, `.json`, `.yml`, `.md`, etc.). Changes are auto-staged.
2. **gitleaks** — scans for secrets. Fails hard if anything looks like a credential.
3. **conventional** — enforces Conventional Commits on the commit message.

**Do NOT skip hooks** with `--no-verify`. It disables all three checks; use it only in genuine emergencies (and let the team know).

If prettier changes your file, re-stage and commit again.

## Per-package tests

Run tests for a single package:

```bash
pnpm --filter @llodev/pm-tasks-asana test
pnpm --filter @llodev/pm-tasks-trello test
pnpm --filter @llodev/pm-tasks-core test
```

Run the full test suite:

```bash
pnpm test
```

Tests live in `<package>/__tests__/` and use [Vitest](https://vitest.dev/).

## Testing a canary build of a PR

Every PR automatically publishes a canary build to npm under the dist-tag `pr-<N>`. To test the published packages for PR #42:

```bash
# Install adapter + core together — always pair them so npm dedupes core to this PR's canary
npm install @llodev/pm-tasks-trello@pr-42 @llodev/pm-tasks-core@pr-42
# Other adapters: @llodev/pm-tasks-asana@pr-42, @llodev/pm-tasks-testkit@pr-42
```

All packages in a PR share the same tag. Canary versions use the `0.0.0-pr-<N>-<sha>` scheme and are unpublished automatically when the PR closes. See [`docs/publishing-guide.md` § 12](docs/publishing-guide.md#12-canary-publish-lifecycle-pm-tasks-v110) for the full lifecycle.

## Adding a new adapter

Reserved scaffolds exist for Jira, Linear, Notion, ClickUp, Monday, Bitrix24, and Todoist. To implement one:

1. **Claim the scaffold** — e.g., `pm-tasks/pm-tasks-jira/`. Update the `SKILL.md` frontmatter to mark it active (remove the "scaffold" note).

2. **Copy from an existing adapter** — Start with the Asana or Trello folder. Copy the TypeScript setup, `tsconfig.json`, `vitest.config.ts`, and `package.json` structure.

3. **Implement the 7 canonical verbs** — `task.create` · `task.move` · `checklist.check` · `task.close` · `task.due-date.set` · `task.assignee.add` · `task.comment.add`. The authoritative spec lives in [`pm-tasks/pm-tasks-core/references/contract.md`](pm-tasks/pm-tasks-core/references/contract.md) — defer to it for argument shapes, sentinels, and the autonomous-mode contract; do not duplicate the list here.

4. **Add config schema** — Create `.asana.json` or equivalent at the repo root (or per-package) to document auth/setup.

5. **Wire into CI** — Add the package to `vitest.workspace.ts` and the root tarball snapshot in `scripts/checks/canary-e2e.mjs`.

6. **Open a PR** with a changeset bumping `@llodev/pm-tasks-core` to `minor` (new adapter is additive, not breaking).

For the full guide on SDK architecture, library headless mode, and autonomous MCP bridges — see the roadmap under **F14** (library/SDK) and **F15** (SDD bridge) in [`docs/roadmap.md`](docs/roadmap.md). Full adapter deep dives are deferred to v1.7+ releases.

## SKILL.md edits & the skill-judge gate

Every `SKILL.md` in `pm-tasks/*/` is scored by the skill-judge rubric — a dimensioned quality assessment (tone, scope clarity, example completeness, etc.).

### When you modify a SKILL.md

`make release-version` is gated by `make pre-release`, which enforces the **skill-judge ratchet**:

- If any `pm-tasks/*/SKILL.md` changed on this branch vs `origin/main` AND `scripts/snapshots/skill-judge-baseline.json` was NOT updated, the gate blocks.

### The NOISE_BAND policy

The gate uses a tolerance window to distinguish measurement variance from real regressions. Concrete thresholds:

| Δ (current − baseline) | Verdict                    | Action                                                                                                                           |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Δ ≥ +3                 | PASS + ratchet recommended | Update the baseline (`score` + `version` + `capturedAt` fields); commit on this branch. The gate unblocks automatically.         |
| 0 ≤ Δ ≤ +2             | PASS (within noise band)   | No baseline change required. Proceed without bypass.                                                                             |
| -2 ≤ Δ < 0             | WARN (within noise band)   | No baseline change. Bypass with `SKIP_SKILL_JUDGE_GATE=1 make release-version` and note the drift in the changeset summary.      |
| Δ < -2                 | FAIL (real regression)     | Investigate. Either fix the regression, ratchet baseline with rationale, or roll back the SKILL.md edit. Do NOT bypass silently. |

### Workflow

1. **Modify `SKILL.md`** and stage your changes.
2. **Run `make skill-judge`** — the rubric scores each modified `SKILL.md`. Compare against `scripts/snapshots/skill-judge-baseline.json`.
3. **If Δ ≥ +3:** ratchet the baseline entry (`score` + `version` + `capturedAt`), commit it on your branch.
4. **If Δ ∈ [-2, +2]:** proceed normally (bypass automatic on 0..+2, note on -2..0).
5. **If Δ < -2:** don't skip — investigate and fix or ratchet with justification.

See `scripts/checks/skill-judge-check.mjs` for gate implementation.

## Filing issues vs asking questions

**Use Discussions for:**

- Questions ("How do I use pm-tasks with my custom PM tool?")
- Ideas and feature brainstorms
- "Is this skill right for me?"
- Help finding the right adapter or workflow

**Use Issues for:**

- Bug reports (with repro steps and version)
- Feature requests (with concrete scope and acceptance criteria)
- Regressions tied to a specific version
- Documentation gaps or errors

Clear issue templates are in `.github/ISSUE_TEMPLATE/`.

## Universal rules

From the project guide [`CLAUDE.md`](CLAUDE.md):

1. **Don't assume.** Don't hide confusion. Surface tradeoffs.
2. **Minimum code.** Solve the problem. Nothing speculative.
3. **Touch only what you must.** Clean up only your own mess.
4. **Define success criteria.** Loop until verified.

## Help & reference

- **Makefile** — `make help` lists all targets.
- **Local dev** — full details in [`README.md` § Local development](README.md#local-development).
- **Changesets workflow** — record, version, publish in [`.changeset/README.md`](.changeset/README.md).
- **Skills spec** — agent compatibility, frontmatter schema at [agentskills.io](https://agentskills.io).
- **Roadmap** — priorities and timeline in [`docs/roadmap.md`](docs/roadmap.md).
