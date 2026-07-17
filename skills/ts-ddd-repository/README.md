<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-repository

> Repository ports + adapters — Firestore/InMemory pair, `toFirestore`/`fromFirestore`, DI token, and contract tests.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-repository?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-repository)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ts-ddd` family.

What you get:

- **A Repository vs Query decision table** — load-to-mutate goes through a Repository returning a domain entity; read-for-display goes through a separate Query interface returning a DTO. Never mixed on the same interface.
- **The side-by-side adapter pattern** — a Firestore adapter and an InMemory adapter behind the same port + DI token symbol, so use-case tests substitute the in-memory one without `jest.fn()` stubs.
- **Mapping discipline** — `toFirestore`/`fromFirestore` live in dedicated mapper files, never inlined in an operation method; `firebase-admin/firestore.Timestamp` never leaks past the mapper into the domain (`Date` only).
- **Aggregate-boundary rules** — a single port owns writes to the whole aggregate; `save()` accepts a fully constructed, already-validated entity and never patches partial fields.
- **A `NEVER` list** covering real Firestore footguns: reading `snap.data()` without checking `snap.exists`, sharing entity references across round-trips instead of `toSnapshot()`/`tryCreate(structuredClone(...))`, and wiring an adapter via `useClass` without the token symbol.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ts-ddd-repository

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-repository
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                                            | What the agent does                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `"add a ProductRepository port with findBySlug and save"` | Emits the port interface, DI token symbol, and the InMemory + Firestore adapter pair                   |
| `"why does this list method leak Firestore Timestamp?"`   | Points to the mapper boundary rule — convert `Timestamp` ↔ `Date` inside `toFirestore`/`fromFirestore` |
| `"should this be a Repository or a Query?"`               | Applies the Repository vs Query (CQRS) decision table                                                  |
| `"review this adapter for aggregate-boundary violations"` | Checks that `save()` touches only one aggregate and receives a fully validated entity                  |

## Contents

| File                                       | Content                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                 | Trigger conditions, file layout, Repository vs Query table, core rules, and NEVER list.                                            |
| `references/repository-pattern.md`         | Port shape, DI token, InMemory adapter, dual-adapter test strategy, enums-in-fixtures rule, checklist.                             |
| `references/firestore-adapter.md`          | Firebase Admin SDK basics, subcollections, `Timestamp` conversions, fake-DB test harness, mapper helpers, aggregate-write caveats. |
| `examples/product.repository.ts`           | A repository port interface with intent-named methods and a DI token symbol.                                                       |
| `examples/in-memory-product.repository.ts` | The InMemory adapter counterpart, used directly in use-case tests via the same DI token.                                           |

## License

MIT — see [LICENSE](./LICENSE).
