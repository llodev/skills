# @llodev/ts-ddd

Meta-package for the `@llodev/ts-ddd-*` family. Installs every skill for building a TypeScript + DDD codebase — entities, value objects, DTOs, use cases, repositories, controllers, domain services — plus the CQRS read-side companion, in one command.

## Install

```bash
npm i @llodev/ts-ddd
```

This pulls in:

- [`@llodev/ts-ddd-entity`](https://www.npmjs.com/package/@llodev/ts-ddd-entity) — domain entities (`Entity`, `Result`, state transitions).
- [`@llodev/ts-ddd-value-object`](https://www.npmjs.com/package/@llodev/ts-ddd-value-object) — value objects (closed-set and composite VOs).
- [`@llodev/ts-ddd-dto`](https://www.npmjs.com/package/@llodev/ts-ddd-dto) — Zod-backed contracts and DTOs.
- [`@llodev/ts-ddd-use-case`](https://www.npmjs.com/package/@llodev/ts-ddd-use-case) — application-layer use cases and services.
- [`@llodev/ts-ddd-repository`](https://www.npmjs.com/package/@llodev/ts-ddd-repository) — repository contracts and Firestore/in-memory adapters.
- [`@llodev/ts-ddd-controller`](https://www.npmjs.com/package/@llodev/ts-ddd-controller) — HTTP controllers wiring use cases to routes.
- [`@llodev/ts-ddd-domain-service`](https://www.npmjs.com/package/@llodev/ts-ddd-domain-service) — pure domain services and policies.
- [`@llodev/ts-query-cqrs`](https://www.npmjs.com/package/@llodev/ts-query-cqrs) — read-side queries and DTO projections.

After install, follow each skill's SKILL.md for triggering conventions and usage.

## Why a meta-package?

If you only need one layer, install it directly (`npm i @llodev/ts-ddd-entity`). The meta-package is convenience for the whole family.

## Versioning

This meta-package carries its own version line, decoupled from the skills (on the 0.x line). Skills are pinned via `peerDependencies` so npm warns on incompatible upgrades. Bumped at release time via Changesets.

## License

MIT — see [LICENSE](./LICENSE).
