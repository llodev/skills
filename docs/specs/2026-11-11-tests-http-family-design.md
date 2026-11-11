# tests family — first member `tests-http`

Date: 2026-11-11. Status: approved by the request to plan, branch, and execute.

## 1. Goal

Publish the existing `http-tests` guide (today only installed under consumer projects) as a packaged Agent Skill in this repository, under a new `tests-` family. The first member is `tests-http`. It stays a knowledge skill: no MCP, no init CLI, no runtime `dist`.

The skill generates, reviews, expands, and syncs `.http` files (REST Client / httpYac / IntelliJ HTTP Client) from the source of the project being edited. NestJS and DRF stay adapters inside `references/`. The agent discovers layout instead of assuming a monorepo.

## 2. Family membership

| Folder              | npm package          | Kind                        |
| ------------------- | -------------------- | --------------------------- |
| `skills/tests-http` | `@llodev/tests-http` | guide (HTTP `.http` suites) |
| `packages/tests`    | `@llodev/tests`      | meta-package, npm only      |

One member is enough to open the family. Later members (`tests-<concern>`) install through the same meta-package. This release does not add them.

## 3. Decisions

- **Name.** Folder, frontmatter `name`, and marketplace plugin name are `tests-http`. The prefix `tests-` is the family. The member is `http`, not `http-tests`.
- **Consumer config names stay.** `.http-tests.yaml`, `.http-tests.json`, and `docs/http-tests.md` (section `## http-tests`) are files the consumer already has. Renaming them would break overlays. Only the skill identity changes.
- **No alias package.** Do not publish `http-tests`, `drf-http-tests`, or `nestjs-http-tests`.
- **Meta name.** `@llodev/tests`, same stripping rule as `@llodev/pm-tasks` and `@llodev/ts-ddd`. It is npm-only and is not a marketplace plugin.
- **Source of the prose.** Copy `projects/iris-gate/.agents/skills/http-tests/` (SKILL.md, `references/`, `examples/`). Do not rewrite the workflow. Apply only the portability edits in §4.
- **Versions on this branch.** `package.json`, marketplace plugin `version`, and `metadata.version` are `0.0.0`. A minor changeset is what `make release-version` turns into `0.1.0`. Shipping `0.1.0` in `package.json` plus a minor changeset would publish `0.2.0`.
- **Peer range.** The meta's `peerDependencies` pin `@llodev/tests-http` at `^0.1.0` even while the branch still says `0.0.0`. A `^0.0.0` range would not contain `0.1.0` and would force a major on the meta.
- **Branch.** `tests-http-v0.1.0`. That is the version the changeset will release. The `pmt-<skill>-vX.Y.Z` rule is for the pm-tasks family only.
- **Catalog copy may say v0.1.0.** Root README and roadmap describe the version this changeset releases. Marketplace parity does not read those docs. The plugin `version` field stays `0.0.0` until `version:sync`.
- **Marketplace `metadata.version` stays `1.12.0`.** Plugin entries are the parity surface. The catalog version is not bumped for one new plugin.

## 4. Portability edits (exact)

Published files are scanned by `scripts/checks/published-content-lint.mjs`. The copy fails that lint until these lines change. Do not weaken the discovery procedure.

| File                                              | Change                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md` frontmatter                            | Replace `name` and `description`. Add `license`, `metadata`, `compatibility` as in the django-schema-design mold. Description must not contain the literals `CLAUDE.md` or `AGENTS.md`. |
| `SKILL.md` discovery step                         | `` `CLAUDE.md`, `AGENTS.md` `` becomes ``root agent guides (`CLAUDE` and `AGENTS` markdown)``.                                                                                          |
| `references/common.md` heading                    | `in this repo` becomes `in the project being edited`.                                                                                                                                   |
| `references/project-discovery.md` priority table  | Same agent-guide phrase as SKILL.md. The words `CLAUDE.md` and `AGENTS.md` must not appear.                                                                                             |
| `references/project-discovery.md` IDE heading     | `for CLAUDE.md / .cursor/rules` becomes `for a root agent guide or .cursor/rules`.                                                                                                      |
| `references/project-discovery.md` example snippet | Drop `apps/api/` paths. Use `test/http/**/*.http`, `test/http/orders.http`, and `src/shared/http/error-codes.ts`.                                                                       |

`apps/api/` in the NEVER list (without `/src`) does not trip the lint and stays: it is the prohibition, not an assumed layout.

## 5. Packaging mold

Per skill, mirror `skills/django-schema-design/` plus the `examples/` entry that ts-ddd skills add to `files`:

- `package.json` at `0.0.0`, MIT, `engines.node` `>=24`, `publishConfig.access` `public`, `type` `module`
- `files`: `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `references`, `examples`, `docs`
- `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`
- `LICENSE` copied from the repo root
- `CHANGELOG.md` header only (`# @llodev/tests-http`). Changesets writes the `0.1.0` section at release time.

Frontmatter:

```yaml
name: tests-http
license: MIT
metadata:
  version: 0.0.0
  tags: [agent-skill, http, rest-client, tests]
  family: tests
  role: skill
compatibility:
  agents: [claude-code, cursor, codex, windsurf, cline, roo-code]
```

`metadata.family` is what the root README says carries family membership. django-schema-design has it; several ts-ddd skills do not. New family members follow the django frontmatter, not the gap.

Meta-package mirrors `packages/ts-ddd/`: `README.md`, `LICENSE`, header-only `CHANGELOG.md`, `files: ["README.md"]`, `peerDependencies` + `devDependencies` as decided above. No marketplace entry.

## 6. Global wiring

- `.claude-plugin/marketplace.json`: one plugin, `category: ai-tools`, `source.git-subdir`, `path: skills/tests-http`, `version: 0.0.0`, `author.name: llodev`.
- Root `README.md` and `docs/i18n/README.pt-BR.md` and `docs/i18n/README.es-ES.md`: catalog section and repository-layout tree.
- `docs/roadmap.md` §9: a `tests-*` subsection.
- `scripts/snapshots/skill-judge-baseline.json` and `scripts/snapshots/skill-judge-golden.json`: one new key `skills/tests-http/SKILL.md`. Golden `totalRaw` equals baseline `score` (the 0–100 figure). Notes may record the raw `/120` breakdown.

## 7. Non-goals

- No second family member, no adapter beyond NestJS and DRF.
- No entry in `skills-lock.json` or `scripts/snapshots/tarball-snapshot.json` (both are pm-tasks-scoped; shipped guide families are absent).
- No `.size-limit` entry (no JS dist).
- No edit to pm-tasks, django, or ts-ddd skills.
- No bump of marketplace `metadata.version`.
- No change to `pm-tasks-core/references/contract.md` or the skill-judge rubric.
- Locale-parity JSON (`validate-locale-parity.mjs`) stays limited to the pm-tasks adapters. README translations are still required by the packaging mold.

## 8. Gates

- **published-content-lint** — satisfied by §4. A leftover `CLAUDE.md`, `AGENTS.md`, `this repo`, or `apps/api/src` fails the gate.
- **validate-frontmatter** — `name` kebab-case, description length 200–1200.
- **marketplace-parity** — plugin `0.0.0` equals package `0.0.0` on this branch.
- **skill-judge baseline** — new `SKILL.md` vs `origin/main` requires the baseline file to change in the same range. Record the real score. Do not use `SKIP_SKILL_JUDGE_GATE`.
- **rubric drift** — rubric file untouched.
- **contract-check** — untouched.
- **tarball snapshot** — untouched.

## 9. Release

One changeset, both packages, `minor`. After merge, `make release-version` moves `0.0.0` → `0.1.0` and `version:sync` lifts the plugin version. Publishing stays a conscious `make release-publish` by the maintainer. This work stops at a branch that passes `make validate` and `make pre-release`.
