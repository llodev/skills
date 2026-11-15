# @llodev/ui

Meta-package for the `@llodev/ui-*` family. Installs the image-first UI design skills — art-direct a UI in image models first, then build it in code and verify it against the mockup — in one command.

## Install

```bash
npm i @llodev/ui
```

This pulls in:

- [`@llodev/ui-art-direction`](https://www.npmjs.com/package/@llodev/ui-art-direction) — Art-direct a UI in image models first, then build it in code and verify it against the mockup.

After install, follow each skill's SKILL.md for triggering conventions and usage.

## Why a meta-package?

If you only need one member, install it directly (`npm i @llodev/ui-art-direction`). The meta-package is convenience for the whole family.

## Versioning

This meta-package carries its own version line, decoupled from the skills (on the 0.x line). Skills are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
