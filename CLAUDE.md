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
- `make pre-release` also runs the **rubric drift gate** (unconditionally). This checks that `scripts/snapshots/skill-judge-rubric.json` still matches the installed `~/.claude/skills/skill-judge/SKILL.md`. If it drifts (new dimension, weight change, content edit), the gate blocks. To ratchet: run `make skill-judge-rubric-snapshot`, review the diff, commit the updated snapshot. The gate is silently skipped when the rubric SKILL.md is not installed (clean clones, CI).

## Release convention

- **One PR = one changeset = one release.** Never batch multiple changesets across PRs — `changeset version` collapses them into a single bump (highest minor wins) and intermediate versions never reach npm. See [`.changeset/README.md` § Release granularity](.changeset/README.md#release-granularity).
- **Branch naming: `pmt-<skill>-v<X.Y.Z>`.** `pmt` = project-management-tasks; `<skill>` = the released package's short name (`core`, `asana`, `trello`, `jira`, `linear`, …); `<X.Y.Z>` = **that package's** version being released. Examples: `pmt-asana-v1.9.0`, `pmt-trello-v1.8.0`, `pmt-core-v1.14.0`. The skill segment disambiguates the version across packages (asana 1.8.0 and trello 1.8.0 no longer collide as a bare `v1.8.0`). No `feat/` / `release/` prefixes and no theme suffixes (`-attribution`, `-hardening`) — the SKILL.md / changeset / CHANGELOG already carry the theme.
- **Hotfix branches:** same rule. The branch is `pmt-<skill>-v<X.Y.Z>` at the patch version (`pmt-asana-v1.9.1`), not `hotfix/<thing>`.
- **PR title:** `feat(release): <skill> vX.Y.Z — <one-line theme>` (skill + version + theme in the title).
