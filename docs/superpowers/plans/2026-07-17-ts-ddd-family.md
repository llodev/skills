# ts-ddd Family Packaging & 0.1.0 Release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the 8 existing `ts-ddd-*` / `ts-query-cqrs` guide skills into fully packaged, project-agnostic, publishable Agent Skills + one npm meta-package `@llodev/ts-ddd`, wired into every global surface, released together at `0.1.0`.

**Architecture:** Pure packaging + a one-time content generalization (no runtime code). Each skill mirrors the `skills/django-schema-design/` mold; the meta mirrors `packages/pm-tasks/`. One branch = one changeset = one release (all 9 packages at 0.1.0). Spec: `docs/superpowers/specs/2026-07-17-ts-ddd-family-design.md`.

**Tech Stack:** pnpm workspaces, Changesets, Node ≥20, Vitest (node:test for check scripts), Makefile gates, `.claude-plugin/marketplace.json`.

## Global Constraints

- **Placeholder convention:** code/refs use scope `@acme/` (`@acme/shared`, `@acme/<bc>-contracts`); SKILL.md prose replaces `(your-best-day monorepo)` / "your-best-day" with "a TypeScript + DDD monorepo". After generalization, `grep -rn 'your-best-day' skills/ts-ddd-* skills/ts-query-cqrs` MUST return empty.
- **Versions:** every skill package + the meta start at exactly `0.1.0`. Marketplace plugin `version` MUST equal the skill's `package.json` `version` (marketplace-parity gate).
- **License:** MIT everywhere (copy root `LICENSE` verbatim).
- **Node engine:** `"engines": { "node": ">=20" }` in every skill package.json.
- **`agents/` dir removed** from all 8 skills (Codex-only manifest, no consumer, not in django/pm-tasks molds).
- **Do NOT add ts-ddd to** `scripts/snapshots/tarball-snapshot.json` or `skills-lock.json` — both are pm-tasks-scoped hardcoded lists; django (a shipped family) is absent from both. Mirror django.
- **Do NOT touch** `pm-tasks-core/references/contract.md` (core-major gate), the skill-judge rubric, or the pm-tasks / django families.
- **Family list (8):** `ts-ddd-controller`, `ts-ddd-domain-service`, `ts-ddd-dto`, `ts-ddd-entity`, `ts-ddd-repository`, `ts-ddd-use-case`, `ts-ddd-value-object`, `ts-query-cqrs`.
- **Branch:** `ts-ddd-family-v0.1.0` (already created; the design spec commit is its first commit).

---

## Task 0: Capture the "before" — repo green state + skill-judge golden

**Files:**

- Read-only this task (no commits except a notes file under scratchpad, not committed).

**Interfaces:**

- Produces: a recorded per-skill judge score table (used verbatim in Task 2) + confirmation that `pnpm coverage` is green on the branch tip BEFORE any change.

- [ ] **Step 1: Confirm clean starting point**

Run: `git status --short && git branch --show-current`
Expected: clean tree, branch `ts-ddd-family-v0.1.0`.

- [ ] **Step 2: Record baseline test/coverage state (guards the vitest example-collection risk)**

Run: `pnpm coverage 2>&1 | tail -25`
Expected: PASS (or `passWithNoTests`). Note whether any `skills/ts-ddd-*/examples/*.test.ts` file is collected/executed. If any example test currently RUNS and PASSES, packaging won't change that (package.json adds no vitest config). If any FAILS, it is pre-existing — record it; Task 3 Step-final re-checks that we did not make it worse.

- [ ] **Step 3: Run skill-judge on each of the 8 skills AS-IS (coupled state = the golden "before")**

For each skill, invoke the `skill-judge` skill against `skills/<skill>/SKILL.md` and record the numeric total + dimension scores + the top findings. Do all 8:

```
skills/ts-ddd-controller/SKILL.md
skills/ts-ddd-domain-service/SKILL.md
skills/ts-ddd-dto/SKILL.md
skills/ts-ddd-entity/SKILL.md
skills/ts-ddd-repository/SKILL.md
skills/ts-ddd-use-case/SKILL.md
skills/ts-ddd-value-object/SKILL.md
skills/ts-query-cqrs/SKILL.md
```

Write the results to `<scratchpad>/ts-ddd-judge-before.md` as a table: `skill | totalRaw | dimensionScores | key findings`. This file is a working artifact (not committed).

- [ ] **Step 4: Triage findings into in-scope vs out-of-scope**

In `ts-ddd-judge-before.md`, tag each finding: **IN** (portability/clarity/completeness fixable within this packaging pass — apply in Task 1 Step 2) or **OUT** (new-content/behavioral — log only, do not apply). Generalization (de-coupling) is already an IN item by decision.

- [ ] **Step 5: No commit** (this task only produces the working artifact + decisions consumed downstream).

---

## Task 1: Generalization sweep + remove `agents/`

**Files (per skill — all 8):**

- Modify: every file under `skills/<skill>/` containing `your-best-day` (SKILL.md, `references/*.md`, `examples/*`).
- Delete: `skills/<skill>/agents/` (whole dir).

**Interfaces:**

- Consumes: Task 0 Step 4 IN-findings list.
- Produces: fully agnostic skill bodies (no `your-best-day`, scope `@acme/`) ready for packaging. SKILL.md `name` and `description` frontmatter keys unchanged in shape (still valid frontmatter).

- [ ] **Step 1: Remove the Codex agent manifests**

Run:

```bash
git rm -r skills/ts-ddd-controller/agents skills/ts-ddd-domain-service/agents \
  skills/ts-ddd-dto/agents skills/ts-ddd-entity/agents skills/ts-ddd-repository/agents \
  skills/ts-ddd-use-case/agents skills/ts-ddd-value-object/agents skills/ts-query-cqrs/agents
```

Expected: 8 `openai.yaml` files staged for deletion.

- [ ] **Step 2: Rewrite couplings (per skill; parallelizable — one subagent per skill)**

For each skill, apply these substitutions across SKILL.md + references + examples:

- `@your-best-day/` → `@acme/` (e.g. `@your-best-day/shared` → `@acme/shared`, `@your-best-day/<bc>-contracts` → `@acme/<bc>-contracts`).
- Prose `(your-best-day monorepo)` → `(a TypeScript + DDD monorepo)`; standalone "your-best-day" project references → "the monorepo" / "a TypeScript + DDD monorepo" as reads naturally.
- Apply the IN-findings from Task 0 for that skill (only IN — never OUT).

Do NOT change: the DDD pattern content, `apps/api/src/<bc>/...` path shapes (already generic with `<bc>` placeholder), `Result`/`Entity`/`ValueObject` API names.

- [ ] **Step 3: Verify zero residue**

Run: `grep -rn 'your-best-day' skills/ts-ddd-* skills/ts-query-cqrs`
Expected: **no output** (exit 1). If anything prints, fix it and re-run.

- [ ] **Step 4: Verify frontmatter + links still valid**

Run: `node scripts/checks/validate-frontmatter.mjs && node scripts/checks/validate-links.mjs`
Expected: EXIT 0 for both.

- [ ] **Step 5: Exclude illustrative examples from vitest collection (fixes pre-existing red coverage)**

DISCOVERED IN TASK 0: `pnpm coverage` is **already red on `main`** — the `skills/ts-ddd-*/examples/*.test.ts` files are collected by vitest (`projects: ["skills/*", "packages/*"]`, no `test.exclude`) and fail because they import packages that don't exist in this repo (`@your-best-day/*` → after generalization `@acme/*`, and `@celebrations/*`). These example files are **illustrative documentation, not a runnable suite** — they demonstrate DDD/test patterns and are shipped inside the packages, not executed. Only ts-ddd skills have an `examples/` dir (verified: no pm-tasks/django `examples/`), so excluding `examples/` is scoped to this family.

Edit `vitest.config.ts` to stop collecting example files. Import `configDefaults` and add `**/examples/**` to a root `test.exclude` so defaults are preserved:

```ts
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["skills/*", "packages/*"],
    exclude: [...configDefaults.exclude, "**/examples/**"],
    coverage: {
      // ...unchanged...
    },
  },
});
```

Run: `pnpm coverage 2>&1 | tail -15`
Expected: PASS now (the 4 previously-failing example test files are no longer collected; all real `src/**` suites still run). This is the new green baseline all later coverage checks compare against.

- [ ] **Step 6: Commit**

```bash
git add skills/ts-ddd-* skills/ts-query-cqrs vitest.config.ts
git commit -m "refactor(ts-ddd): generalize skills to @acme/ placeholder, drop Codex agents manifest, exclude illustrative examples from vitest"
```

---

## Task 2: Re-judge and write the skill-judge golden + baseline

**Files:**

- Modify: `scripts/snapshots/skill-judge-baseline.json` (add 8 entries).
- Modify: `scripts/snapshots/skill-judge-golden.json` (add 8 entries — MUST stay key-parity + score-parity with baseline; see `skill-judge-baseline.test.mjs` invariants).

**Interfaces:**

- Consumes: generalized skills from Task 1.
- Produces: baseline/golden entries so the `make pre-release` skill-judge gate treats ts-ddd as tracked (not an unratcheted drift).

> **Context — invariants the two snapshot files must satisfy** (from `scripts/checks/skill-judge-baseline.test.mjs`, even though that test is currently orphaned/not in CI, keep the files internally correct):
>
> - baseline entry: `{ score:0..100, version:"x.y.z", capturedAt:"YYYY-MM-DD", notes:"..." }`.
> - golden entry: `{ rubricVersion:"vN"|"vN.N", rubricChecksum:"sha256:<hex>"|"manual", dimensionScores:{...}, totalRaw:<int> }`.
> - golden ↔ baseline: identical key sets; `golden[k].totalRaw === baseline[k].score`.
> - Existing keys use the `skills/<name>/SKILL.md` form — match it (NOT the stale `pm-tasks/` regex in the orphaned test).

- [ ] **Step 1: Re-run skill-judge on all 8 generalized skills**

Invoke `skill-judge` again on each `skills/<skill>/SKILL.md`. Record new totalRaw + dimensionScores. Compare to Task 0 "before" — note deltas (generalization typically neutral-to-positive on portability/clarity).

- [ ] **Step 2: Add 8 baseline entries**

Add to `scripts/snapshots/skill-judge-baseline.json`, keyed `skills/ts-ddd-controller/SKILL.md` … `skills/ts-query-cqrs/SKILL.md`. Each:

```json
"skills/ts-ddd-entity/SKILL.md": {
  "score": <totalRaw from Step 1>,
  "version": "0.1.0",
  "capturedAt": "2026-07-17",
  "notes": "ts-ddd family first packaging. Generalized to @acme/ placeholder (de-coupled from private monorepo); Codex agents/ manifest removed. Score after generalization; before-score recorded in plan Task 0."
}
```

- [ ] **Step 3: Add the matching 8 golden entries**

Add to `scripts/snapshots/skill-judge-golden.json` with identical keys and `totalRaw === baseline score`:

```json
"skills/ts-ddd-entity/SKILL.md": {
  "rubricVersion": "<same rubricVersion the pm-tasks entries use>",
  "rubricChecksum": "<same checksum the pm-tasks entries use, or \"manual\">",
  "dimensionScores": { <from Step 1> },
  "totalRaw": <same int as baseline score>
}
```

Copy `rubricVersion` + `rubricChecksum` from an existing pm-tasks golden entry so all entries share one rubric identity.

- [ ] **Step 4: Verify snapshot invariants**

Run: `node --test scripts/checks/skill-judge-baseline.test.mjs 2>&1 | grep -E 'pass|fail'`
Expected: the golden key-parity + totalRaw-parity assertions PASS for the new keys. (The pre-existing `^pm-tasks/` regex assertion + a stale pm-tasks golden/baseline mismatch already fail on `main` — do NOT fix them here; they are orphaned and out of scope. Confirm you introduced no NEW failures beyond those two.)

- [ ] **Step 5: Commit**

```bash
git add scripts/snapshots/skill-judge-baseline.json scripts/snapshots/skill-judge-golden.json
git commit -m "chore(ts-ddd): record skill-judge baseline + golden for 8 ts-ddd skills @ 0.1.0"
```

---

## Task 3: Per-skill packaging ×8 (package.json, README, i18n, LICENSE, CHANGELOG)

**Files (per skill `S` in the family list):**

- Create: `skills/S/package.json`
- Create: `skills/S/README.md`
- Create: `skills/S/docs/i18n/README.pt-BR.md`
- Create: `skills/S/docs/i18n/README.es-ES.md`
- Create: `skills/S/LICENSE` (copy of root `LICENSE`)
- Create: `skills/S/CHANGELOG.md`

**Interfaces:**

- Consumes: generalized skill bodies (Task 1).
- Produces: 8 publishable npm packages named `@llodev/<S>` at `0.1.0`. Marketplace (Task 5) and meta peerDeps (Task 4) rely on these exact names + version.

**Per-skill data table** (every value the templates below need):

| S (folder)            | pkg `@llodev/…`       | one-liner (README `>` + npm description)                                                                                          | keywords (after `agent-skill`,`typescript`,`ddd`) | references files                            | examples files                                                                                                         |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ts-ddd-controller     | ts-ddd-controller     | HTTP controllers in a TypeScript + DDD API — routes, guards, Zod validation, use-case orchestration, Result→HTTP mapping.         | `controller`,`nestjs`,`http`,`zod`                | controller-pattern.md, nestjs.md            | product.controller.nestjs.ts                                                                                           |
| ts-ddd-domain-service | ts-ddd-domain-service | Domain services for logic that spans entities — stateless policies/calculators returning `Result`.                                | `domain-service`,`policy`,`result`                | domain-service-pattern.md                   | permission-policy.service.ts, permission-policy.service.test.ts, stock-calculator.service.ts                           |
| ts-ddd-dto            | ts-ddd-dto            | DTOs & contracts — Zod 4 schemas paired with `z.infer` types, enum-backed closed sets, input/output/read projections.             | `dto`,`zod`,`contracts`,`cqrs`                    | dto-pattern.md                              | product.dto.ts                                                                                                         |
| ts-ddd-entity         | ts-ddd-entity         | Domain entities — `Entity` base, `create`/`tryCreate` with `Result.combine`, VO normalization, state transitions via `cloneWith`. | `entity`,`aggregate`,`result`                     | entity-pattern.md                           | product.entity.ts, product.entity.test.ts                                                                              |
| ts-ddd-repository     | ts-ddd-repository     | Repository ports + adapters — Firestore/InMemory pair, `toFirestore`/`fromFirestore`, DI token, contract tests.                   | `repository`,`firestore`,`persistence`            | repository-pattern.md, firestore-adapter.md | product.repository.ts, in-memory-product.repository.ts                                                                 |
| ts-ddd-use-case       | ts-ddd-use-case       | Application use cases — `UseCase<IN,OUT>`, `@Injectable()` + repo-port orchestration, `Result.ok`/`fail`/`combine`.               | `use-case`,`application`,`result`                 | use-case-pattern.md                         | create-greeting.usecase.example.ts, README.md                                                                          |
| ts-ddd-value-object   | ts-ddd-value-object   | Value objects — `ValueObject` + `Result`, closed-set + composite VOs, `tryCreate`/`create`, normalization.                        | `value-object`,`vo`,`result`                      | vo-pattern.md                               | palette-key.vo.ts, palette-key.vo.test.ts, celebration-slot-index.vo.ts, celebration-slot-index.vo.test.ts, slug.vo.ts |
| ts-query-cqrs         | ts-query-cqrs         | Read-side CQRS queries — `*Query` ports, `find-*` read use cases, DTO projections, pagination/filters, Prisma/InMemory.           | `cqrs`,`query`,`read-model`,`prisma`              | query-cqrs-pattern.md, prisma-adapter.md    | find-many-items.query.ts, in-memory-find-many-items.query.ts                                                           |

- [ ] **Step 1: `package.json` template — instantiate per row**

Create `skills/S/package.json` (fill `{{PKG}}`, `{{DESC}}`, `{{KEYWORDS}}`; `files` lists the dirs that exist for that skill — always `SKILL.md`,`README.md`,`LICENSE`,`CHANGELOG.md`,`references`,`examples`,`docs`):

```json
{
  "name": "@llodev/{{PKG}}",
  "version": "0.1.0",
  "description": "{{DESC}}",
  "license": "MIT",
  "homepage": "https://github.com/llodev/skills/tree/main/skills/{{PKG}}",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "skills/{{PKG}}"
  },
  "files": ["SKILL.md", "README.md", "LICENSE", "CHANGELOG.md", "references", "examples", "docs"],
  "keywords": ["agent-skill", "typescript", "ddd", {{KEYWORDS}}],
  "type": "module",
  "publishConfig": { "access": "public" },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 2: `LICENSE` — copy root verbatim**

Run (per skill): `cp LICENSE skills/S/LICENSE`

- [ ] **Step 3: `README.md` template — instantiate per row**

Create `skills/S/README.md` mirroring `skills/django-schema-design/README.md` structure exactly (readme-selector block → title → blockquote one-liner → badges → family line → "What you get" → Install → Use → Contents → License). Fill from the row. Family line: `Part of the \`@llodev/ts-ddd\` family.` Install block:

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/{{PKG}}

# Vercel CLI
npx skills add llodev/skills/skills/{{PKG}}
```

Contents table: one row per `references/*` + `examples/*` file from the data table, each with a 1-line description. The readme-selector `<p align="center">` block: copy django's, swapping the three `django-schema-design` path segments for `{{PKG}}`.

- [ ] **Step 4: i18n README pt-BR + es-ES — instantiate per row**

Create `skills/S/docs/i18n/README.pt-BR.md` and `README.es-ES.md` as faithful translations of Step 3's README (same sections, same links, same selector block). Use `skills/django-schema-design/docs/i18n/README.pt-BR.md` + `README.es-ES.md` as the tone/structure reference. Links inside must resolve (validate-links) and the selector must point back to the en-US README + sibling locale.

- [ ] **Step 5: `CHANGELOG.md` stub — per skill**

Create `skills/S/CHANGELOG.md`:

```markdown
# @llodev/{{PKG}}

Release history is generated by [Changesets](https://github.com/changesets/changesets) on `changeset version`. The first entry (`0.1.0`) lands when this package is first released; until then the pending change lives in `.changeset/`.
```

- [ ] **Step 6: Verify packaging gates**

Run:

```bash
node scripts/checks/validate-localized-paths.mjs && \
node scripts/checks/validate-locale-parity.mjs && \
node scripts/checks/validate-links.mjs && \
pnpm coverage 2>&1 | tail -8
```

Expected: EXIT 0 on the three validators; coverage no worse than Task 0 Step 2 baseline (packaging added no vitest config, so example-test collection is unchanged — confirm).

- [ ] **Step 7: Verify each tarball contents are sane (spot-check, not gated)**

Run (one skill): `cd skills/ts-ddd-entity && pnpm pack --pack-destination /tmp && tar -tzf /tmp/llodev-ts-ddd-entity-0.1.0.tgz | sort; cd -`
Expected: SKILL.md, README.md, LICENSE, CHANGELOG.md, references/_, examples/_, docs/i18n/* — and **no** `agents/`.

- [ ] **Step 8: Commit**

```bash
git add skills/ts-ddd-* skills/ts-query-cqrs
git commit -m "feat(ts-ddd): package 8 ts-ddd skills for npm (pkg + README + i18n + LICENSE + CHANGELOG) @ 0.1.0"
```

---

## Task 4: Meta-package `packages/ts-ddd/`

**Files:**

- Create: `packages/ts-ddd/package.json`
- Create: `packages/ts-ddd/README.md`
- Create: `packages/ts-ddd/LICENSE`
- Create: `packages/ts-ddd/CHANGELOG.md`

**Interfaces:**

- Consumes: the 8 `@llodev/<S>@0.1.0` packages (Task 3).
- Produces: `@llodev/ts-ddd@0.1.0` meta that installs the whole family.

- [ ] **Step 1: `package.json` (mirror `packages/pm-tasks/package.json`)**

```json
{
  "name": "@llodev/ts-ddd",
  "version": "0.1.0",
  "description": "Meta-package: installs the entire @llodev/ts-ddd-* family (entity, value-object, dto, use-case, repository, controller, domain-service + ts-query-cqrs).",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/llodev/skills.git",
    "directory": "packages/ts-ddd"
  },
  "peerDependencies": {
    "@llodev/ts-ddd-entity": "^0.1.0",
    "@llodev/ts-ddd-value-object": "^0.1.0",
    "@llodev/ts-ddd-dto": "^0.1.0",
    "@llodev/ts-ddd-use-case": "^0.1.0",
    "@llodev/ts-ddd-repository": "^0.1.0",
    "@llodev/ts-ddd-controller": "^0.1.0",
    "@llodev/ts-ddd-domain-service": "^0.1.0",
    "@llodev/ts-query-cqrs": "^0.1.0"
  },
  "devDependencies": {
    "@llodev/ts-ddd-entity": "workspace:*",
    "@llodev/ts-ddd-value-object": "workspace:*",
    "@llodev/ts-ddd-dto": "workspace:*",
    "@llodev/ts-ddd-use-case": "workspace:*",
    "@llodev/ts-ddd-repository": "workspace:*",
    "@llodev/ts-ddd-controller": "workspace:*",
    "@llodev/ts-ddd-domain-service": "workspace:*",
    "@llodev/ts-query-cqrs": "workspace:*"
  },
  "files": ["README.md"],
  "keywords": ["agent-skill", "ts-ddd", "meta-package"],
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: `LICENSE`**

Run: `cp LICENSE packages/ts-ddd/LICENSE`

- [ ] **Step 3: `README.md` (mirror `packages/pm-tasks/README.md`)**

Sections: title `# @llodev/ts-ddd` → intro → `## Install` (`npm i @llodev/ts-ddd`) → bulleted list of the 8 packages each linked to `https://www.npmjs.com/package/@llodev/<S>` with a 1-line role → `## Why a meta-package?` → `## Versioning` (meta on its own 0.x line, skills pinned via `peerDependencies`, bumped by Changesets) → `## License`.

- [ ] **Step 4: `CHANGELOG.md` stub**

```markdown
# @llodev/ts-ddd

Release history is generated by [Changesets](https://github.com/changesets/changesets) on `changeset version`. The first entry (`0.1.0`) lands when this package is first released; until then the pending change lives in `.changeset/`.
```

- [ ] **Step 5: Install to wire workspace links**

Run: `pnpm install --lockfile-only`
Expected: lockfile updated with the new workspace packages, no errors. (Reminder: dep overrides live in root `package.json` `pnpm.overrides`, not `pnpm-workspace.yaml`.)

- [ ] **Step 6: Commit**

```bash
git add packages/ts-ddd pnpm-lock.yaml
git commit -m "feat(ts-ddd): add @llodev/ts-ddd meta-package @ 0.1.0 (installs the 8-skill family)"
```

---

## Task 5: Global wiring — marketplace, root README + i18n, roadmap

**Files:**

- Modify: `.claude-plugin/marketplace.json` (add 8 plugin entries; bump `metadata.version`)
- Modify: `README.md` (root — Catalog section + repo-layout tree + family summary)
- Modify: `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md` (mirror root README changes)
- Modify: `docs/roadmap.md` (§9 family entry + multi-family note on line 5)

**Interfaces:**

- Consumes: skill package names/versions (Task 3), meta (Task 4).
- Produces: discoverable, parity-passing global surfaces.

- [ ] **Step 1: marketplace.json — add 8 plugin entries**

For each skill append an entry mirroring the `django-schema-design` block (`.claude-plugin/marketplace.json`), with `category: "ai-tools"`, `source: { source: "git-subdir", url: "https://github.com/llodev/skills.git", path: "skills/<S>" }`, the row's description, `"version": "0.1.0"`, `author: { name: "llodev" }`, and `keywords` = the package.json keywords. Then bump top-level `metadata.version` (e.g. `1.11.0` → `1.12.0`).

- [ ] **Step 2: Verify marketplace parity**

Run: `node scripts/checks/marketplace-parity.mjs && node --test scripts/checks/marketplace-parity.test.mjs 2>&1 | grep -E 'pass|fail'`
Expected: PASS — each ts-ddd plugin `version` matches its `skills/<S>/package.json` version (0.1.0) and `source.path` resolves.

- [ ] **Step 3: Root README — Catalog + tree + summary**

In `README.md`: add a `### \`@llodev/ts-ddd\` — TypeScript DDD design skills`block to`## Catalog`(a table row per skill mirroring the django row format: pkg | status`✅ v0.1.0`| path link |`npm i`|`npx skills add …`, plus a meta row for `@llodev/ts-ddd`). Add the 8 skills under the repo-layout tree (line ~117 area). Add a "New family" summary paragraph near line ~167 mirroring the django one.

- [ ] **Step 4: i18n root READMEs — mirror Step 3**

Apply the equivalent Catalog/tree/summary additions to `docs/i18n/README.pt-BR.md` and `docs/i18n/README.es-ES.md`, translated.

- [ ] **Step 5: roadmap.md**

- Line 5: extend the multi-family note — `(first: \`django-_\`)`→`(families: \`django-_\`, \`ts-ddd-*\`)`.
- In `## 9. Beyond pm-tasks — new skill families`, add a `### \`ts-ddd-*\` — TypeScript DDD design knowledge skills`subsection with a table: the 8 skills each`✅ shipped \`v0.1.0\``, plus the `@llodev/ts-ddd` meta. One-line intro that they are project-agnostic DDD guides (entity/VO/DTO/use-case/repository/controller/domain-service + read-side CQRS).

- [ ] **Step 6: Verify docs gates**

Run: `pnpm validate 2>&1 | tail -20`
Expected: all validators + marketplace-parity + tarball-snapshot (pm-tasks only, unaffected) + lint + coverage + size PASS. Investigate any failure before proceeding.

- [ ] **Step 7: Commit**

```bash
git add .claude-plugin/marketplace.json README.md docs/i18n/README.pt-BR.md docs/i18n/README.es-ES.md docs/roadmap.md
git commit -m "docs(ts-ddd): wire family into marketplace, root README + i18n, roadmap"
```

---

## Task 6: Changeset + release rehearsal

**Files:**

- Create: `.changeset/<name>.md` (one changeset, all 9 packages).

**Interfaces:**

- Consumes: everything above.
- Produces: a release-ready branch that passes `make pre-release`.

- [ ] **Step 1: Reset versions to `0.0.0` for a clean first-release bump (CONFIRMED mechanic)**

`changeset:version` = `changeset version && pnpm run version:sync` — `version:sync` mirrors each `package.json` version into `.claude-plugin/marketplace.json` AFTER the bump. `changeset version` bumps the CURRENT `package.json` value, so 0.1.0 + minor → **0.2.0** (wrong). The changesets standard for a first release is to start at **0.0.0** so minor → **0.1.0**. `marketplace-parity` requires `marketplace.plugin.version === package.json.version` (strict equal), so the marketplace plugin versions must match whatever `package.json` holds at all times.

Therefore, reconcile the 0.1.0 values that Tasks 3–5 wrote:

1. Set `version` to `0.0.0` in ALL 9 `package.json`: the 8 `skills/ts-ddd-*/package.json` + `skills/ts-query-cqrs/package.json` + `packages/ts-ddd/package.json`.
2. Set `version` to `0.0.0` for the 8 ts-ddd plugin entries in `.claude-plugin/marketplace.json` (the meta is not a plugin — leave it out; leave top-level `metadata.version` at `1.12.0`).
3. Leave the `scripts/snapshots/skill-judge-baseline.json` `"version": "0.1.0"` notes as-is (they label the target release, not the current package version; the baseline test only checks `\d+\.\d+\.\d+`).

Result: on this feature PR everything sits at `0.0.0` (parity green: 0.0.0 == 0.0.0). At `make release-version` the minor changeset bumps all 9 to `0.1.0` and `version:sync` lifts the marketplace plugins to `0.1.0` — the standard changesets two-PR flow (feature@0.0.0 → "Version Packages"@0.1.0 → publish).

- [ ] **Step 2: Write the changeset**

Create `.changeset/ts-ddd-family-first-release.md`:

```markdown
---
"@llodev/ts-ddd-entity": minor
"@llodev/ts-ddd-value-object": minor
"@llodev/ts-ddd-dto": minor
"@llodev/ts-ddd-use-case": minor
"@llodev/ts-ddd-repository": minor
"@llodev/ts-ddd-controller": minor
"@llodev/ts-ddd-domain-service": minor
"@llodev/ts-query-cqrs": minor
"@llodev/ts-ddd": minor
---

feat(ts-ddd): first release of the TypeScript + DDD design skill family

New `@llodev/ts-ddd-*` family — 8 project-agnostic guide skills (entity,
value-object, dto, use-case, repository, controller, domain-service, and
read-side `ts-query-cqrs`) plus the `@llodev/ts-ddd` meta-package that
installs them all. Generalized from a private monorepo to the `@acme/`
placeholder convention; each ships README (en/pt-BR/es-ES), references,
and worked examples. No MCP, no runtime — pure knowledge skills.
```

- [ ] **Step 3: Dry-run version to confirm 0.1.0 (no double-bump)**

On a throwaway state, run `pnpm changeset:version` and inspect the resulting `package.json` versions for the 9 packages — each MUST become `0.1.0` (not `0.2.0`), and `version:sync` MUST lift the 8 marketplace plugins to `0.1.0` too. Then FULLY DISCARD the dry-run: `git checkout -- . && git clean -fd .changeset` is wrong (would drop the real changeset) — instead `git stash` or `git checkout -- <version-modified files>` leaving `.changeset/ts-ddd-family-first-release.md` intact. The real bump happens at release time, not now: after the dry-run the tree must be back to all-`0.0.0` with the changeset present.

- [ ] **Step 4: Full validate + pre-release gate**

Run: `make validate && make pre-release`
Expected: PASS. `pre-release` runs build → **skill-judge baseline gate** (ts-ddd SKILL.md modified vs origin/main; baseline updated in Task 2 → passes without `SKIP_SKILL_JUDGE_GATE`) → **rubric-drift gate** (untouched → passes) → **doctor**. If the doctor trips on local `.trello.json` scope (known local-only noise), note it — CI skips it.

- [ ] **Step 5: Commit the changeset**

```bash
git add .changeset/ts-ddd-family-first-release.md
git commit -m "chore(ts-ddd): changeset for ts-ddd family first release @ 0.1.0"
```

- [ ] **Step 6: Push + PR (user-driven merge/release)**

```bash
git push -u origin ts-ddd-family-v0.1.0
gh pr create --title "feat(release): ts-ddd family v0.1.0 — 8 DDD guide skills + @llodev/ts-ddd meta" --body "<summary of the family, generalization, and the 9 new 0.1.0 packages>"
```

Then: CI green → merge → `make release-version` (Version Packages PR) → merge → `make release-publish`. **These final release steps are executed consciously by the user**, not automatically. Watch for the known first-release CHANGELOG tarball-snapshot drift pattern (fix golden on `changeset-release/main` if it bites — though ts-ddd is not in the tarball snapshot, so this likely won't apply here).

---

## Self-review notes (coverage of spec)

- Spec §2 membership (8) → Global Constraints + Task 3 data table. ✅
- Spec §3 decisions (agnostic/@acme/, 0.1.0, single branch/changeset) → Global Constraints, Task 1, Task 6. ✅
- Spec §4 molds (django per-skill, pm-tasks meta) → Task 3, Task 4. ✅
- Spec §4 `agents/` removal → Task 1 Step 1. ✅
- Spec §5 phases 0–6 → Tasks 0–6. ✅
- Spec §6 gates (skill-judge baseline, tarball, marketplace-parity, rubric, contract) → Task 2, Task 5 Step 2/6, Task 6 Step 4 + Global Constraints (tarball/contract "do NOT touch"). ✅
- Spec §7 non-goals (no rename, no size-limit, no pm-tasks/django changes, no meta marketplace entry) → Global Constraints + Task 5 (meta absent from marketplace additions). ✅
- Spec §8 risks (generalization completeness grep, guide judge scores, volume→parallel) → Task 1 Step 3, Task 0 Step 3, Task 3 (per-skill parallelizable). ✅
