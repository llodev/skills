# @llodev/pm-tasks

Meta-package for the `@llodev/pm-tasks-*` family. Installs the core skill plus every published adapter (Trello, Asana) in one command.

## Install

```bash
npm i @llodev/pm-tasks
```

This pulls in:

- [`@llodev/pm-tasks-core`](https://www.npmjs.com/package/@llodev/pm-tasks-core) — shared extraction + CRUD vocabulary.
- [`@llodev/pm-tasks-trello`](https://www.npmjs.com/package/@llodev/pm-tasks-trello) — Trello adapter.
- [`@llodev/pm-tasks-asana`](https://www.npmjs.com/package/@llodev/pm-tasks-asana) — Asana adapter.

After install, follow each adapter's README for MCP setup and `init`.

## Why a meta-package?

If you only need one adapter, install it directly (`npm i @llodev/pm-tasks-trello` — `@llodev/pm-tasks-core` comes as a dependency). The meta-package is convenience for the whole family.

## Versioning

This package follows the v1.0.0 release of the family. Adapters are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped in lockstep at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
