# AGENTS.md

Rules for anyone editing this repo, human or agent. This file is the single source of agent instructions: Cursor and Codex read it directly, and `CLAUDE.md` imports it. Change rules here, not in tool-specific files.

## Universal rules

1. Don't assume. Don't hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.

## Dev workflow

- `make hooks` once per clone — installs lefthook (prettier on staged files, gitleaks, Conventional Commits).
- `make validate` after schema, contract, or skill-frontmatter changes (not covered by hooks).
- `make help` lists everything else. Prefer the Makefile over remembering `pnpm` script names.
- Releases: `make changeset` → `make release-version` → `make release-publish` (only when consciously shipping). Each adapter's `bin` MUST equal the package name and its entry script MUST run unconditionally — lesson from v1.0.1.
- `make release-version` is now gated by `make pre-release`. If any `SKILL.md` was modified vs `origin/main` and `scripts/snapshots/skill-judge-baseline.json` was NOT updated, the gate blocks. To proceed: run `make skill-judge` with current scores, ratchet the baseline if scores improved (Δ ≥ +3), OR bypass with `SKIP_SKILL_JUDGE_GATE=1 make release-version` when drift is within the noise band ([-2, +2]) — annotate that decision in the changeset summary.
- `make pre-release` also runs the **rubric drift gate** (unconditionally). This checks that `scripts/snapshots/skill-judge-rubric.json` still matches the installed `~/.claude/skills/skill-judge/SKILL.md`. If it drifts (new dimension, weight change, content edit), the gate blocks. To ratchet: run `make skill-judge-rubric-snapshot`, review the diff, commit the updated snapshot. The gate is silently skipped when the rubric SKILL.md is not installed (clean clones, CI).

## Release convention

- **One PR = one changeset = one release.** Never batch multiple changesets across PRs — `changeset version` collapses them into a single bump (highest minor wins) and intermediate versions never reach npm. See [`.changeset/README.md` § Release granularity](.changeset/README.md#release-granularity).
- **Branch naming: `pmt-<skill>-v<X.Y.Z>`.** `pmt` = project-management-tasks; `<skill>` = the released package's short name (`core`, `asana`, `trello`, `jira`, `linear`, …); `<X.Y.Z>` = **that package's** version being released. Examples: `pmt-asana-v1.9.0`, `pmt-trello-v1.8.0`, `pmt-core-v1.14.0`. The skill segment disambiguates the version across packages (asana 1.8.0 and trello 1.8.0 no longer collide as a bare `v1.8.0`). No `feat/` / `release/` prefixes and no theme suffixes (`-attribution`, `-hardening`) — the SKILL.md / changeset / CHANGELOG already carry the theme.
- **Hotfix branches:** same rule. The branch is `pmt-<skill>-v<X.Y.Z>` at the patch version (`pmt-asana-v1.9.1`), not `hotfix/<thing>`.
- **PR title:** `feat(release): <skill> vX.Y.Z — <one-line theme>` (skill + version + theme in the title).

## First publish of a new package

`release.yml` publishes with npm Trusted Publishing (OIDC). It has no long-lived registry token. A trusted publisher can be attached only to a package that **already exists** on npm. The first version of a package that has never been published must be published from this machine with the npm CLI, by the maintainer, before merge. The workflow cannot create the package, and it fails with `E404 ... PUT` if the package or its trusted publisher is missing.

When a change adds a publishable package, or bumps one that `npm view <name> version` cannot find (`E404`):

1. Do not merge, and do not say the release workflow will publish that package, until the maintainer has published it once locally and configured the trusted publisher.
2. Do not run `npm publish` yourself. Print the commands and wait.
3. Tell them to configure the trusted publisher on npm right after that publish, and that a config which has never published expires 48 hours after it is created (`docs/publishing-guide.md` §12).

```bash
npm whoami
npm view @llodev/<name> version          # E404 → this is the first publish
cd skills/<name>                         # or packages/<name> for a meta-package
npm publish --access public --dry-run    # confirm the tarball, then:
npm publish --access public
cd -
npm trust github "@llodev/<name>" --repo llodev/skills --file release.yml --allow-publish -y
```

Run `npm publish` from the package directory. The repo root is a private pnpm workspace, not an npm workspace, so `--workspace` from the root does not select the package.

`canary-publish.yml` only publishes `@llodev/pm-tasks-*` (`listCanaryPackages`). Add the canary trusted publisher (`--file canary-publish.yml --allow-publish`) only when that package is added to that list. An unused canary config expires in 48 hours.

Later versions go through `make release-version` and `release.yml`. Details: `docs/publishing-guide.md` §12.

## Explore with CodeGraph first

This repo is indexed by CodeGraph (`.codegraph/`, local to each machine). Before grep, find or opening files, use the MCP tool `codegraph_explore` or the CLI `codegraph explore "<symbols, files or a question>"`: it returns the relevant source, the call paths and what depends on a symbol. Run `codegraph sync` if results look stale, `codegraph init` if the index is missing. Fall back to grep for Markdown, JSON and YAML.

## Where files go

| Path                                                      | Holds                                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `skills/<name>/`                                          | one published skill: `SKILL.md`, `references/`, and for adapters `src/`, `tests/`, `schemas/`, `i18n/`               |
| `packages/`                                               | meta-packages (`pm-tasks`, `ts-ddd`) and the shared `pm-tasks-testkit`                                               |
| `scripts/checks/`, `scripts/shell/`, `scripts/snapshots/` | repo checks behind `make` and `pnpm validate`, release gates, golden snapshots                                       |
| `configs/`                                                | tool configs shared by several packages (`typescript/tsconfig.base.json`, extended by every package `tsconfig.json`) |
| `docs/`                                                   | roadmap, publishing guide, localized READMEs (`i18n/`), implementation plans (`plans/`) and design specs (`specs/`)  |
| `.changeset/`, `.claude-plugin/`, `.github/`              | Changesets, the Claude plugin marketplace manifest and CI; tools require them at the root                            |

Root files stay at the root only when a tool requires it there: `package.json` (also holds the `size-limit` budgets), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json` (the `tsc -b` solution file), `eslint.config.js`, `vitest.config.ts`, `.prettierrc.json`, `.prettierignore`, `lefthook.yml`, `Makefile`. Specs and plans live in `docs/specs/` and `docs/plans/`, never in folders named after a tool or workflow framework. Local workflow scratch (`sandbox/`, `logs/`, `.superpowers/`) is gitignored and never committed.

## Published content

Everything listed in a package's `files` field is installed into other people's projects. It must make sense without this repository: no links to `docs/specs`, `docs/roadmap.md`, repo scripts, `AGENTS.md`/`CLAUDE.md` or local scratch folders, no "this repo" wording, no internal roadmap codes or version promises. `docs/plans/*.md` in the pm-tasks plan-execution docs is fine, because it means the consumer's own plans. `pnpm validate` enforces this with `scripts/checks/published-content-lint.mjs`; repo-internal documentation goes in `docs/`.

## Language

Code, identifiers, comments, docs and commit messages are in English. Localized content lives only in `i18n/` folders and in `docs/i18n/`.
