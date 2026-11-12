# study family — first member `study-abstract`

Date: 2026-11-11. Status: approved by the request to plan, branch, and execute the same way as `tests-http`.

## 1. Goal

Publish the Cursor skill `course-abstract` as a packaged Agent Skill in this repository, under a new `study-` family. The first member is `study-abstract`. It stays a knowledge skill: no MCP, no init CLI, no runtime `dist`.

The skill turns study material (lectures, readings, slides, notebooks, code, papers, transcripts, errata) into a didactic abstract the reader can use with the source closed.

## 2. Family membership

| Folder                  | npm package              | Kind                    |
| ----------------------- | ------------------------ | ----------------------- |
| `skills/study-abstract` | `@llodev/study-abstract` | guide (study abstracts) |
| `packages/study`        | `@llodev/study`          | meta-package, npm only  |

One member is enough to open the family. Later members (`study-<concern>`) install through the same meta-package. This release does not add them.

## 3. Decisions

- **Name.** Folder, frontmatter `name`, and marketplace plugin name are `study-abstract`. The prefix `study-` is the family. The member is `abstract`. The source folder name `course-abstract` is not the published id.
- **No alias package.** Do not publish `course-abstract` or `@llodev/course-abstract`.
- **Meta name.** `@llodev/study`, same stripping rule as `@llodev/tests` and `@llodev/ts-ddd`. It is npm-only and is not a marketplace plugin.
- **Source of the prose.** Copy `/Users/lloli/.cursor/skills/course-abstract/` (`SKILL.md`, `anti-patterns/prose.md`, `references/conflicts.md`, `references/sources.md`, `examples/index.md`). Do not rewrite the workflow. Do not edit the Cursor install. The only body edit is the H1: `# Course abstracts` becomes `# Study abstracts`.
- **Source version is not the npm version.** The Cursor frontmatter says `metadata.version: "0.3.0"`. That number never shipped to npm. This branch uses `0.0.0`. A minor changeset is what `make release-version` turns into `0.1.0`. Shipping `0.1.0` or `0.3.0` in `package.json` plus a minor changeset would publish `0.2.0` or `0.4.0`.
- **Peer range.** The meta's `peerDependencies` pin `@llodev/study-abstract` at `^0.1.0` even while the branch still says `0.0.0`. A `^0.0.0` range would not contain `0.1.0` and would force a major on the meta.
- **Branch.** `study-abstract-v0.1.0`, cut from `main` at `31c562e` (Version Packages #118). The `pmt-<skill>-vX.Y.Z` rule is for the pm-tasks family only.
- **Catalog copy may say v0.1.0.** Root README, both translated READMEs, and the roadmap describe the version this changeset releases. Marketplace parity does not read those docs. The plugin `version` field stays `0.0.0` until `version:sync`.
- **Marketplace `metadata.version` stays `1.12.0`.** Plugin entries are the parity surface. The catalog version is not bumped for one new plugin.
- **`anti-patterns/` is published.** `SKILL.md` tells the agent to read `anti-patterns/prose.md` before the first sentence. The package `files` list includes `anti-patterns` alongside `references`, `examples`, and `docs`.
- **Lockfile.** A new workspace package must be in `pnpm-lock.yaml`. Commit that hunk with the meta-package. Do not commit unrelated lockfile drift.

## 4. Frontmatter

Replace the source frontmatter. The description is the source description, 637 characters (inside 200–1200). Use it verbatim.

```yaml
---
name: study-abstract
description: >-
  Turns any study material into a didactic abstract the reader can use with
  the source closed: a spoken overview, one diagram when the argument has a
  shape, unpacked concepts, contrast tables, a one-line glossary, mix-ups,
  and hidden self-check answers. Use when summarizing or revising lectures,
  readings, notes, slides, notebooks, code, papers, transcripts, or a set of
  files of any format and any count, including a correction note or errata.
  Write in the language the user used, unless the user names a language.
  Triggers include abstract, study summary, resumo, glossary, glossário,
  pegadinha, mix-up, errata, Mermaid, and transcript.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - study
    - abstract
    - glossary
  family: study
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---
```

## 5. Packaging mold

Mirror `skills/tests-http/` (itself the django mold), plus `anti-patterns` in `files`:

- `package.json` at `0.0.0`, MIT, `engines.node` `>=24`, `publishConfig.access` `public`, `type` `module`
- `files`: `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `anti-patterns`, `references`, `examples`, `docs`
- `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`
- `LICENSE` copied from the repo root
- `CHANGELOG.md` header only (`# @llodev/study-abstract`). Changesets writes the `0.1.0` section at release time.

Package description, also the README quote:

`Turn any study material into a didactic abstract the reader can use with the source closed.`

Meta-package mirrors `packages/tests/`: `README.md`, `LICENSE`, header-only `CHANGELOG.md`, `files: ["README.md"]`, `peerDependencies` + `devDependencies` as decided above. No marketplace entry. Meta description: `Meta-package: installs the @llodev/study-* family (study abstracts).`

## 6. Global wiring

- `.claude-plugin/marketplace.json`: one plugin, `category: ai-tools`, `source.git-subdir`, `path: skills/study-abstract`, `version: 0.0.0`, `author.name: llodev`. Same description and keywords as `package.json`.
- Root `README.md`, `docs/i18n/README.pt-BR.md`, and `docs/i18n/README.es-ES.md`: catalog section **and** the repository-layout tree **and** the sentence that names family prefixes. All three files. The prefix list gains `study-`. The skills tree gains `study-abstract/` after `tests-http/`. The packages tree gains `study/` after `tests/`.
- `docs/roadmap.md`: the opening sentence that names the families in §9 gains `tests-*` and `study-*` (it still omitted `tests-*`). §9 gains a `study-*` subsection after `tests-*`.
- `scripts/snapshots/skill-judge-baseline.json` and `scripts/snapshots/skill-judge-golden.json`: one new key `skills/study-abstract/SKILL.md`, appended after the `tests-http` key. Golden `totalRaw` equals baseline `score` (the 0–100 figure). Notes may record the raw `/120` breakdown.

## 7. Non-goals

- No second family member.
- No alias package.
- No edit to `~/.cursor/skills/course-abstract/`.
- No entry in `skills-lock.json` or `scripts/snapshots/tarball-snapshot.json` (both are pm-tasks-scoped).
- No `.size-limit` entry (no JS dist).
- No edit to pm-tasks, django, ts-ddd, or tests skill bodies.
- No bump of marketplace `metadata.version`.
- No canary trusted publisher. `canary-publish.yml` only publishes `@llodev/pm-tasks-*`. Do not add `@llodev/study-abstract` to `listCanaryPackages`.
- No change to `AGENTS.md`. The first-publish rule already covers any new package.
- Locale-parity JSON stays limited to the pm-tasks adapters. README translations are still required by the packaging mold.

## 8. Gates

- **published-content-lint** — published files must not contain `CLAUDE.md`, `AGENTS.md`, `this repo`, `our repo`, `apps/api/src`, or `apps/web/src`. The source copy has none of these. Do not introduce them in the READMEs.
- **validate-frontmatter** — `name` kebab-case, description length 200–1200.
- **marketplace-parity** — plugin `0.0.0` equals package `0.0.0` on this branch.
- **skill-judge baseline** — new `SKILL.md` vs `origin/main` requires the baseline file to change in the same range. Record the real score. Do not use `SKIP_SKILL_JUDGE_GATE`. If the score is under 70, fix only missing triggers or broken structure, then re-score once. Do not add frameworks and do not rewrite the copied workflow to chase points.
- **rubric drift** — rubric file untouched.
- **contract-check** — untouched.
- **tarball snapshot** — untouched.

## 9. Release

One changeset, both packages, `minor`. After merge, `release.yml` moves `0.0.0` → `0.1.0` and publishes with the trusted publisher the maintainer attaches after a local `npm publish` of `0.0.0`. This work does not run `npm publish`, does not push, and does not open a pull request. It stops at a branch that passes `make validate` and `make pre-release`.

`changeset version` needs a GitHub token that can read `llodev/skills`. If the repo `.env` token returns 401, rerun with `GITHUB_TOKEN="$(gh auth token)"`. Do not modify `.env` and do not print the token. The peer warning `0.0.0` vs `^0.1.0` during that dry-run is expected and is not a failure.
