# @llodev/arc

Meta-package for the `@llodev/arc-*` family. Installs the architecture decision skills, which turn a project idea into scope, boundaries, stack, delivery plan, and ADRs, in one command.

## Install

```bash
npm i @llodev/arc
```

This pulls in:

- [`@llodev/arc-decisions`](https://www.npmjs.com/package/@llodev/arc-decisions) — Guides architecture and tech-stack decisions for a new software project, from idea and MVP scope to ADRs.

After install, follow each skill's SKILL.md for triggering conventions and usage.

## Why a meta-package?

If you only need one member, install it directly (`npm i @llodev/arc-decisions`). The meta-package is convenience for the whole family.

## Versioning

This meta-package carries its own version line, decoupled from the skills (on the 0.x line). Skills are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
