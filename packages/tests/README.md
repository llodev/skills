# @llodev/tests

Meta-package for the `@llodev/tests-*` family. Installs the HTTP testing skills — full-coverage `.http` suites — in one command.

## Install

```bash
npm i @llodev/tests
```

This pulls in:

- [`@llodev/tests-http`](https://www.npmjs.com/package/@llodev/tests-http) — generate and sync full-coverage .http suites for HTTP APIs — project discovery, NestJS and DRF adapters, no invented routes.

After install, follow each skill's SKILL.md for triggering conventions and usage.

## Why a meta-package?

If you only need one member, install it directly (`npm i @llodev/tests-http`). The meta-package is convenience for the whole family.

## Versioning

This meta-package carries its own version line, decoupled from the skills (on the 0.x line). Skills are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
