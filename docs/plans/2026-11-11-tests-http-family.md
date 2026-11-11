# tests-http Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the `http-tests` guide as `@llodev/tests-http` plus the `@llodev/tests` meta-package, on branch `tests-http-v0.1.0`, ready for a `0.0.0` → `0.1.0` minor release.

**Architecture:** Copy the guide from the iris-gate install, apply the portability edits in the spec, then wrap it in the django/ts-ddd packaging mold and wire the family into the marketplace, catalog, and roadmap. No runtime code.

**Tech Stack:** pnpm workspaces, Changesets, Node ≥24, Markdown skills, `.claude-plugin/marketplace.json`.

**Spec:** `docs/specs/2026-11-11-tests-http-family-design.md`

## Global Constraints

- Skill folder, frontmatter `name`, and marketplace plugin name are exactly `tests-http`. Package name is exactly `@llodev/tests-http`. Meta package is exactly `@llodev/tests` at `packages/tests`.
- Consumer overlay names stay: `.http-tests.yaml`, `.http-tests.json`, `docs/http-tests.md`, section heading `## http-tests`.
- On this branch, `package.json` `version`, `metadata.version`, and marketplace plugin `version` are exactly `0.0.0`. Meta `peerDependencies["@llodev/tests-http"]` is exactly `^0.1.0`.
- `engines.node` is `>=24`. License MIT, copied from the repo-root `LICENSE`.
- Published skill files must not contain the literals `CLAUDE.md`, `AGENTS.md`, `this repo`, `our repo`, `apps/api/src`, or `apps/web/src`.
- Do not add `tests-http` to `skills-lock.json` or `scripts/snapshots/tarball-snapshot.json`.
- Do not edit pm-tasks, django, or ts-ddd skill bodies. Do not bump marketplace `metadata.version` (leave `1.12.0`).
- Docs, identifiers, and commit messages are English. README translations live only in `docs/i18n/`.
- Branch is `tests-http-v0.1.0`.

## Review Focus

- A published line that still says `CLAUDE.md` or `AGENTS.md` fails `published-content-lint` even though the agent still needs to open those consumer files. The allowed phrase is ``root agent guides (`CLAUDE` and `AGENTS` markdown)``.
- `package.json` at `0.1.0` together with a minor changeset publishes `0.2.0`. The branch must stay at `0.0.0` after the dry-run.
- Meta peer `^0.0.0` does not contain the released `0.1.0` and forces a later major. The peer range is `^0.1.0` while the package version is still `0.0.0`.
- Renaming `.http-tests.yaml` to `.tests-http.yaml` breaks consumer overlays. Those filenames stay.
- Golden `totalRaw` must equal baseline `score`. A `/120` raw total in either field fails `skill-judge-baseline` consumers that compare the two files.

---

### Task 1: Port the guide into `skills/tests-http`

**Files:**

- Create: `skills/tests-http/SKILL.md`
- Create: `skills/tests-http/references/` (copy of the five reference files)
- Create: `skills/tests-http/examples/` (copy of the three example files)
- Source: `/Users/lloli/Workspace/studies/projects/iris-gate/.agents/skills/http-tests/`

**Interfaces:**

- Consumes: nothing
- Produces: a skill tree whose frontmatter `name` is `tests-http`, `metadata.version` is `0.0.0`, `metadata.family` is `tests`, and whose published prose passes the literal bans in Global Constraints.

- [ ] **Step 1: Copy the tree**

Copy `SKILL.md`, `references/`, and `examples/` from the source into `skills/tests-http/`. Do not copy `.DS_Store`.

- [ ] **Step 2: Replace the frontmatter**

The description below is 433 characters (inside 200–1200). Use it verbatim.

```yaml
---
name: tests-http
description: >-
  Generate, review, expand, or sync `.http` files (REST Client, VS Code
  httpYac, IntelliJ HTTP Client) for manual HTTP API test suites. Use when
  creating or syncing HTTP tests for controllers or ViewSets, covering every
  route, filter, and error, or editing `**/*.http`. Discovers the project
  layout or reads `.http-tests.yaml`. NestJS and DRF adapters live in
  references/. Do NOT use for pytest, Jest, Vitest, Playwright, or Supertest.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - http
    - rest-client
    - tests
  family: tests
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

- [ ] **Step 3: Apply the six portability edits from spec §4**

No other prose changes. Keep the NEVER line that mentions `` `apps/api/` ``.

- [ ] **Step 4: Verify the bans and the frontmatter**

Run:

```bash
grep -nE 'CLAUDE\.md|AGENTS\.md|this repo|our repo|apps/(api|web)/src' skills/tests-http || true
node scripts/checks/validate-frontmatter.mjs
```

Expected: grep prints nothing; frontmatter check exits 0.

- [ ] **Step 5: Commit**

```bash
git add skills/tests-http
git commit -m "feat(tests-http): port the HTTP .http guide into the tests family"
```

---

### Task 2: Package `@llodev/tests-http`

**Files:**

- Create: `skills/tests-http/package.json`
- Create: `skills/tests-http/README.md`
- Create: `skills/tests-http/docs/i18n/README.pt-BR.md`
- Create: `skills/tests-http/docs/i18n/README.es-ES.md`
- Create: `skills/tests-http/LICENSE`
- Create: `skills/tests-http/CHANGELOG.md`

**Interfaces:**

- Consumes: Task 1 skill tree
- Produces: a workspace package `@llodev/tests-http@0.0.0` whose `files` list includes `references`, `examples`, and `docs`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@llodev/tests-http",
  "version": "0.0.0",
  "description": "Generate and sync full-coverage .http suites for HTTP APIs — project discovery, NestJS and DRF adapters, no invented routes.",
  "license": "MIT",
  "homepage": "https://github.com/llodev/skills/tree/main/skills/tests-http",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "skills/tests-http"
  },
  "files": ["SKILL.md", "README.md", "LICENSE", "CHANGELOG.md", "references", "examples", "docs"],
  "keywords": ["agent-skill", "http", "rest-client", "tests", "nestjs", "drf"],
  "type": "module",
  "publishConfig": { "access": "public" },
  "engines": { "node": ">=24" }
}
```

- [ ] **Step 2: Copy `LICENSE` from the repo root and write a header-only changelog**

`CHANGELOG.md` is exactly:

```markdown
# @llodev/tests-http
```

- [ ] **Step 3: Write the English README**

Mirror the django-schema-design README chrome (language flags, npm / MIT / Node ≥24 / Agent Skills badges, install block, use table, contents table). H1 is `# @llodev/tests-http`. The one-line quote is the package.json description. State that it is part of the `@llodev/tests` family and that there is no MCP and no init. Use table:

| Prompt example                                  | What the agent does                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `"write .http tests for the orders controller"` | Discovers the project, reads the handler, emits a full-coverage `.http` file   |
| `"sync http tests after the new filter"`        | Diff-and-extends the existing file; does not wipe it                           |
| `"review this .http file"`                      | Checks routes, filters, auth negatives, and invented values against the source |

Contents rows: `SKILL.md`, `references/project-discovery.md`, `references/common.md`, `references/nestjs.md`, `references/drf.md`, `examples/`.

Language-flag links point at `skills/tests-http/README.md` and `skills/tests-http/docs/i18n/README.{pt-BR,es-ES}.md` on `github.com/llodev/skills`.

- [ ] **Step 4: Translate that README into pt-BR and es-ES**

Same structure, same links, same facts. No extra features. Badge alt text and headings translated. License line stays MIT.

- [ ] **Step 5: Lint published files**

Run: `node scripts/checks/published-content-lint.mjs`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add skills/tests-http/package.json skills/tests-http/README.md skills/tests-http/docs skills/tests-http/LICENSE skills/tests-http/CHANGELOG.md
git commit -m "feat(tests-http): package the guide for npm"
```

---

### Task 3: Meta-package `@llodev/tests`

**Files:**

- Create: `packages/tests/package.json`
- Create: `packages/tests/README.md`
- Create: `packages/tests/LICENSE`
- Create: `packages/tests/CHANGELOG.md`

**Interfaces:**

- Consumes: package name `@llodev/tests-http` from Task 2
- Produces: `@llodev/tests@0.0.0` with peer `^0.1.0` and devDependency `workspace:*`. Not a marketplace plugin.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@llodev/tests",
  "version": "0.0.0",
  "description": "Meta-package: installs the @llodev/tests-* family (HTTP .http suites).",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "packages/tests"
  },
  "peerDependencies": {
    "@llodev/tests-http": "^0.1.0"
  },
  "devDependencies": {
    "@llodev/tests-http": "workspace:*"
  },
  "files": ["README.md"],
  "keywords": ["agent-skill", "tests", "meta-package"],
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: README, LICENSE, changelog header**

README mirrors `packages/ts-ddd/README.md` at one-member scale: install `npm i @llodev/tests`, list only `@llodev/tests-http`, explain that a single member can be installed directly, and note that the meta versions independently via Changesets. `CHANGELOG.md` is exactly `# @llodev/tests`. LICENSE is the repo-root MIT file.

- [ ] **Step 3: Commit**

```bash
git add packages/tests
git commit -m "feat(tests): add the tests family meta-package"
```

---

### Task 4: Wire marketplace, catalog, and roadmap

**Files:**

- Modify: `.claude-plugin/marketplace.json`
- Modify: `README.md`
- Modify: `docs/i18n/README.pt-BR.md`
- Modify: `docs/i18n/README.es-ES.md`
- Modify: `docs/roadmap.md`

**Interfaces:**

- Consumes: package version `0.0.0` and the descriptions from Tasks 2 and 3
- Produces: one marketplace plugin at `0.0.0` and a catalog section that names the released version `v0.1.0`

- [ ] **Step 1: Add the plugin**

Append to `plugins` (do not change `metadata.version`):

```json
{
  "name": "tests-http",
  "category": "ai-tools",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/llodev/skills.git",
    "path": "skills/tests-http"
  },
  "description": "Generate and sync full-coverage .http suites for HTTP APIs — project discovery, NestJS and DRF adapters, no invented routes.",
  "version": "0.0.0",
  "author": { "name": "llodev" },
  "keywords": ["agent-skill", "http", "rest-client", "tests", "nestjs", "drf"]
}
```

- [ ] **Step 2: Catalog section in `README.md`**

Insert after the ts-ddd note and before `## Agent compatibility`. Status column is `✅ v0.1.0` (the changeset target, not the branch version).

```markdown
### `@llodev/tests` — HTTP test-suite skills

Pure **knowledge** skills for manual HTTP API suites in `.http` files — no MCP, no config, no init. The first member discovers the project, then generates or syncs full route coverage for NestJS and DRF. Further `tests-*` members can join the same meta-package.

| Package                  | Status    | Source                                   | npm                        | Vercel CLI                                       |
| ------------------------ | --------- | ---------------------------------------- | -------------------------- | ------------------------------------------------ |
| `@llodev/tests` _(meta)_ | ✅ v0.1.0 | [packages/tests/](packages/tests/)       | `npm i @llodev/tests`      | —                                                |
| `@llodev/tests-http`     | ✅ v0.1.0 | [skills/tests-http/](skills/tests-http/) | `npm i @llodev/tests-http` | `npx skills add llodev/skills/skills/tests-http` |
```

In the repository-layout tree, add `tests-http/` as the last skills entry and `tests/` as the last packages entry. Update the sentence that says family membership is only the `pm-tasks-` prefix so it also names `tests-`.

- [ ] **Step 3: Translate that catalog block into both root i18n READMEs**

Insert at the same relative position. Do not otherwise rewrite those files.

- [ ] **Step 4: Roadmap §9**

Append a subsection after the ts-ddd subsection:

```markdown
### `tests-*` — HTTP test-suite knowledge skills

Project-agnostic guides that turn a project's own handlers into full-coverage `.http` files. No MCP, no init. The agent discovers layout (or reads `.http-tests.yaml`) and refuses routes, filters, and error codes that are not in the source.

| Skill        | Concern                                                                               | Status              |
| ------------ | ------------------------------------------------------------------------------------- | ------------------- |
| `tests-http` | Manual HTTP suites for REST Client / httpYac / IntelliJ, with NestJS and DRF adapters | ✅ shipped `v0.1.0` |

`@llodev/tests` is the npm meta-package. It is not a marketplace plugin. Consumer overlay filenames (`.http-tests.yaml`, `docs/http-tests.md`) stay as they are; only the skill id is `tests-http`.
```

- [ ] **Step 5: Parity check**

Run: `node scripts/checks/marketplace-parity.mjs`

Expected: `ok   tests-http@0.0.0` and exit 0.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/marketplace.json README.md docs/i18n/README.pt-BR.md docs/i18n/README.es-ES.md docs/roadmap.md
git commit -m "docs(tests): wire the tests family into the catalog and marketplace"
```

---

### Task 5: Record the skill-judge baseline

**Files:**

- Modify: `scripts/snapshots/skill-judge-baseline.json`
- Modify: `scripts/snapshots/skill-judge-golden.json`

**Interfaces:**

- Consumes: final `skills/tests-http/SKILL.md` from Task 1
- Produces: key `skills/tests-http/SKILL.md` in both snapshots. `golden.totalRaw === baseline.score`, both in `0..100`.

- [ ] **Step 1: Score the skill**

Read `~/.claude/skills/skill-judge/SKILL.md` and score `skills/tests-http/SKILL.md`. Let `raw` be the sum of the eight dimensions (max 120). Store `score = Math.round(raw / 120 * 100)`.

- [ ] **Step 2: Add the baseline entry**

```json
"skills/tests-http/SKILL.md": {
  "score": 0,
  "version": "0.0.0",
  "capturedAt": "2026-11-11",
  "notes": "First capture at package 0.0.0. Replace 0 with the rounded percentage and list D1–D8 raw points."
}
```

Replace the placeholder `0` and the notes with the real score and the dimension breakdown. If `score < 70`, fix only judge findings that are missing triggers or broken structure inside `SKILL.md`, re-score once, and store the second score. Do not add frameworks.

- [ ] **Step 3: Add the golden entry with the same score**

```json
"skills/tests-http/SKILL.md": {
  "dimensionScores": {},
  "rubricChecksum": "manual",
  "rubricVersion": "v1",
  "totalRaw": 0
}
```

`totalRaw` equals the baseline `score`, not the `/120` raw sum.

- [ ] **Step 4: Commit**

```bash
git add scripts/snapshots/skill-judge-baseline.json scripts/snapshots/skill-judge-golden.json skills/tests-http/SKILL.md
git commit -m "chore(tests-http): record the skill-judge baseline"
```

---

### Task 6: Changeset and release rehearsal

**Files:**

- Create: `.changeset/tests-http-first-release.md`

**Interfaces:**

- Consumes: both packages at `0.0.0`
- Produces: a minor changeset. After the dry-run the tree is back to `0.0.0` with the changeset still present. `make validate` and `make pre-release` exit 0.

- [ ] **Step 1: Write and commit the changeset before the dry-run**

```markdown
---
"@llodev/tests-http": minor
"@llodev/tests": minor
---

feat(tests-http): first release of the HTTP .http test-suite skill

New `tests-*` family. `@llodev/tests-http` generates and syncs full-coverage
`.http` files from the project being edited (NestJS and DRF adapters,
discovery before assumptions). `@llodev/tests` installs the family. No MCP,
no runtime.
```

```bash
git add .changeset/tests-http-first-release.md
git commit -m "chore(tests-http): changeset for the first release at 0.1.0"
```

- [ ] **Step 2: Dry-run the bump, then restore**

Run: `pnpm changeset:version`

Expected: `@llodev/tests-http` and `@llodev/tests` become `0.1.0`, and the marketplace plugin `version` becomes `0.1.0`. Then restore, leaving the changeset commit intact:

```bash
git restore .
git restore --source=HEAD --worktree --staged .changeset/tests-http-first-release.md
git status --short
```

Expected: clean tree, both packages still `0.0.0`, changeset file present.

- [ ] **Step 3: Validate**

Run: `make validate && make pre-release`

Expected: exit 0. The skill-judge gate sees the baseline update and does not ask for `SKIP_SKILL_JUDGE_GATE`. Do not publish.

- [ ] **Step 4: No further commit if the restore was clean**

If Step 3 modifies files, commit only that fix. Do not leave versions at `0.1.0`.
