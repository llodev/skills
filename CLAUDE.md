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
