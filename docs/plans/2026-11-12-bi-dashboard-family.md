# bi-dashboard Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the untracked `dashboard-storytelling` guide as `@llodev/bi-dashboard` plus the `@llodev/bi` meta-package, on branch `bi-dashboard-v0.1.0`, ready for a `0.0.0` → `0.1.0` minor release.

**Architecture:** Translate the single Portuguese `SKILL.md` into English under `skills/bi-dashboard/`, then wrap it in the study-abstract packaging mold and wire the family into the marketplace, catalog, and roadmap. No runtime code.

**Tech Stack:** pnpm workspaces, Changesets, Node ≥24, Markdown skills, `.claude-plugin/marketplace.json`.

**Spec:** `docs/specs/2026-11-12-bi-dashboard-family-design.md`

## Global Constraints

- Skill folder, frontmatter `name`, and marketplace plugin name are exactly `bi-dashboard`. Package name is exactly `@llodev/bi-dashboard`. Meta package is exactly `@llodev/bi` at `packages/bi`.
- On this branch, `package.json` `version`, `metadata.version`, and marketplace plugin `version` are exactly `0.0.0`. Meta `peerDependencies["@llodev/bi-dashboard"]` is exactly `^0.1.0`.
- `engines.node` is `>=24`. License MIT, copied from the repo-root `LICENSE`.
- Published skill files must not contain the literals `CLAUDE.md`, `AGENTS.md`, `this repo`, `our repo`, `apps/api/src`, or `apps/web/src`.
- The English body keeps every phase, rule, checklist item, formula, `ChartStory` field, `form` union value, and token role name from `skills/dashboard-storytelling/SKILL.md`. The fenced-code-block count matches the source. Headings are the list in spec §4, in that order.
- `files` is `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `docs`. Do not add `references`, `examples`, or `anti-patterns`.
- Do not add `bi-dashboard` to `skills-lock.json`, `scripts/snapshots/tarball-snapshot.json`, `.prettierignore`, or `listCanaryPackages`.
- Do not edit pm-tasks, django, ts-ddd, tests, or study skill bodies. Do not bump marketplace `metadata.version` (leave `1.12.0`). Do not edit `AGENTS.md` or `skills/image-first-ui-design/`.
- Docs, identifiers, and commit messages are English. README translations live only in `docs/i18n/`.
- Branch is `bi-dashboard-v0.1.0`. Do not `npm publish`, push, or open a pull request.
- Delete `skills/dashboard-storytelling/` after the English skill is verified. It is untracked. Do not `git add` it.

## Review Focus

- A dropped code fence or a renamed `ChartStory` field ships a recipe the agent cannot follow. Fence count and the type's field names must match the source.
- `package.json` at `0.1.0` together with a minor changeset publishes the wrong version. The branch must stay at `0.0.0` after the dry-run.
- Meta peer `^0.0.0` does not contain the released `0.1.0` and forces a later major. The peer range is `^0.1.0` while the package version is still `0.0.0`.
- Catalog-only edits that skip the layout tree in `docs/i18n/README.pt-BR.md` and `docs/i18n/README.es-ES.md` hide the family from the translated layout. All three READMEs name `bi-`, `bi-dashboard/`, and `packages/bi`.
- Golden `totalRaw` must equal baseline `score`. A `/120` raw total in either field fails consumers that compare the two files.
- Leaving `skills/dashboard-storytelling/` in the tree publishes two ids for one guide the next time someone adds the directory.

---

### Task 1: Translate the guide into `skills/bi-dashboard`

**Files:**

- Create: `skills/bi-dashboard/SKILL.md`
- Delete: `skills/dashboard-storytelling/SKILL.md` (untracked source)
- Source: `skills/dashboard-storytelling/SKILL.md`

**Interfaces:**

- Consumes: nothing
- Produces: `skills/bi-dashboard/SKILL.md` whose frontmatter is spec §4, whose headings are spec §4 in order, and whose fenced-code-block count equals the source. The source directory is gone.

- [ ] **Step 1: Translate**

Read the whole source. Write `skills/bi-dashboard/SKILL.md` with the frontmatter and H1 from spec §4 and the headings from spec §4. Translate the prose. Keep formulas, `ChartStory` fields, the `form` union, and token role names. Keep `pt-BR` / `BRL` as the sample locale in `makeFormat`. Translate code comments and example UI strings.

- [ ] **Step 2: Verify structure**

Run:

````bash
python3 - <<'PY'
import pathlib, re
src = pathlib.Path("skills/dashboard-storytelling/SKILL.md").read_text()
dst = pathlib.Path("skills/bi-dashboard/SKILL.md").read_text()
def fences(text):
    return len(re.findall(r"^```", text, re.M))
assert fences(src) == fences(dst), (fences(src), fences(dst))
for field in ["title:", "subtitle:", "source?:", "form:", "highlight:", "reference?:", "annotations?:"]:
    assert field in dst, field
for form in ["time-bars", "category-bars", "heatmap", "funnel"]:
    assert form in dst, form
need = [
    "## How to use this skill",
    "### 1.1 Stack and where the dashboard lives",
    "### 3.1 The ChartStory contract",
    "### Rule 4 — Write the explanation on the chart",
    "### 9.6 BI tools (Power BI, Looker Studio, Metabase, Superset, Grafana)",
    "## 11. Final checklist",
    "## 12. Anti-patterns",
]
for h in need:
    assert h in dst, h
print("ok", fences(dst))
PY
grep -nE 'CLAUDE\.md|AGENTS\.md|this repo|our repo|apps/(api|web)/src' skills/bi-dashboard || true
node scripts/checks/validate-frontmatter.mjs
````

Expected: `ok <count>`; grep prints nothing; frontmatter check exits 0 and mentions `bi-dashboard`.

- [ ] **Step 3: Remove the source directory**

```bash
rm -rf skills/dashboard-storytelling
```

- [ ] **Step 4: Commit**

```bash
git add skills/bi-dashboard/SKILL.md
git commit -m "feat(bi-dashboard): translate the dashboard guide into the bi family"
```

If the pre-commit hook reflows the markdown, include that result. Do not add the file to `.prettierignore`.

---

### Task 2: Package `@llodev/bi-dashboard`

**Files:**

- Create: `skills/bi-dashboard/package.json`
- Create: `skills/bi-dashboard/README.md`
- Create: `skills/bi-dashboard/docs/i18n/README.pt-BR.md`
- Create: `skills/bi-dashboard/docs/i18n/README.es-ES.md`
- Create: `skills/bi-dashboard/LICENSE`
- Create: `skills/bi-dashboard/CHANGELOG.md`

**Interfaces:**

- Consumes: Task 1 skill file
- Produces: a workspace package `@llodev/bi-dashboard@0.0.0` whose `files` list is `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `docs`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@llodev/bi-dashboard",
  "version": "0.0.0",
  "description": "Design dashboards and charts that state one conclusion before the reader checks an axis.",
  "license": "MIT",
  "homepage": "https://github.com/llodev/skills/tree/main/skills/bi-dashboard",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "skills/bi-dashboard"
  },
  "files": ["SKILL.md", "README.md", "LICENSE", "CHANGELOG.md", "docs"],
  "keywords": ["agent-skill", "bi", "dashboard", "chart"],
  "type": "module",
  "publishConfig": { "access": "public" },
  "engines": { "node": ">=24" }
}
```

- [ ] **Step 2: Copy `LICENSE` from the repo root and write a header-only changelog**

`CHANGELOG.md` is exactly:

```markdown
# @llodev/bi-dashboard
```

- [ ] **Step 3: Write the English README**

Mirror `skills/study-abstract/README.md` chrome (language flags, npm / MIT / Node ≥24 / Agent Skills badges, install block, use table, contents table). H1 is `# @llodev/bi-dashboard`. The one-line quote is the package.json description. State that it is part of the `@llodev/bi` family and that there is no MCP, no config, and no init.

Use table:

| Prompt example                           | What the agent does                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `"build the revenue dashboard"`          | Explores the project, computes one ChartStory per chart, then implements  |
| `"review this dashboard"`                | Runs exploration and the final checklist, then proposes prioritized edits |
| `"this chart title just names the axis"` | Rewrites the title as the conclusion and annotates the highlight          |

Contents has one row: `SKILL.md` — phases 0–5, the four chart rules, stack recipes, and the final checklist.

Language-flag links point at `skills/bi-dashboard/README.md` and `skills/bi-dashboard/docs/i18n/README.{pt-BR,es-ES}.md` on `github.com/llodev/skills`. Flag image URLs match `skills/study-abstract/README.md`.

- [ ] **Step 4: Translate that README into pt-BR and es-ES**

Same structure, same links, same facts, same contents row. No extra features. Badge alt text and headings translated. License line stays MIT.

- [ ] **Step 5: Lint published files**

Run: `node scripts/checks/published-content-lint.mjs`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add skills/bi-dashboard/package.json skills/bi-dashboard/README.md skills/bi-dashboard/docs skills/bi-dashboard/LICENSE skills/bi-dashboard/CHANGELOG.md
git commit -m "feat(bi-dashboard): package the guide for npm"
```

---

### Task 3: Meta-package `@llodev/bi`

**Files:**

- Create: `packages/bi/package.json`
- Create: `packages/bi/README.md`
- Create: `packages/bi/LICENSE`
- Create: `packages/bi/CHANGELOG.md`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: package name `@llodev/bi-dashboard` from Task 2
- Produces: `@llodev/bi@0.0.0` with peer `^0.1.0` and devDependency `workspace:*`. Not a marketplace plugin. Both new packages are importers in `pnpm-lock.yaml`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@llodev/bi",
  "version": "0.0.0",
  "description": "Meta-package: installs the @llodev/bi-* family (dashboards and charts).",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "packages/bi"
  },
  "peerDependencies": {
    "@llodev/bi-dashboard": "^0.1.0"
  },
  "devDependencies": {
    "@llodev/bi-dashboard": "workspace:*"
  },
  "files": ["README.md"],
  "keywords": ["agent-skill", "bi", "meta-package"],
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: README, LICENSE, changelog header**

README mirrors `packages/study/README.md` at one-member scale: install `npm i @llodev/bi`, list only `@llodev/bi-dashboard` with the package.json description, explain that a single member can be installed directly, and note that the meta versions independently via Changesets. `CHANGELOG.md` is exactly `# @llodev/bi`. LICENSE is the repo-root MIT file.

- [ ] **Step 3: Register both packages in the lockfile**

Run: `pnpm install`

Commit `pnpm-lock.yaml` only if the diff is the new importers for `packages/bi` and `skills/bi-dashboard`. If the diff contains anything else, stop and report it. Do not revert the importer hunks.

- [ ] **Step 4: Commit**

```bash
git add packages/bi pnpm-lock.yaml
git commit -m "feat(bi): add the bi family meta-package"
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
  "name": "bi-dashboard",
  "category": "ai-tools",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/llodev/skills.git",
    "path": "skills/bi-dashboard"
  },
  "description": "Design dashboards and charts that state one conclusion before the reader checks an axis.",
  "version": "0.0.0",
  "author": { "name": "llodev" },
  "keywords": ["agent-skill", "bi", "dashboard", "chart"]
}
```

- [ ] **Step 2: Catalog, prefix sentence, and layout tree in `README.md`**

Insert after the `@llodev/study` table and before `## Agent compatibility`. Status column is `✅ v0.1.0`.

```markdown
### `@llodev/bi` — dashboard and chart skills

Pure **knowledge** skills for dashboards, charts, and KPI cards that state one conclusion before the reader checks an axis — no MCP, no config, no init. The first member discovers the project design system, computes one story per chart, then implements it in the stack the project already uses. Further `bi-*` members can join the same meta-package.

| Package                | Status    | Source                                       | npm                          | Vercel CLI                                         |
| ---------------------- | --------- | -------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `@llodev/bi` _(meta)_  | ✅ v0.1.0 | [packages/bi/](packages/bi/)                 | `npm i @llodev/bi`           | —                                                  |
| `@llodev/bi-dashboard` | ✅ v0.1.0 | [skills/bi-dashboard/](skills/bi-dashboard/) | `npm i @llodev/bi-dashboard` | `npx skills add llodev/skills/skills/bi-dashboard` |
```

In the family-prefix sentence, the list becomes `` `pm-tasks-`, `tests-`, `study-`, and `bi-` ``.

In the layout tree, `study-abstract/` stops being the last skills entry and `study/` stops being the last packages entry:

```
│   ├── study-abstract/        Study abstracts: spoken overview, glossary, self-check
│   └── bi-dashboard/          Dashboards and charts: conclusion title, one highlight
```

```
│   ├── study/                 Meta-package — installs the whole study family
│   └── bi/                    Meta-package — installs the whole bi family
```

- [ ] **Step 3: The same three edits in both root i18n READMEs**

Insert the catalog at the same relative position (before the agent-compatibility heading). Update the prefix sentence and the layout tree. Links from `docs/i18n/` use the `../../` prefix already used for `study`. Do not otherwise rewrite those files.

pt-BR catalog:

```markdown
### `@llodev/bi` — skills de dashboard e gráfico

Skills puras de **conhecimento** para dashboards, gráficos e cards de KPI que dizem uma conclusão antes de o leitor olhar um eixo — sem MCP, sem config, sem init. O primeiro membro descobre o design system do projeto, calcula uma história por gráfico e implementa na stack que o projeto já usa. Outros membros `bi-*` podem entrar no mesmo meta-pacote.

| Pacote                 | Status    | Fonte                                              | npm                          | Vercel CLI                                         |
| ---------------------- | --------- | -------------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `@llodev/bi` _(meta)_  | ✅ v0.1.0 | [packages/bi/](../../packages/bi/)                 | `npm i @llodev/bi`           | —                                                  |
| `@llodev/bi-dashboard` | ✅ v0.1.0 | [skills/bi-dashboard/](../../skills/bi-dashboard/) | `npm i @llodev/bi-dashboard` | `npx skills add llodev/skills/skills/bi-dashboard` |
```

pt-BR prefix list: `` `pm-tasks-`, `tests-`, `study-` e `bi-` ``.

pt-BR tree lines:

```
│   ├── study-abstract/        Resumos de estudo: visão falada, glossário e autoavaliação
│   └── bi-dashboard/          Dashboards e gráficos: título-conclusão e um destaque
```

```
│   ├── study/                 Meta-pacote — instala toda a família study
│   └── bi/                    Meta-pacote — instala toda a família bi
```

es-ES catalog:

```markdown
### `@llodev/bi` — skills de dashboard y gráfico

Skills puras de **conocimiento** para dashboards, gráficos y tarjetas de KPI que dicen una conclusión antes de que el lector mire un eje — sin MCP, sin config, sin init. El primer miembro descubre el design system del proyecto, calcula una historia por gráfico e implementa en la stack que el proyecto ya usa. Otros miembros `bi-*` pueden unirse al mismo meta-paquete.

| Paquete                | Estado    | Fuente                                             | npm                          | Vercel CLI                                         |
| ---------------------- | --------- | -------------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `@llodev/bi` _(meta)_  | ✅ v0.1.0 | [packages/bi/](../../packages/bi/)                 | `npm i @llodev/bi`           | —                                                  |
| `@llodev/bi-dashboard` | ✅ v0.1.0 | [skills/bi-dashboard/](../../skills/bi-dashboard/) | `npm i @llodev/bi-dashboard` | `npx skills add llodev/skills/skills/bi-dashboard` |
```

es-ES prefix list: `` `pm-tasks-`, `tests-`, `study-` y `bi-` ``.

es-ES tree lines:

```
│   ├── study-abstract/        Resúmenes de estudio: visión hablada, glosario y autoevaluación
│   └── bi-dashboard/          Dashboards y gráficos: título-conclusión y un destaque
```

```
│   ├── study/                 Meta-paquete — instala toda la familia study
│   └── bi/                    Meta-paquete — instala toda la familia bi
```

- [ ] **Step 4: Roadmap**

In the header sentence that lists §9 families, replace ``(`django-*`, `ts-ddd-*`, `tests-*`, `study-*`)`` with ``(`django-*`, `ts-ddd-*`, `tests-*`, `study-*`, `bi-*`)``.

Append a subsection after the `study-*` subsection:

```markdown
### `bi-*` — dashboard and chart knowledge skills

Project-agnostic guides for dashboards, charts, and KPI cards that state one conclusion before the reader checks an axis. No MCP, no init. The agent discovers the project design system, computes every cited number, and implements in the stack the project already uses.

| Skill          | Concern                                                                                       | Status              |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| `bi-dashboard` | Conclusion titles, one highlight, direct annotation, and stack recipes from React to BI tools | ✅ shipped `v0.1.0` |

`@llodev/bi` is the npm meta-package. It is not a marketplace plugin. The published skill id is `bi-dashboard`. There is no `dashboard-storytelling` package.
```

- [ ] **Step 5: Parity check**

Run: `node scripts/checks/marketplace-parity.mjs`

Expected: `ok   bi-dashboard@0.0.0` and exit 0.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/marketplace.json README.md docs/i18n/README.pt-BR.md docs/i18n/README.es-ES.md docs/roadmap.md
git commit -m "docs(bi): wire the bi family into the catalog and marketplace"
```

---

### Task 5: Record the skill-judge baseline

**Files:**

- Modify: `scripts/snapshots/skill-judge-baseline.json`
- Modify: `scripts/snapshots/skill-judge-golden.json`

**Interfaces:**

- Consumes: final `skills/bi-dashboard/SKILL.md` from Task 1
- Produces: key `skills/bi-dashboard/SKILL.md` in both snapshots. `golden.totalRaw === baseline.score`, both in `0..100`.

- [ ] **Step 1: Score the skill**

Read `~/.claude/skills/skill-judge/SKILL.md` and score `skills/bi-dashboard/SKILL.md`. Let `raw` be the sum of the eight dimensions (max 120). Store `score = Math.round(raw / 120 * 100)`.

- [ ] **Step 2: Add the baseline entry after the `study-abstract` key**

```json
"skills/bi-dashboard/SKILL.md": {
  "score": 0,
  "version": "0.0.0",
  "capturedAt": "2026-11-12",
  "notes": "First capture at package 0.0.0. Replace 0 with the rounded percentage and list D1–D8 raw points."
}
```

Replace the placeholder `0` and the notes with the real score and the dimension breakdown. If `score < 70`, fix only judge findings that are missing triggers or broken structure inside `SKILL.md`, re-score once, and store the second score. Do not add frameworks. Do not change the translated workflow beyond that.

- [ ] **Step 3: Add the golden entry with the same score**

Append after the `study-abstract` key:

```json
"skills/bi-dashboard/SKILL.md": {
  "dimensionScores": {},
  "rubricChecksum": "manual",
  "rubricVersion": "v1",
  "totalRaw": 0
}
```

`totalRaw` equals the baseline `score`, not the `/120` raw sum.

- [ ] **Step 4: Commit**

```bash
git add scripts/snapshots/skill-judge-baseline.json scripts/snapshots/skill-judge-golden.json skills/bi-dashboard/SKILL.md
git commit -m "chore(bi-dashboard): record the skill-judge baseline"
```

---

### Task 6: Changeset and release rehearsal

**Files:**

- Create: `.changeset/bi-dashboard-first-release.md`

**Interfaces:**

- Consumes: both packages at `0.0.0`
- Produces: a minor changeset. After the dry-run the tree is back to `0.0.0` with the changeset still present. `make validate` and `make pre-release` exit 0.

- [ ] **Step 1: Write and commit the changeset before the dry-run**

```markdown
---
"@llodev/bi-dashboard": minor
"@llodev/bi": minor
---

feat(bi-dashboard): first release of the bi-dashboard skill

New `bi-*` family. `@llodev/bi-dashboard` designs dashboards and charts that
state one conclusion before the reader checks an axis. `@llodev/bi` installs
the family. No MCP, no runtime.
```

```bash
git add .changeset/bi-dashboard-first-release.md
git commit -m "chore(bi-dashboard): changeset for the first release at 0.1.0"
```

- [ ] **Step 2: Dry-run the bump, then restore**

Run: `pnpm changeset:version`

If it fails with GitHub 401 from the repo `.env` token, rerun `GITHUB_TOKEN="$(gh auth token)" pnpm changeset:version`. Do not modify `.env`. Do not print the token. A warning that `@llodev/bi` depends on `^0.1.0` while the package is `0.0.0` is expected. Do not change the peer range.

Expected: `@llodev/bi-dashboard` and `@llodev/bi` become `0.1.0`, and the marketplace plugin `version` becomes `0.1.0`. Then restore, leaving the changeset commit intact:

```bash
git restore .
git restore --source=HEAD --worktree --staged .changeset/bi-dashboard-first-release.md
git status --short
```

Expected: clean tree except unrelated untracked files, both packages still `0.0.0`, changeset file present. `skills/image-first-ui-design/` may show as untracked. Do not add it.

- [ ] **Step 3: Validate**

Run: `make validate && make pre-release`

Expected: exit 0. The skill-judge gate sees the baseline update and does not ask for `SKIP_SKILL_JUDGE_GATE`. Do not publish.

- [ ] **Step 4: No further commit if the restore was clean**

If Step 3 modifies files, commit only that fix. Do not leave versions at `0.1.0`.
