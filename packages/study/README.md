# @llodev/study

Meta-package for the `@llodev/study-*` family. Installs the study abstract skills — didactic abstracts the reader can use with the source closed — in one command.

## Install

```bash
npm i @llodev/study
```

This pulls in:

- [`@llodev/study-abstract`](https://www.npmjs.com/package/@llodev/study-abstract) — turn any study material into a didactic abstract the reader can use with the source closed.

After install, follow each skill's SKILL.md for triggering conventions and usage.

## Why a meta-package?

If you only need one member, install it directly (`npm i @llodev/study-abstract`). The meta-package is convenience for the whole family.

## Versioning

This meta-package carries its own version line, decoupled from the skills (on the 0.x line). Skills are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
