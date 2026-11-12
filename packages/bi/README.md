# @llodev/bi

Meta-package for the `@llodev/bi-*` family. Installs the dashboard and chart skills — dashboards and charts that state one conclusion before the reader checks an axis — in one command.

## Install

```bash
npm i @llodev/bi
```

This pulls in:

- [`@llodev/bi-dashboard`](https://www.npmjs.com/package/@llodev/bi-dashboard) — Design dashboards and charts that state one conclusion before the reader checks an axis.

After install, follow each skill's SKILL.md for triggering conventions and usage.

## Why a meta-package?

If you only need one member, install it directly (`npm i @llodev/bi-dashboard`). The meta-package is convenience for the whole family.

## Versioning

This meta-package carries its own version line, decoupled from the skills (on the 0.x line). Skills are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
