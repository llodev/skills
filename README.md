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

Turn implementation plans into PM tasks (Trello, Asana, …) and operate them via paste, MCP publish, or autonomous write-through. Plus `@llodev/pm-tasks-testkit` — in-memory fakes for the 7 canonical verbs, for testing custom skills.

**New in v1.9 — headless runtime (`/adapter` subpath):** import `createAdapter` from either adapter to drive the 7 canonical verbs from your own scripts/agents without invoking the skill:

```ts
import { createAdapter } from "@llodev/pm-tasks-trello/adapter";

const adapter = await createAdapter({ configPath: ".trello.json", mcp });
const r = await adapter.taskMove({ taskId: "card-1", targetListOrSectionId: "wip-list" });
if (!r.ok) throw new Error(`task.move failed: ${r.code}`);
```

`mcp: (toolName, args) => Promise<unknown>` is a caller-supplied callback that proxies to the agent runtime's `mcp__*` tools. Same shape for `@llodev/pm-tasks-asana/adapter`. Full contract in [publishing-guide § 11 — Headless runtime](docs/publishing-guide.md#11-headless-runtime-pm-tasks-v19) and per-adapter SKILL.md.

| Package                     | Status      | Source                                                   | npm                                 | Vercel CLI                                            |
| --------------------------- | ----------- | -------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.0.0   | [packages/pm-tasks/](packages/pm-tasks/)                 | `npm i @llodev/pm-tasks`            | —                                                     |
| `@llodev/pm-tasks-core`     | ✅ v1.4.0   | [skills/pm-tasks-core/](skills/pm-tasks-core/)           | `npm i @llodev/pm-tasks-core`       | `npx skills add llodev/skills/skills/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.4.0   | [skills/pm-tasks-asana/](skills/pm-tasks-asana/)         | `npm i @llodev/pm-tasks-asana`      | `npx skills add llodev/skills/skills/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.4.0   | [skills/pm-tasks-trello/](skills/pm-tasks-trello/)       | `npm i @llodev/pm-tasks-trello`     | `npx skills add llodev/skills/skills/pm-tasks-trello` |
| `@llodev/pm-tasks-testkit`  | ✅ v0.1.0   | [packages/pm-tasks-testkit/](packages/pm-tasks-testkit/) | `npm i -D @llodev/pm-tasks-testkit` | —                                                     |
| `@llodev/pm-tasks-jira`     | ✅ v1.0.0   | [skills/pm-tasks-jira/](skills/pm-tasks-jira/)           | `npm i @llodev/pm-tasks-jira`       | `npx skills add llodev/skills/skills/pm-tasks-jira`   |
| `pm-tasks-linear`           | 🔒 scaffold | [skills/pm-tasks-linear/](skills/pm-tasks-linear/)       | —                                   | —                                                     |
| `pm-tasks-notion`           | 🔒 scaffold | [skills/pm-tasks-notion/](skills/pm-tasks-notion/)       | —                                   | —                                                     |
| `pm-tasks-clickup`          | 🔒 scaffold | [skills/pm-tasks-clickup/](skills/pm-tasks-clickup/)     | —                                   | —                                                     |
| `pm-tasks-monday`           | 🔒 scaffold | [skills/pm-tasks-monday/](skills/pm-tasks-monday/)       | —                                   | —                                                     |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [skills/pm-tasks-bitrix24/](skills/pm-tasks-bitrix24/)   | —                                   | —                                                     |
| `pm-tasks-todoist`          | 🔒 scaffold | [skills/pm-tasks-todoist/](skills/pm-tasks-todoist/)     | —                                   | —                                                     |

> [!NOTE]
> `scaffold` skills are reserved namespaces with a placeholder `SKILL.md`. Their description tells agents NOT to activate until a real adapter ships.

> [!NOTE]
> `@llodev/pm-tasks` (meta) is versioned independently from the family via `onlyUpdatePeerDependentsWhenOutOfRange`. The family is at `v1.x`; meta jumped to `v3.0.0` before decoupling and will stay at `v3.x` until the family reaches `v2.0.0`.

### `django-*` — Django design skills

Pure **knowledge** skills for designing production-grade Django apps — no MCP, no config, no init. They activate on the prompt and inject expert decisions (trade-offs, anti-patterns, decision trees), not basic ORM syntax. First member ships schema design; more Django-context skills are planned (see [roadmap](docs/roadmap.md)).

| Package                        | Status    | Source                                                       | npm                                  | Vercel CLI                                                 |
| ------------------------------ | --------- | ------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| `@llodev/django-schema-design` | ✅ v0.1.0 | [skills/django-schema-design/](skills/django-schema-design/) | `npm i @llodev/django-schema-design` | `npx skills add llodev/skills/skills/django-schema-design` |

> [!NOTE]
> `django-schema-design` covers the **database-schema** layer (PK strategy, indexes, constraints, migrations). A future `django-model-design` sibling is reserved for the **model layer** (relationships, managers, fat-vs-thin models).

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
│   ├── pm-tasks-<member>/     Reserved scaffolds (Linear, Notion, ClickUp, …)
│   └── django-schema-design/  Schema design: PK strategy, indexes, constraints, migrations
├── packages/                  Non-skill workspace packages (no SKILL.md)
│   ├── pm-tasks/              Meta-package — installs the whole pm-tasks family
│   └── pm-tasks-testkit/      In-memory fakes for the canonical CRUD verbs
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

Active focus: hardening the `pm-tasks-*` foundation before shipping new PM tool adapters. Full detail with priorities and rationale in [`docs/roadmap.md`](docs/roadmap.md).

**Recently delivered (`v1.8.0` → `v1.11.0`):**

- `v1.8.0` (minor) — **Observability v1**: smart `audit.log` rotation (size + age + multi-tool, atomic, idempotent) · `pm-tasks-core-doctor` CLI · adapter `--doctor` flags.
- `v1.9.0` (minor) — **Headless runtime + plan-execution**: `/adapter` subpath (`createAdapter`, 7 verbs, stubbable `McpCaller`) · agent-agnostic `/plan-execution` mode (config gate, plan-task discovery, `onTaskStart`/`onTaskComplete` boundary hooks).
- `v1.10.0` (minor) — **Canary publish**: per-PR `0.0.0-pr-<N>-<sha>` under dist-tag `pr-<N>` · `--from-canary` E2E (installs from real npm) · auto-cleanup on close (untag + unpublish/deprecate) · doctor `C-VER-1` probe + pre-release `-pr-` guard.
- `v1.11.0` (minor) — **pm-tasks-jira v1.0.0**: first Jira adapter (9 verbs, headless `/adapter`, init + doctor, F3 `task.parent.set` + F7 `task.estimate.set`, estimation module) · core: estimation types + `normalizeEstimate` helper.

**What's next:**

- **`pm-tasks-linear` (S2, `v1.12.0`)** — next new adapter. Linear MCP; `Cycle` aligns natively with our verb model. See [docs/roadmap.md](docs/roadmap.md).

**Adapter expansion (`v1.12.0+`):**

- `pm-tasks-linear` (S2) — Linear MCP. Premium dev mindshare; `Cycle` aligns natively with our verb model.
- `pm-tasks-github-projects` (S8) — `github-mcp-server` native PM on GitHub; high value, low cost.
- `pm-tasks-clickup` (S3) · `pm-tasks-notion` (S4) · `pm-tasks-monday` (S5) · `pm-tasks-todoist` (S6) · `pm-tasks-bitrix24` (S7).

**Across the adapter wave — new canonical verbs (additive minors):**

- 8th `task.sprint.set` · 9th `task.parent.set` (Jira/Linear) · 10th `task.time.log` · 11th `task.estimate.set` · 12th `task.blocks.add` · 13th `task.wip-limit.check`.

**Mid-term — library/SDK and reverse sync:**

- P2 — `@llodev/pm-tasks-cli` standalone CLI over the F14 headless `/adapter` subpath.
- P4 — Plugin SDK (`npx pm-tasks-contract-tests`) for out-of-tree adapters.
- F1 — bidirectional sync (read-back PM tool → plan) once ≥4 adapters land.

**New family — `django-*` (Django design skills):**

- `django-schema-design` (`v0.1.0`) — **shipped**: PK strategy (incremental / UUIDv4 / UUIDv7 with insert-locality trade-offs), indexes, constraints, and safe migrations. First of several planned Django-context skills; `django-model-design` (model layer) is the natural next.

**Future families:**

- **`ts-ddd-*`** — Domain-Driven Design building blocks for TypeScript codebases (entities, value objects, use cases, repositories, controllers).

## Docs

- [Publishing guide](docs/publishing-guide.md) — how the three distribution channels work.
- [Changesets workflow](.changeset/README.md) — record → version → publish.
- Per-family deep dives live in each member's `SKILL.md` and `references/`.

## License

MIT — see [LICENSE](LICENSE).
