<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# llodev/skills

> Monorepo of [Agent Skills](https://agentskills.io) for Claude Code, Cursor, Codex, Windsurf, and any agent that speaks the open Skills spec.

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
npx skills add llodev/skills/pm-tasks/pm-tasks-trello
```

See the [publishing guide](docs/publishing-guide.md) for how the three channels work together.

## Catalog

### `pm-tasks-*` — Project Management adapters

Turn implementation plans into PM tasks (Trello, Asana, …) and operate them via paste, MCP publish, or autonomous write-through.

| Package                     | Status      | Source                                                     | npm                             | Vercel CLI                                              |
| --------------------------- | ----------- | ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.0.0   | [pm-tasks/pm-tasks/](pm-tasks/pm-tasks/)                   | `npm i @llodev/pm-tasks`        | —                                                       |
| `@llodev/pm-tasks-core`     | ✅ v1.3.0   | [pm-tasks/pm-tasks-core/](pm-tasks/pm-tasks-core/)         | `npm i @llodev/pm-tasks-core`   | `npx skills add llodev/skills/pm-tasks/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.3.0   | [pm-tasks/pm-tasks-asana/](pm-tasks/pm-tasks-asana/)       | `npm i @llodev/pm-tasks-asana`  | `npx skills add llodev/skills/pm-tasks/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.3.0   | [pm-tasks/pm-tasks-trello/](pm-tasks/pm-tasks-trello/)     | `npm i @llodev/pm-tasks-trello` | `npx skills add llodev/skills/pm-tasks/pm-tasks-trello` |
| `pm-tasks-jira`             | 🔒 scaffold | [pm-tasks/pm-tasks-jira/](pm-tasks/pm-tasks-jira/)         | —                               | —                                                       |
| `pm-tasks-linear`           | 🔒 scaffold | [pm-tasks/pm-tasks-linear/](pm-tasks/pm-tasks-linear/)     | —                               | —                                                       |
| `pm-tasks-notion`           | 🔒 scaffold | [pm-tasks/pm-tasks-notion/](pm-tasks/pm-tasks-notion/)     | —                               | —                                                       |
| `pm-tasks-clickup`          | 🔒 scaffold | [pm-tasks/pm-tasks-clickup/](pm-tasks/pm-tasks-clickup/)   | —                               | —                                                       |
| `pm-tasks-monday`           | 🔒 scaffold | [pm-tasks/pm-tasks-monday/](pm-tasks/pm-tasks-monday/)     | —                               | —                                                       |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [pm-tasks/pm-tasks-bitrix24/](pm-tasks/pm-tasks-bitrix24/) | —                               | —                                                       |
| `pm-tasks-todoist`          | 🔒 scaffold | [pm-tasks/pm-tasks-todoist/](pm-tasks/pm-tasks-todoist/)   | —                               | —                                                       |

> [!NOTE]
> `scaffold` skills are reserved namespaces with a placeholder `SKILL.md`. Their description tells agents NOT to activate until a real adapter ships.

> [!NOTE]
> `@llodev/pm-tasks` (meta) is versioned independently from the family via `onlyUpdatePeerDependentsWhenOutOfRange`. The family is at `v1.x`; meta jumped to `v3.0.0` before decoupling and will stay at `v3.x` until the family reaches `v2.0.0`.

## Agent compatibility

Every published skill declares which agents it targets via the `compatibility.agents` field in its frontmatter. The current matrix:

> **Claude Code** · **Cursor** · **Codex** · **Windsurf** · **Cline** · **Roo Code** (Gemini CLI partial via translation layer)

## Repository layout

```
.
├── pm-tasks/                  Family folder — one directory per family member
│   ├── pm-tasks-core/         Shared extraction + CRUD vocabulary
│   ├── pm-tasks-asana/        Asana adapter (parent + subtasks, custom fields, sections)
│   ├── pm-tasks-trello/       Trello adapter (boards, lists, labels, members)
│   └── pm-tasks-<member>/     Reserved scaffolds (Jira, Linear, Notion, …)
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

**Next up — `pm-tasks-*` foundation (`v1.3.1` → `v1.4.0`):**

- `v1.3.1` (patch) — close test gaps: i18n adapter-scoped tests, localized-path validator, `NOISE_BAND` inline doc, skill-judge golden master.
- `v1.4.0` (minor) — DX foundation: handcrafted `.d.ts` for `init-lib` exports, E2E canary (PR runs `pnpm pack` + `npx <pkg>` in a clean sandbox), `@llodev/pm-tasks-testkit` (in-memory fakes for the 6 canonical verbs).

**After foundation — first adapter expansion (`v1.5.x`):**

- `pm-tasks-jira` — Atlassian Remote MCP. Largest dev/agile market share.
- `pm-tasks-linear` — Linear MCP. Premium dev mindshare; `Cycle` aligns natively with our verb model.
- 7th canonical verb `task.sprint.set` (required by Jira / Linear / ClickUp).
- Parent/child hierarchy (epic → story → task) for Jira / Linear / Asana.

**Mid-term (`v1.6+`):**

- More adapters: `pm-tasks-clickup`, `pm-tasks-notion`, `pm-tasks-github-projects`, `pm-tasks-monday`, `pm-tasks-todoist`, `pm-tasks-bitrix24`.
- More verbs: `task.time.log`, `task.estimate.set`, dependency graph (`task.blocks.add`).
- Bidirectional sync (read-back from PM tool → plan).

**Future families:**

- **`ts-ddd-*`** — Domain-Driven Design building blocks for TypeScript codebases (entities, value objects, use cases, repositories, controllers).

## Docs

- [Publishing guide](docs/publishing-guide.md) — how the three distribution channels work.
- [Changesets workflow](.changeset/README.md) — record → version → publish.
- Per-family deep dives live in each member's `SKILL.md` and `references/`.

## License

MIT — see [LICENSE](LICENSE).
