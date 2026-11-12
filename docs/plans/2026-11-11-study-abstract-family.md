# study-abstract Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the Cursor `course-abstract` skill as `@llodev/study-abstract` plus the `@llodev/study` meta-package, on branch `study-abstract-v0.1.0`, ready for a `0.0.0` → `0.1.0` minor release.

**Architecture:** Copy the skill from the Cursor install, replace the frontmatter and the H1, then wrap it in the tests-http packaging mold and wire the family into the marketplace, catalog, and roadmap. No runtime code.

**Tech Stack:** pnpm workspaces, Changesets, Node ≥24, Markdown skills, `.claude-plugin/marketplace.json`.

**Spec:** `docs/specs/2026-11-11-study-abstract-family-design.md`

## Global Constraints

- Skill folder, frontmatter `name`, and marketplace plugin name are exactly `study-abstract`. Package name is exactly `@llodev/study-abstract`. Meta package is exactly `@llodev/study` at `packages/study`.
- On this branch, `package.json` `version`, `metadata.version`, and marketplace plugin `version` are exactly `0.0.0`. Meta `peerDependencies["@llodev/study-abstract"]` is exactly `^0.1.0`. Do not copy the source's `0.3.0`.
- `engines.node` is `>=24`. License MIT, copied from the repo-root `LICENSE`.
- Published skill files must not contain the literals `CLAUDE.md`, `AGENTS.md`, `this repo`, `our repo`, `apps/api/src`, or `apps/web/src`.
- The markdown after the frontmatter equals the source body with one substitution: `# Course abstracts` → `# Study abstracts`. No other prose edits.
- `files` includes `anti-patterns`. The installed skill reads `anti-patterns/prose.md`.
- Do not add `study-abstract` to `skills-lock.json`, `scripts/snapshots/tarball-snapshot.json`, or `listCanaryPackages`.
- Do not edit pm-tasks, django, ts-ddd, or tests skill bodies. Do not bump marketplace `metadata.version` (leave `1.12.0`). Do not edit `AGENTS.md` or `~/.cursor/skills/course-abstract/`.
- Docs, identifiers, and commit messages are English. README translations live only in `docs/i18n/`.
- Branch is `study-abstract-v0.1.0`. Do not `npm publish`, push, or open a pull request.

## Review Focus

- Omitting `anti-patterns` from `package.json` `files` ships a skill whose mandatory read path is absent from the tarball.
- `package.json` at `0.1.0` or `0.3.0` together with a minor changeset publishes the wrong version. The branch must stay at `0.0.0` after the dry-run.
- Meta peer `^0.0.0` does not contain the released `0.1.0` and forces a later major. The peer range is `^0.1.0` while the package version is still `0.0.0`.
- Catalog-only edits that skip the layout tree in `docs/i18n/README.pt-BR.md` and `docs/i18n/README.es-ES.md` hide the family from the translated layout. All three READMEs name `study-` , `study-abstract/`, and `packages/study`.
- Golden `totalRaw` must equal baseline `score`. A `/120` raw total in either field fails consumers that compare the two files.

---

### Task 1: Port the guide into `skills/study-abstract`

**Files:**

- Create: `skills/study-abstract/SKILL.md`
- Create: `skills/study-abstract/anti-patterns/prose.md`
- Create: `skills/study-abstract/references/conflicts.md`
- Create: `skills/study-abstract/references/sources.md`
- Create: `skills/study-abstract/examples/index.md`
- Source: `/Users/lloli/.cursor/skills/course-abstract/`

**Interfaces:**

- Consumes: nothing
- Produces: a skill tree whose frontmatter `name` is `study-abstract`, `metadata.version` is `0.0.0`, `metadata.family` is `study`, and whose body matches the source except the H1.

- [ ] **Step 1: Copy the tree**

Copy `SKILL.md`, `anti-patterns/`, `references/`, and `examples/` from the source into `skills/study-abstract/`. Do not copy `.DS_Store`.

- [ ] **Step 2: Replace the frontmatter and the H1**

Use the frontmatter in spec §4 verbatim. Change the H1 from `# Course abstracts` to `# Study abstracts`. Change nothing else.

- [ ] **Step 3: Verify the body and the frontmatter**

Run:

```bash
diff -u \
  <(awk 'BEGIN{p=0} /^# /{p=1} p' /Users/lloli/.cursor/skills/course-abstract/SKILL.md | sed '1s/Course abstracts/Study abstracts/') \
  <(awk 'BEGIN{p=0} /^# /{p=1} p' skills/study-abstract/SKILL.md)
grep -nE 'CLAUDE\.md|AGENTS\.md|this repo|our repo|apps/(api|web)/src' skills/study-abstract || true
node scripts/checks/validate-frontmatter.mjs
```

Expected: `diff` prints nothing; grep prints nothing; frontmatter check exits 0 and mentions `study-abstract`.

- [ ] **Step 4: Commit**

```bash
git add skills/study-abstract
git commit -m "feat(study-abstract): port the course abstract into the study family"
```

---

### Task 2: Package `@llodev/study-abstract`

**Files:**

- Create: `skills/study-abstract/package.json`
- Create: `skills/study-abstract/README.md`
- Create: `skills/study-abstract/docs/i18n/README.pt-BR.md`
- Create: `skills/study-abstract/docs/i18n/README.es-ES.md`
- Create: `skills/study-abstract/LICENSE`
- Create: `skills/study-abstract/CHANGELOG.md`

**Interfaces:**

- Consumes: Task 1 skill tree
- Produces: a workspace package `@llodev/study-abstract@0.0.0` whose `files` list includes `anti-patterns`, `references`, `examples`, and `docs`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@llodev/study-abstract",
  "version": "0.0.0",
  "description": "Turn any study material into a didactic abstract the reader can use with the source closed.",
  "license": "MIT",
  "homepage": "https://github.com/llodev/skills/tree/main/skills/study-abstract",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "skills/study-abstract"
  },
  "files": [
    "SKILL.md",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "anti-patterns",
    "references",
    "examples",
    "docs"
  ],
  "keywords": ["agent-skill", "study", "abstract", "glossary"],
  "type": "module",
  "publishConfig": { "access": "public" },
  "engines": { "node": ">=24" }
}
```

- [ ] **Step 2: Copy `LICENSE` from the repo root and write a header-only changelog**

`CHANGELOG.md` is exactly:

```markdown
# @llodev/study-abstract
```

- [ ] **Step 3: Write the English README**

Mirror `skills/tests-http/README.md` chrome (language flags, npm / MIT / Node ≥24 / Agent Skills badges, install block, use table, contents table). H1 is `# @llodev/study-abstract`. The one-line quote is the package.json description. State that it is part of the `@llodev/study` family and that there is no MCP, no config, and no init.

Use table:

| Prompt example                       | What the agent does                                                   |
| ------------------------------------ | --------------------------------------------------------------------- |
| `"resume this lecture"`              | Writes one abstract in the language of the request, source closed     |
| `"abstract this folder of lectures"` | One abstract per unit, plus a short index                             |
| `"apply the errata"`                 | Keeps the source sentence and the correction as two labeled sentences |

Contents rows, all of them: `SKILL.md`, `anti-patterns/prose.md`, `references/conflicts.md`, `references/sources.md`, `examples/index.md`.

Language-flag links point at `skills/study-abstract/README.md` and `skills/study-abstract/docs/i18n/README.{pt-BR,es-ES}.md` on `github.com/llodev/skills`. Flag image URLs match `skills/tests-http/README.md`.

- [ ] **Step 4: Translate that README into pt-BR and es-ES**

Same structure, same links, same facts, same contents rows. No extra features. Badge alt text and headings translated. License line stays MIT.

- [ ] **Step 5: Lint published files**

Run: `node scripts/checks/published-content-lint.mjs`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add skills/study-abstract/package.json skills/study-abstract/README.md skills/study-abstract/docs skills/study-abstract/LICENSE skills/study-abstract/CHANGELOG.md
git commit -m "feat(study-abstract): package the guide for npm"
```

---

### Task 3: Meta-package `@llodev/study`

**Files:**

- Create: `packages/study/package.json`
- Create: `packages/study/README.md`
- Create: `packages/study/LICENSE`
- Create: `packages/study/CHANGELOG.md`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: package name `@llodev/study-abstract` from Task 2
- Produces: `@llodev/study@0.0.0` with peer `^0.1.0` and devDependency `workspace:*`. Not a marketplace plugin. Both new packages are importers in `pnpm-lock.yaml`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@llodev/study",
  "version": "0.0.0",
  "description": "Meta-package: installs the @llodev/study-* family (study abstracts).",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "packages/study"
  },
  "peerDependencies": {
    "@llodev/study-abstract": "^0.1.0"
  },
  "devDependencies": {
    "@llodev/study-abstract": "workspace:*"
  },
  "files": ["README.md"],
  "keywords": ["agent-skill", "study", "meta-package"],
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: README, LICENSE, changelog header**

README mirrors `packages/tests/README.md` at one-member scale: install `npm i @llodev/study`, list only `@llodev/study-abstract` with the package.json description, explain that a single member can be installed directly, and note that the meta versions independently via Changesets. `CHANGELOG.md` is exactly `# @llodev/study`. LICENSE is the repo-root MIT file.

- [ ] **Step 3: Register both packages in the lockfile**

Run: `pnpm install`

Commit `pnpm-lock.yaml` only if the diff is the new importers for `packages/study` and `skills/study-abstract`. If the diff contains anything else, stop and report it. Do not revert the importer hunks.

- [ ] **Step 4: Commit**

```bash
git add packages/study pnpm-lock.yaml
git commit -m "feat(study): add the study family meta-package"
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
- Produces: one marketplace plugin at `0.0.0` and catalog sections that name the released version `v0.1.0`, in English, pt-BR, and es-ES, including each layout tree

- [ ] **Step 1: Add the plugin**

Append to `plugins` (do not change `metadata.version`):

```json
{
  "name": "study-abstract",
  "category": "ai-tools",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/llodev/skills.git",
    "path": "skills/study-abstract"
  },
  "description": "Turn any study material into a didactic abstract the reader can use with the source closed.",
  "version": "0.0.0",
  "author": { "name": "llodev" },
  "keywords": ["agent-skill", "study", "abstract", "glossary"]
}
```

- [ ] **Step 2: Catalog, prefix sentence, and layout tree in `README.md`**

Insert after the `@llodev/tests` table and before `## Agent compatibility`. Status column is `✅ v0.1.0`.

```markdown
### `@llodev/study` — study-abstract skills

Pure **knowledge** skills that turn study material into a didactic abstract the reader can use with the source closed — no MCP, no config, no init. The first member covers lectures, readings, slides, notebooks, and errata. Further `study-*` members can join the same meta-package.

| Package                  | Status    | Source                                           | npm                            | Vercel CLI                                           |
| ------------------------ | --------- | ------------------------------------------------ | ------------------------------ | ---------------------------------------------------- |
| `@llodev/study` _(meta)_ | ✅ v0.1.0 | [packages/study/](packages/study/)               | `npm i @llodev/study`          | —                                                    |
| `@llodev/study-abstract` | ✅ v0.1.0 | [skills/study-abstract/](skills/study-abstract/) | `npm i @llodev/study-abstract` | `npx skills add llodev/skills/skills/study-abstract` |
```

In the family-prefix sentence, the list becomes `` `pm-tasks-`, `tests-`, and `study-` ``.

In the layout tree, `tests-http/` stops being the last skills entry and `tests/` stops being the last packages entry:

```
│   ├── tests-http/            HTTP test suites: discovery, NestJS and DRF adapters
│   └── study-abstract/        Study abstracts: spoken overview, glossary, self-check
```

```
│   ├── tests/                 Meta-package — installs the whole tests family
│   └── study/                 Meta-package — installs the whole study family
```

- [ ] **Step 3: The same three edits in both root i18n READMEs**

Insert the catalog at the same relative position (before the agent-compatibility heading). Update the prefix sentence and the layout tree. Links from `docs/i18n/` use the `../../` prefix already used for `tests`. Do not otherwise rewrite those files.

pt-BR catalog:

```markdown
### `@llodev/study` — skills de resumo de estudo

Skills puras de **conhecimento** que transformam material de estudo em um resumo didático que o leitor usa com a fonte fechada — sem MCP, sem config, sem init. O primeiro membro cobre aulas, leituras, slides, notebooks e errata. Outros membros `study-*` podem entrar no mesmo meta-pacote.

| Pacote                   | Status    | Fonte                                                  | npm                            | Vercel CLI                                           |
| ------------------------ | --------- | ------------------------------------------------------ | ------------------------------ | ---------------------------------------------------- |
| `@llodev/study` _(meta)_ | ✅ v0.1.0 | [packages/study/](../../packages/study/)               | `npm i @llodev/study`          | —                                                    |
| `@llodev/study-abstract` | ✅ v0.1.0 | [skills/study-abstract/](../../skills/study-abstract/) | `npm i @llodev/study-abstract` | `npx skills add llodev/skills/skills/study-abstract` |
```

pt-BR prefix list: `` `pm-tasks-`, `tests-` e `study-` ``.

pt-BR tree lines:

```
│   ├── tests-http/            Suítes de teste HTTP: descoberta, adaptadores NestJS e DRF
│   └── study-abstract/        Resumos de estudo: visão falada, glossário e autoavaliação
```

```
│   ├── tests/                 Meta-pacote — instala toda a família tests
│   └── study/                 Meta-pacote — instala toda a família study
```

es-ES catalog:

```markdown
### `@llodev/study` — skills de resumen de estudio

Skills puras de **conocimiento** que convierten material de estudio en un resumen didáctico que el lector usa con la fuente cerrada — sin MCP, sin config, sin init. El primer miembro cubre clases, lecturas, diapositivas, notebooks y erratas. Otros miembros `study-*` pueden unirse al mismo meta-paquete.

| Paquete                  | Estado    | Fuente                                                 | npm                            | Vercel CLI                                           |
| ------------------------ | --------- | ------------------------------------------------------ | ------------------------------ | ---------------------------------------------------- |
| `@llodev/study` _(meta)_ | ✅ v0.1.0 | [packages/study/](../../packages/study/)               | `npm i @llodev/study`          | —                                                    |
| `@llodev/study-abstract` | ✅ v0.1.0 | [skills/study-abstract/](../../skills/study-abstract/) | `npm i @llodev/study-abstract` | `npx skills add llodev/skills/skills/study-abstract` |
```

es-ES prefix list: `` `pm-tasks-`, `tests-` y `study-` ``.

es-ES tree lines:

```
│   ├── tests-http/            Suites de prueba HTTP: descubrimiento, adaptadores NestJS y DRF
│   └── study-abstract/        Resúmenes de estudio: visión hablada, glosario y autoevaluación
```

```
│   ├── tests/                 Meta-paquete — instala toda la familia tests
│   └── study/                 Meta-paquete — instala toda la familia study
```

- [ ] **Step 4: Roadmap**

In the opening sentence, replace ``(`django-*`, `ts-ddd-*`)`` with ``(`django-*`, `ts-ddd-*`, `tests-*`, `study-*`)``.

Append a subsection after the `tests-*` subsection:

```markdown
### `study-*` — study-abstract knowledge skills

Project-agnostic guides that turn study material into a didactic abstract the reader can use with the source closed. No MCP, no init. The agent writes in the language of the request, keeps conflicting accounts apart, and does not invent a number the source does not contain.

| Skill            | Concern                                                                                       | Status              |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| `study-abstract` | Spoken overview, one diagram, glossary, mix-ups, and hidden self-check answers, source closed | ✅ shipped `v0.1.0` |

`@llodev/study` is the npm meta-package. It is not a marketplace plugin. The published skill id is `study-abstract`. There is no `course-abstract` package.
```

- [ ] **Step 5: Parity check**

Run: `node scripts/checks/marketplace-parity.mjs`

Expected: `ok   study-abstract@0.0.0` and exit 0.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/marketplace.json README.md docs/i18n/README.pt-BR.md docs/i18n/README.es-ES.md docs/roadmap.md
git commit -m "docs(study): wire the study family into the catalog and marketplace"
```

---

### Task 5: Record the skill-judge baseline

**Files:**

- Modify: `scripts/snapshots/skill-judge-baseline.json`
- Modify: `scripts/snapshots/skill-judge-golden.json`

**Interfaces:**

- Consumes: final `skills/study-abstract/SKILL.md` from Task 1
- Produces: key `skills/study-abstract/SKILL.md` in both snapshots. `golden.totalRaw === baseline.score`, both in `0..100`.

- [ ] **Step 1: Score the skill**

Read `~/.claude/skills/skill-judge/SKILL.md` and score `skills/study-abstract/SKILL.md`. Let `raw` be the sum of the eight dimensions (max 120). Store `score = Math.round(raw / 120 * 100)`.

- [ ] **Step 2: Add the baseline entry after the `tests-http` key**

```json
"skills/study-abstract/SKILL.md": {
  "score": 0,
  "version": "0.0.0",
  "capturedAt": "2026-11-11",
  "notes": "First capture at package 0.0.0. Replace 0 with the rounded percentage and list D1–D8 raw points."
}
```

Replace the placeholder `0` and the notes with the real score and the dimension breakdown. If `score < 70`, fix only judge findings that are missing triggers or broken structure inside `SKILL.md`, re-score once, and store the second score. Do not add frameworks. Do not change the copied workflow beyond that.

- [ ] **Step 3: Add the golden entry with the same score**

Append after the `tests-http` key:

```json
"skills/study-abstract/SKILL.md": {
  "dimensionScores": {},
  "rubricChecksum": "manual",
  "rubricVersion": "v1",
  "totalRaw": 0
}
```

`totalRaw` equals the baseline `score`, not the `/120` raw sum.

- [ ] **Step 4: Commit**

```bash
git add scripts/snapshots/skill-judge-baseline.json scripts/snapshots/skill-judge-golden.json skills/study-abstract/SKILL.md
git commit -m "chore(study-abstract): record the skill-judge baseline"
```

---

### Task 6: Changeset and release rehearsal

**Files:**

- Create: `.changeset/study-abstract-first-release.md`

**Interfaces:**

- Consumes: both packages at `0.0.0`
- Produces: a minor changeset. After the dry-run the tree is back to `0.0.0` with the changeset still present. `make validate` and `make pre-release` exit 0.

- [ ] **Step 1: Write and commit the changeset before the dry-run**

```markdown
---
"@llodev/study-abstract": minor
"@llodev/study": minor
---

feat(study-abstract): first release of the study-abstract skill

New `study-*` family. `@llodev/study-abstract` turns study material into a
didactic abstract the reader can use with the source closed. `@llodev/study`
installs the family. No MCP, no runtime.
```

```bash
git add .changeset/study-abstract-first-release.md
git commit -m "chore(study-abstract): changeset for the first release at 0.1.0"
```

- [ ] **Step 2: Dry-run the bump, then restore**

Run: `pnpm changeset:version`

If it fails with GitHub 401 from the repo `.env` token, rerun `GITHUB_TOKEN="$(gh auth token)" pnpm changeset:version`. Do not modify `.env`. Do not print the token. A warning that `@llodev/study` depends on `^0.1.0` while the package is `0.0.0` is expected. Do not change the peer range.

Expected: `@llodev/study-abstract` and `@llodev/study` become `0.1.0`, and the marketplace plugin `version` becomes `0.1.0`. Then restore, leaving the changeset commit intact:

```bash
git restore .
git restore --source=HEAD --worktree --staged .changeset/study-abstract-first-release.md
git status --short
```

Expected: clean tree, both packages still `0.0.0`, changeset file present.

- [ ] **Step 3: Validate**

Run: `make validate && make pre-release`

Expected: exit 0. The skill-judge gate sees the baseline update and does not ask for `SKIP_SKILL_JUDGE_GATE`. Do not publish.

- [ ] **Step 4: No further commit if the restore was clean**

If Step 3 modifies files, commit only that fix. Do not leave versions at `0.1.0`.
