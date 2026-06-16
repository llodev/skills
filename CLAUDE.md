# @llodev/skills — agent guide

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
- `make release-version` is now gated by `make pre-release`. If any `SKILL.md` was modified vs `origin/main` and `scripts/skill-judge-baseline.json` was NOT updated, the gate blocks. To proceed: run `make skill-judge` with current scores, ratchet the baseline if scores improved (Δ ≥ +3), OR bypass with `SKIP_SKILL_JUDGE_GATE=1 make release-version` when drift is within the noise band ([-2, +2]) — annotate that decision in the changeset summary.

## Release convention

- **One PR = one changeset = one release.** Never batch multiple changesets across PRs — `changeset version` collapses them into a single bump (highest minor wins) and intermediate versions never reach npm. See [`.changeset/README.md` § Release granularity](.changeset/README.md#release-granularity).
- **Branch naming: the version is the branch name.** Examples: `v1.2.0`, `v1.2.1`, `v1.3.0`. No prefixes (`feat/`, `release/`), no suffixes (`-attribution`, `-hardening`) — the SKILL.md / changeset / CHANGELOG already carry the theme.
- **Hotfix branches:** same rule. The branch is the version (`v1.2.2`), not `hotfix/<thing>`.
- **PR title:** `feat(release): vX.Y.Z — <one-line theme>` (theme goes in the title, not the branch).
