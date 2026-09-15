<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# llodev/skills

> Collection of [Agent Skills](https://agentskills.io) created by [@lloliveiradev](https://github.com/lloliveiradev) for Claude Code, Cursor, Codex, Windsurf, and any agent that speaks the open Skills spec. Skills are packaged instructions and scripts that extend agent capabilities across development, documentation, planning, and professional workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Each skill in this repo ships as an **npm package**, a **Claude Code plugin**, and a **Vercel `skills add` entry**. Pick whichever channel your agent speaks — the skills are identical across all three.

## Install

Pick the channel that matches your agent.

**Claude Code (or any agent supporting the marketplace):**

```bash
/plugin marketplace add llodev/skills
/plugin install pm-tasks-core pm-tasks-trello pm-tasks-asana
```

**npm (skillpm, skills-npm, or `node_modules` bundling):**

```bash
npm i @llodev/pm-tasks    # meta — installs the whole family via peerDeps
```

**Vercel `skills add`:**

```bash
npx skills add llodev/skills/skills/pm-tasks-trello
```

See the [publishing guide](docs/publishing-guide.md) for how the three channels work together.

## Catalog

### `pm-tasks-*` — Project Management adapters

Turn implementation plans into PM tasks and operate them via paste, MCP publish, or autonomous write-through. Five packages are released — the shared `pm-tasks-core` plus the Trello, Asana, Jira, and Linear adapters. Plus `@llodev/pm-tasks-testkit` — in-memory fakes for the 7 base verbs, for testing custom skills.

**Headless runtime (`/adapter` subpath):** import `createAdapter` from any released adapter to drive the canonical verbs from your own scripts/agents without invoking the skill:

```ts
import { createAdapter } from "@llodev/pm-tasks-trello/adapter";

const adapter = await createAdapter({ configPath: ".trello.json", mcp });
const r = await adapter.taskMove({ taskId: "card-1", targetListOrSectionId: "wip-list" });
if (!r.ok) throw new Error(`task.move failed: ${r.code}`);
```

`mcp: (toolName, args) => Promise<unknown>` is a caller-supplied callback that proxies to the agent runtime's `mcp__*` tools. Same shape for `@llodev/pm-tasks-asana/adapter`. Full contract in [publishing-guide § 11 — Headless runtime](docs/publishing-guide.md#11-headless-runtime-pm-tasks-v19) and per-adapter SKILL.md.

| Package                     | Status      | Source                                                   | npm                                 | Vercel CLI                                            |
| --------------------------- | ----------- | -------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.1.1   | [packages/pm-tasks/](packages/pm-tasks/)                 | `npm i @llodev/pm-tasks`            | —                                                     |
| `@llodev/pm-tasks-core`     | ✅ v1.16.0  | [skills/pm-tasks-core/](skills/pm-tasks-core/)           | `npm i @llodev/pm-tasks-core`       | `npx skills add llodev/skills/skills/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.11.0  | [skills/pm-tasks-asana/](skills/pm-tasks-asana/)         | `npm i @llodev/pm-tasks-asana`      | `npx skills add llodev/skills/skills/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.11.0  | [skills/pm-tasks-trello/](skills/pm-tasks-trello/)       | `npm i @llodev/pm-tasks-trello`     | `npx skills add llodev/skills/skills/pm-tasks-trello` |
| `@llodev/pm-tasks-testkit`  | ✅ v0.2.0   | [packages/pm-tasks-testkit/](packages/pm-tasks-testkit/) | `npm i -D @llodev/pm-tasks-testkit` | —                                                     |
| `@llodev/pm-tasks-jira`     | ✅ v1.3.0   | [skills/pm-tasks-jira/](skills/pm-tasks-jira/)           | `npm i @llodev/pm-tasks-jira`       | `npx skills add llodev/skills/skills/pm-tasks-jira`   |
| `@llodev/pm-tasks-linear`   | ✅ v1.2.0   | [skills/pm-tasks-linear/](skills/pm-tasks-linear/)       | `npm i @llodev/pm-tasks-linear`     | `npx skills add llodev/skills/skills/pm-tasks-linear` |
| `pm-tasks-notion`           | 🔒 scaffold | [skills/pm-tasks-notion/](skills/pm-tasks-notion/)       | —                                   | —                                                     |
| `pm-tasks-clickup`          | 🔒 scaffold | [skills/pm-tasks-clickup/](skills/pm-tasks-clickup/)     | —                                   | —                                                     |
| `pm-tasks-monday`           | 🔒 scaffold | [skills/pm-tasks-monday/](skills/pm-tasks-monday/)       | —                                   | —                                                     |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [skills/pm-tasks-bitrix24/](skills/pm-tasks-bitrix24/)   | —                                   | —                                                     |
| `pm-tasks-todoist`          | 🔒 scaffold | [skills/pm-tasks-todoist/](skills/pm-tasks-todoist/)     | —                                   | —                                                     |

> [!NOTE]
> `scaffold` skills are reserved namespaces with a placeholder `SKILL.md`. Their description tells agents NOT to activate until a real adapter ships. 5 scaffolds remain: notion, clickup, monday, bitrix24, todoist.

> [!NOTE]
> `@llodev/pm-tasks` (meta) is versioned independently from the family via `onlyUpdatePeerDependentsWhenOutOfRange`. The family is at `v1.x`; meta jumped to `v3.0.0` before decoupling (currently `v3.1.1`) and will stay at `v3.x` until the family reaches `v2.0.0`.

**Verb coverage.** The canonical vocabulary is 7 base verbs plus 3 optional ones; adapters declare what they support in `manifest.json`, and the runtime returns `UNSUPPORTED_VERB` for anything omitted. Adapters may also declare namespaced custom verbs.

| Adapter    | Base 7 | `task.parent.set` | `task.estimate.set` | `task.sprint.set` | Custom                                     |
| ---------- | ------ | ----------------- | ------------------- | ----------------- | ------------------------------------------ |
| **linear** | ✅     | ✅                | ✅                  | ✅                | —                                          |
| **jira**   | ✅     | ✅                | ✅                  | —                 | —                                          |
| **trello** | ✅     | —                 | —                   | —                 | `trello.task.batch-create-with-checklists` |
| **asana**  | ✅     | —                 | —                   | —                 | —                                          |

### `django-*` — Django design skills

Pure **knowledge** skills for designing production-grade Django apps — no MCP, no config, no init. They activate on the prompt and inject expert decisions (trade-offs, anti-patterns, decision trees), not basic ORM syntax. First member ships schema design; more Django-context skills are planned (see [roadmap](docs/roadmap.md)).

| Package                        | Status    | Source                                                       | npm                                  | Vercel CLI                                                 |
| ------------------------------ | --------- | ------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| `@llodev/django-schema-design` | ✅ v0.2.0 | [skills/django-schema-design/](skills/django-schema-design/) | `npm i @llodev/django-schema-design` | `npx skills add llodev/skills/skills/django-schema-design` |

> [!NOTE]
> `django-schema-design` covers the **database-schema** layer (PK strategy, indexes, constraints, migrations). A future `django-model-design` sibling is reserved for the **model layer** (relationships, managers, fat-vs-thin models).

### `@llodev/ts-ddd` — TypeScript DDD design skills

Pure **knowledge** skills for building a TypeScript + DDD codebase — no MCP, no config, no init. They activate on the prompt and inject expert decisions (`Result`-based validation, `cloneWith` state transitions, enum-backed closed sets, Firestore/InMemory adapter pairs) for each architectural layer, plus a CQRS read-side companion.

| Package                         | Status    | Source                                                         | npm                                   | Vercel CLI                                                  |
| ------------------------------- | --------- | -------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `@llodev/ts-ddd` _(meta)_       | ✅ v0.1.0 | [packages/ts-ddd/](packages/ts-ddd/)                           | `npm i @llodev/ts-ddd`                | —                                                           |
| `@llodev/ts-ddd-entity`         | ✅ v0.1.0 | [skills/ts-ddd-entity/](skills/ts-ddd-entity/)                 | `npm i @llodev/ts-ddd-entity`         | `npx skills add llodev/skills/skills/ts-ddd-entity`         |
| `@llodev/ts-ddd-value-object`   | ✅ v0.1.0 | [skills/ts-ddd-value-object/](skills/ts-ddd-value-object/)     | `npm i @llodev/ts-ddd-value-object`   | `npx skills add llodev/skills/skills/ts-ddd-value-object`   |
| `@llodev/ts-ddd-dto`            | ✅ v0.1.0 | [skills/ts-ddd-dto/](skills/ts-ddd-dto/)                       | `npm i @llodev/ts-ddd-dto`            | `npx skills add llodev/skills/skills/ts-ddd-dto`            |
| `@llodev/ts-ddd-use-case`       | ✅ v0.1.0 | [skills/ts-ddd-use-case/](skills/ts-ddd-use-case/)             | `npm i @llodev/ts-ddd-use-case`       | `npx skills add llodev/skills/skills/ts-ddd-use-case`       |
| `@llodev/ts-ddd-repository`     | ✅ v0.1.0 | [skills/ts-ddd-repository/](skills/ts-ddd-repository/)         | `npm i @llodev/ts-ddd-repository`     | `npx skills add llodev/skills/skills/ts-ddd-repository`     |
| `@llodev/ts-ddd-controller`     | ✅ v0.1.0 | [skills/ts-ddd-controller/](skills/ts-ddd-controller/)         | `npm i @llodev/ts-ddd-controller`     | `npx skills add llodev/skills/skills/ts-ddd-controller`     |
| `@llodev/ts-ddd-domain-service` | ✅ v0.1.0 | [skills/ts-ddd-domain-service/](skills/ts-ddd-domain-service/) | `npm i @llodev/ts-ddd-domain-service` | `npx skills add llodev/skills/skills/ts-ddd-domain-service` |
| `@llodev/ts-query-cqrs`         | ✅ v0.1.0 | [skills/ts-query-cqrs/](skills/ts-query-cqrs/)                 | `npm i @llodev/ts-query-cqrs`         | `npx skills add llodev/skills/skills/ts-query-cqrs`         |

> [!NOTE]
> `ts-query-cqrs` is the read-side companion — it covers `*Query` ports and `find-*` read use cases that stay separate from the write-side `ts-ddd-repository`/`ts-ddd-use-case` pair. Install `@llodev/ts-ddd` to pull in all 8 skills at once.

## Agent compatibility

Every published skill declares which agents it targets via the `compatibility.agents` field in its frontmatter. The current matrix:

> **Claude Code** · **Cursor** · **Codex** · **Windsurf** · **Cline** · **Roo Code** (Gemini CLI partial via translation layer)

## Repository layout

Skills live flat under `skills/` (one directory per skill, the convention agent
skill indexers expect); family membership is carried by the `pm-tasks-` name
prefix and each skill's `metadata.family` field, not by directory nesting.
Non-skill workspace packages (the meta-package, test kit) live under `packages/`.

```
.
├── skills/                    Every skill — flat, one directory each
│   ├── pm-tasks-core/         Shared extraction + CRUD vocabulary (family: pm-tasks)
│   ├── pm-tasks-asana/        Asana adapter (parent + subtasks, custom fields, sections)
│   ├── pm-tasks-trello/       Trello adapter (boards, lists, labels, members)
│   ├── pm-tasks-jira/         Jira adapter (epics, estimates, transitions)
│   ├── pm-tasks-linear/       Linear adapter (cycles, labels, native temporal fields)
│   ├── pm-tasks-<member>/     Reserved scaffolds (Notion, ClickUp, Monday, Bitrix24, Todoist)
│   ├── django-schema-design/  Schema design: PK strategy, indexes, constraints, migrations
│   ├── ts-ddd-entity/         Domain entities: Entity base, Result.combine, cloneWith transitions
│   ├── ts-ddd-value-object/   Value objects: closed-set + composite VOs, tryCreate/create
│   ├── ts-ddd-dto/            DTOs & contracts: Zod 4 schemas, z.infer types, closed-set enums
│   ├── ts-ddd-use-case/       Application use cases: UseCase<IN,OUT>, repo-port orchestration
│   ├── ts-ddd-repository/     Repository ports + adapters: Firestore/InMemory pair, DI token
│   ├── ts-ddd-controller/     HTTP controllers: routes, guards, Zod validation, Result→HTTP
│   ├── ts-ddd-domain-service/ Domain services: stateless policies/calculators returning Result
│   └── ts-query-cqrs/         Read-side CQRS: *Query ports, find-* read use cases, projections
├── packages/                  Non-skill workspace packages (no SKILL.md)
│   ├── pm-tasks/              Meta-package — installs the whole pm-tasks family
│   ├── pm-tasks-testkit/      In-memory fakes for the canonical CRUD verbs
│   └── ts-ddd/                Meta-package — installs the whole ts-ddd family
├── scripts/                   Validators, contract checks, skill-judge baseline gate
├── docs/                      publishing-guide.md + roadmap.md (gitignored: plans/)
└── .changeset/                Release intent records (Changesets workflow)
```

## Local development

```bash
make hooks       # one-time — installs lefthook (prettier on staged, gitleaks, Conventional Commits)
make validate    # frontmatter + schema + link + locale-parity checks
make help        # full target list
```

> [!TIP]
> The `Makefile` is the canonical entry point — shorter than remembering pnpm script names, and the only one that's enforced by lefthook on commit.

Releases follow the [Changesets](https://github.com/changesets/changesets) workflow — record intent with `make changeset`, apply with `make release-version`, publish with `make release-publish`. See [`.changeset/README.md`](.changeset/README.md) for a step-by-step.

## Roadmap

The 5 released `pm-tasks` packages share the canonical verb set and the Lifecycle Fidelity semantics; a 6th adapter is demand-driven, not scheduled. The current priority is **transport conformance**: the first live dogfood of Trello found a response-shape bug that 569 green unit tests had missed, and the same hand-authored-mock pattern still covers Asana, Jira, and Linear. Full detail with priorities and rationale in [`docs/roadmap.md`](docs/roadmap.md).

**Recently delivered:**

- **core `v1.16.0` · trello `v1.11.0`** — **effort recalibration**: every tier cut ~35%, ties break to the lower tier, and the effort→calendar conversion is now pinned (6-hour focused day; due in `ceil(realistic_hours / 6)` business days). Removes a second, undocumented buffer that was stacking on the 20% already in the formula.
- **asana `v1.11.0`** — **roll-up duration on leaf tasks only**: the new `customFields[].rollsUpFromSubtasks` flag stops a parent from double-counting the subtask sum Asana already computes.
- **trello `v1.10.1`** — **MCP envelope unwrap** (hotfix): the live Trello MCP wraps every write result (`{ summary, card: { … } }`) but the transport read a flat `resp.id`, so writes reported failure _after_ succeeding and left orphan cards. Stubs replaced with shapes captured from a real run.
- **trello `v1.10.0`** — **F13 batch create**: `trello.task.batch-create-with-checklists` — bounded-parallel cards with two-phase checklist creation, ~10× faster on large plans.
- **U1 narration-language** (core `v1.15.0` → trello `1.9.0` · asana `1.10.0` · jira `1.3.0` · linear `1.2.0`) — the `C-LANG-1` doctor check plus the contract that agent-authored narration follows the workspace `locale` while task content still follows the plan.
- **meta `v3.1.1`** — installs the full five-package family.

**Next up (proposed, see roadmap §3):**

- **Transport conformance for asana / jira / linear** — capture verbatim live-MCP response shapes, replace hand-authored stubs with them, add a live smoke per adapter. Trello proved the failure mode is silent and destructive.
- **Enforce `autonomous.allow` at runtime** — `init` writes the allowlist and the doctor validates its shape, but no shipped code gates on it; the headless `/adapter` path bypasses it entirely.

**Not scheduled — demand-driven:**

- Adapter pool: `pm-tasks-github-projects` (S8 — high value, low cost) · `clickup` · `notion` · `monday` · `todoist` · `bitrix24`.
- Additive verbs, each bundled with the adapter that first needs it: `task.time.log` (11th) · `task.blocks.add` (12th) · `task.wip-limit.check` (13th). The base + optional set is complete at 10.
- Library/SDK: `@llodev/pm-tasks-cli` over the headless `/adapter` subpath · plugin SDK (`npx pm-tasks-contract-tests`) · bidirectional sync, once ≥4 adapters are proven in the field.

**Other families:**

- `django-*` — `django-schema-design` (`v0.2.0`) shipped: PK strategy (incremental / UUIDv4 / UUIDv7 with insert-locality trade-offs), indexes, constraints, safe migrations. `django-model-design` (model layer) is the natural next.
- `ts-ddd-*` — 8 skills shipped at `v0.1.0`, one per architectural layer plus the read-side `ts-query-cqrs`. Install them together with `@llodev/ts-ddd` (meta).

## Docs

- [Publishing guide](docs/publishing-guide.md) — how the three distribution channels work.
- [Changesets workflow](.changeset/README.md) — record → version → publish.
- Per-family deep dives live in each member's `SKILL.md` and `references/`.

## License

MIT — see [LICENSE](LICENSE).
