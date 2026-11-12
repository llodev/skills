# bi family — first member `bi-dashboard`

Date: 2026-11-12. Status: approved by the request to package `dashboard-storytelling` the same way as `study-abstract`, with the prefix the maintainer chose: `bi-`.

## 1. Goal

Publish the untracked guide `skills/dashboard-storytelling/SKILL.md` as a packaged Agent Skill in this repository, under a new `bi-` family. The first member is `bi-dashboard`. It stays a knowledge skill: no MCP, no init CLI, no runtime `dist`.

The skill designs dashboards, charts, and KPI cards that state one conclusion in seconds: a conclusion title, a single highlight, and the explanation written on the mark. It applies to any stack the project already uses.

## 2. Family membership

| Folder                | npm package            | Kind                                  |
| --------------------- | ---------------------- | ------------------------------------- |
| `skills/bi-dashboard` | `@llodev/bi-dashboard` | guide (dashboards, charts, KPI cards) |
| `packages/bi`         | `@llodev/bi`           | meta-package, npm only                |

One member is enough to open the family. Later members (`bi-<concern>`, for example a metric definition or a semantic model) install through the same meta-package. This release does not add them.

## 3. Decisions

- **Name.** Folder, frontmatter `name`, and marketplace plugin name are `bi-dashboard`. The prefix `bi-` is the family. The member is `dashboard`. The source folder name `dashboard-storytelling` is not the published id.
- **No alias package.** Do not publish `dashboard-storytelling` or `@llodev/dashboard-storytelling`.
- **Meta name.** `@llodev/bi`, same stripping rule as `@llodev/study` and `@llodev/tests`. It is npm-only and is not a marketplace plugin.
- **Language.** `AGENTS.md` requires English for code, identifiers, docs, and commit messages. The source guide is Portuguese. Translate it faithfully into `skills/bi-dashboard/SKILL.md`. Do not add a rule, drop a rule, reorder the phases, or split the file. This language call is the builder's, from `AGENTS.md`, not a second product decision.
- **What stays verbatim inside the translation.** `ChartStory` field names, the `form` union, token role names (`ink`, `muted`, `context`, `reference`, `highlight`, `highlight-text`, `highlight-soft`, `positive`, `negative`, `surface`, `page`), and every formula. Locale demonstrations stay locale demonstrations: default `pt-BR` / `BRL` in `makeFormat`, and example formatted strings such as `"−15%"`. Translate comments, prose, example UI copy, and example measure names.
- **Source version.** The source has no npm version. This branch uses `0.0.0`. A minor changeset is what `make release-version` turns into `0.1.0`.
- **Peer range.** The meta's `peerDependencies` pin `@llodev/bi-dashboard` at `^0.1.0` even while the branch still says `0.0.0`. A `^0.0.0` range would not contain `0.1.0` and would force a major on the meta.
- **Branch.** `bi-dashboard-v0.1.0`, cut from `main` at `0d5d6fd` (Version Packages #120). The `pmt-<skill>-vX.Y.Z` rule is for the pm-tasks family only.
- **Catalog copy may say v0.1.0.** Root README, both translated READMEs, and the roadmap describe the version this changeset releases. Marketplace parity does not read those docs. The plugin `version` field stays `0.0.0` until `version:sync`.
- **Marketplace `metadata.version` stays `1.12.0`.** Plugin entries are the parity surface. The catalog version is not bumped for one new plugin.
- **Single file.** The source is one `SKILL.md`. Do not invent `references/`, `examples/`, or `anti-patterns/`. Section 12 of the guide is the anti-pattern list.
- **Remove the source folder** after the English skill exists. `skills/dashboard-storytelling/` is untracked and must not remain as a second unpublished skill. Do not touch `skills/image-first-ui-design/`.
- **Lockfile.** A new workspace package must be in `pnpm-lock.yaml`. Commit that hunk with the meta-package. Do not commit unrelated lockfile drift.
- **Prettier.** Do not add the translated skill to `.prettierignore`. If the pre-commit hook reflows markdown, the reflowed file is what gets committed.

## 4. Frontmatter

The description below is 549 characters (inside 200–1200). Use it verbatim.

```yaml
---
name: bi-dashboard
description: >-
  Designs dashboards, charts, and KPI cards that state one conclusion in
  seconds: a conclusion title, a single highlight, and the explanation
  written on the mark. Use when creating, refactoring, or reviewing
  dashboards and charts in any stack — React and shadcn, Recharts, ECharts,
  Vega-Lite, Altair, Plotly, matplotlib, ggplot2, SQL, Power BI, Looker
  Studio, Metabase, Superset, or Grafana. Discover the project design
  system before picking a color. Triggers include dashboard, chart, KPI,
  gráfico, storytelling, conclusion title, annotation, and BI.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - bi
    - dashboard
    - chart
  family: bi
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

H1 is `# Dashboards that explain themselves`.

Required headings, in order:

1. `## How to use this skill`
2. `## 1. Phase 0 — Explore the project`
3. `### 1.1 Stack and where the dashboard lives`
4. `### 1.2 Design system → token map`
5. `### 1.3 Exploration output`
6. `## 2. Phase 1 — Brief`
7. `## 3. Phase 2 — Compute the story`
8. `### 3.1 The ChartStory contract`
9. `### 3.2 Story functions (TypeScript)`
10. `### 3.3 Formatting and language (project locale)`
11. `### 3.4 Conclusion titles computed from the data`
12. `### 3.5 SQL for the story (compute in the database when the volume is large)`
13. `## 4. The four rules of every chart`
14. `### Rule 1 — The title is the conclusion`
15. `### Rule 2 — Color leads the eye`
16. `### Rule 3 — Remove what does not help the reader`
17. `### Rule 4 — Write the explanation on the chart`
18. `## 5. Choose the form from the data and the question`
19. `## 6. Perception principles in practice`
20. `## 7. Dashboard layout and components`
21. `### 7.1 Page hierarchy`
22. `### 7.2 KPI card`
23. `### 7.3 Chart card`
24. `### 7.4 Interaction and states`
25. `### 7.5 Accessibility`
26. `## 8. Phase 4 — Implement in the project`
27. `## 9. Recipes by stack`
28. `### 9.0 Capability map (for any library)`
29. `### 9.1 React + shadcn/ui charts (Recharts) — TypeScript`
30. `### 9.2 ECharts — TypeScript (React, Vue, Angular, or vanilla)`
31. `### 9.3 Vega-Lite (portable JSON; Altair in Python emits the same spec)`
32. `### 9.4 Python — Plotly (also Streamlit and Dash) and matplotlib`
33. `### 9.5 R — ggplot2`
34. `### 9.6 BI tools (Power BI, Looker Studio, Metabase, Superset, Grafana)`
35. `## 10. Phase 5 — Verify`
36. `## 11. Final checklist`
37. `## 12. Anti-patterns`

The fenced-code-block count must equal the source file's count.

## 5. Packaging mold

Mirror `skills/study-abstract/` without `anti-patterns`, `references`, or `examples`:

- `package.json` at `0.0.0`, MIT, `engines.node` `>=24`, `publishConfig.access` `public`, `type` `module`
- `files`: `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `docs`
- `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`
- `LICENSE` copied from the repo root
- `CHANGELOG.md` header only (`# @llodev/bi-dashboard`). Changesets writes the `0.1.0` section at release time.

Package description, also the README quote:

`Design dashboards and charts that state one conclusion before the reader checks an axis.`

Meta-package mirrors `packages/study/`: `README.md`, `LICENSE`, header-only `CHANGELOG.md`, `files: ["README.md"]`, `peerDependencies` + `devDependencies` as decided above. No marketplace entry. Meta description: `Meta-package: installs the @llodev/bi-* family (dashboards and charts).`

## 6. Global wiring

- `.claude-plugin/marketplace.json`: one plugin, `category: ai-tools`, `source.git-subdir`, `path: skills/bi-dashboard`, `version: 0.0.0`, `author.name: llodev`. Same description and keywords as `package.json`.
- Root `README.md`, `docs/i18n/README.pt-BR.md`, and `docs/i18n/README.es-ES.md`: catalog section **and** the repository-layout tree **and** the sentence that names family prefixes. All three files. The prefix list gains `bi-`. The skills tree gains `bi-dashboard/` after `study-abstract/`. The packages tree gains `bi/` after `study/`.
- `docs/roadmap.md`: the opening sentence in the header that names the families in §9 gains `bi-*`. §9 gains a `bi-*` subsection after `study-*`.
- `scripts/snapshots/skill-judge-baseline.json` and `scripts/snapshots/skill-judge-golden.json`: one new key `skills/bi-dashboard/SKILL.md`, appended after the `study-abstract` key. Golden `totalRaw` equals baseline `score` (the 0–100 figure). Notes may record the raw `/120` breakdown.

## 7. Non-goals

- No second family member.
- No alias package.
- No edit to `skills/image-first-ui-design/`.
- No entry in `skills-lock.json` or `scripts/snapshots/tarball-snapshot.json` (both are pm-tasks-scoped).
- No `.size-limit` entry (no JS dist).
- No edit to pm-tasks, django, ts-ddd, tests, or study skill bodies.
- No bump of marketplace `metadata.version`.
- No canary trusted publisher. `canary-publish.yml` only publishes `@llodev/pm-tasks-*`. Do not add `@llodev/bi-dashboard` to `listCanaryPackages`.
- No change to `AGENTS.md`. The first-publish rule already covers any new package.
- Locale-parity JSON stays limited to the pm-tasks adapters. README translations are still required by the packaging mold.

## 8. Gates

- **published-content-lint** — published files must not contain `CLAUDE.md`, `AGENTS.md`, `this repo`, `our repo`, `apps/api/src`, or `apps/web/src`. Do not introduce them in the READMEs or the translation.
- **validate-frontmatter** — `name` kebab-case, description length 200–1200.
- **marketplace-parity** — plugin `0.0.0` equals package `0.0.0` on this branch.
- **skill-judge baseline** — new `SKILL.md` vs `origin/main` requires the baseline file to change in the same range. Record the real score. Do not use `SKIP_SKILL_JUDGE_GATE`. If the score is under 70, fix only missing triggers or broken structure, then re-score once. Do not add frameworks and do not rewrite the translated workflow to chase points.
- **rubric drift** — rubric file untouched.
- **contract-check** — untouched.
- **tarball snapshot** — untouched.

## 9. Release

One changeset, both packages, `minor`. After merge, `release.yml` moves `0.0.0` → `0.1.0` and publishes with the trusted publisher the maintainer attaches after a local `npm publish` of `0.0.0`. This work does not run `npm publish`, does not push, and does not open a pull request. It stops at a branch that passes `make validate` and `make pre-release`.

`changeset version` needs a GitHub token that can read `llodev/skills`. If the repo `.env` token returns 401, rerun with `GITHUB_TOKEN="$(gh auth token)"`. Do not modify `.env` and do not print the token. The peer warning `0.0.0` vs `^0.1.0` during that dry-run is expected and is not a failure.
