# ts-ddd family — packaging & release design

Date: 2026-07-17. Author: @lloliveiradev (+ Claude). Status: **approved (brainstorm)**, pending spec review.

## 1. Goal

Promote the 8 existing `ts-ddd-*` / `ts-query-cqrs` skills (currently raw `SKILL.md` folders) into fully packaged, publishable Agent Skills — mirroring the `django-schema-design` treatment — plus one npm meta-package `@llodev/ts-ddd` that installs the whole family, and wire the family into all global surfaces (marketplace, root README + i18n, roadmap, locks, snapshots).

These are **knowledge/guide skills — no MCP, no runtime dist**. The work is packaging + a one-time content generalization, not code.

## 2. Family membership (8 skills)

| Skill folder            | npm package                     | Kind                   |
| ----------------------- | ------------------------------- | ---------------------- |
| `ts-ddd-controller`     | `@llodev/ts-ddd-controller`     | guide                  |
| `ts-ddd-domain-service` | `@llodev/ts-ddd-domain-service` | guide                  |
| `ts-ddd-dto`            | `@llodev/ts-ddd-dto`            | guide                  |
| `ts-ddd-entity`         | `@llodev/ts-ddd-entity`         | guide                  |
| `ts-ddd-repository`     | `@llodev/ts-ddd-repository`     | guide                  |
| `ts-ddd-use-case`       | `@llodev/ts-ddd-use-case`       | guide                  |
| `ts-ddd-value-object`   | `@llodev/ts-ddd-value-object`   | guide                  |
| `ts-query-cqrs`         | `@llodev/ts-query-cqrs`         | guide (read-side CQRS) |

`ts-query-cqrs` keeps its folder/skill name (package name = folder name). The `ts-ddd-` prefix is broken for this one member; accepted to preserve installed-skill identity and its marketplace entry. Family cohesion is carried by the meta-package + roadmap grouping, not by the name prefix.

## 3. Key decisions (locked)

- **Coupling → generalize (project-agnostic).** The skills currently name a private monorepo ("your-best-day", `@your-best-day/*`). All references are rewritten to be portable.
  - Code examples & references use placeholder scope **`@acme/`** (`@acme/shared`, `@acme/<bc>-contracts`).
  - SKILL.md prose drops the project name: `(your-best-day monorepo)` → `a TypeScript + DDD monorepo`.
- **Versioning:** every skill and the meta start at **`0.1.0`**.
- **Branch / PR / changeset:** single `ts-ddd-family-v0.1.0` branch — **one PR = one changeset = one release** covering all 9 new packages (8 skills + meta) at 0.1.0.

## 4. Templates (exact molds)

- **Per-skill packaging** mirrors `skills/django-schema-design/`: `package.json`, `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`, `LICENSE`, `CHANGELOG.md`. Existing `SKILL.md`, `references/`, `agents/`, `examples/` stay.
  - Note vs django mold: ts-ddd skills also ship `agents/` and `examples/` dirs → both MUST be listed in `package.json` `files`.
- **Meta-package** mirrors `packages/pm-tasks/`: `package.json` (`peerDependencies` of the 8 skills at `^0.1.0`; `devDependencies` at `workspace:*`; `files: ["README.md"]`), `README.md`, `LICENSE`, `CHANGELOG.md`. Meta is **npm-only — NOT a marketplace plugin** (confirmed: marketplace lists individual skills only; `@llodev/pm-tasks` meta is absent from it).

## 5. Phased plan

### Phase 0 — Golden (skill-judge, current coupled state)

Run `skill-judge` against all 8 `SKILL.md` as-is. Record score + findings per skill. This is the documented "before".

### Phase 1 — Apply improvements

1. **Generalization** (the bulk): rewrite `your-best-day` → `@acme/` + generic prose across ~29 files (SKILL.md, `references/`, `examples/`, `agents/`). Parallelizable per-skill.
2. **Judge findings**: apply any relevant, in-scope improvements surfaced in Phase 0 (portability/clarity/completeness). Out-of-scope or speculative findings are logged, not applied.

### Phase 2 — Re-judge & ratchet

Re-run `skill-judge` on the generalized skills → capture new scores → write the 8 entries into `scripts/snapshots/skill-judge-baseline.json` (the ratcheted "after", with before/after noted).

### Phase 3 — Per-skill packaging ×8

For each skill: `package.json` (0.1.0, MIT, `homepage`/`repository.directory`, `files` incl. `references`+`agents`+`examples`+`docs`, keywords, `type: module`, `publishConfig.access: public`, `engines.node >=20`), `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`, `LICENSE` (copy root MIT), `CHANGELOG.md` (initial stub / changeset-seeded).

### Phase 4 — Meta package `packages/ts-ddd/`

`package.json` + `README.md` + `LICENSE` + `CHANGELOG.md` per the pm-tasks mold.

### Phase 5 — Global wiring

- `.claude-plugin/marketplace.json`: add 8 plugin entries (`category: ai-tools`, `git-subdir` source, description, `version: 0.1.0`, keywords); bump `metadata.version`.
- Root `README.md` + `docs/i18n` mirrors (pt-BR, es-ES): add ts-ddd family to the catalog + repo-layout tree.
- `docs/roadmap.md` §9 (families beyond pm-tasks): add ts-ddd entry; update the multi-family note (currently "first: django-*").
- `skills-lock.json`: add 8 entries with computed `SKILL.md` hashes.
- `scripts/snapshots/tarball-snapshot.json`: add goldens for the 9 new published tarballs (release gate).

### Phase 6 — Changeset & release rehearsal

One changeset (all 9 packages, 0.1.0). Run `make validate` + `make pre-release` (build → skill-judge baseline gate → rubric gate → doctor). Then push `ts-ddd-family-v0.1.0`, open PR, CI, merge, `make release-version` → `make release-publish` (executed consciously by the user).

## 6. Gates expected to fire (and how each is satisfied)

- **skill-judge baseline gate** — SKILL.md modified vs origin/main → baseline must update. Satisfied in Phase 2.
- **tarball-snapshot golden** — new published packages → new snapshots. Satisfied in Phase 5. First-release CHANGELOG drift may still require a golden fix on `changeset-release/main` (known pattern).
- **marketplace-parity test** — plugin versions must equal package.json versions. Kept consistent at 0.1.0.
- **rubric-drift gate** — untouched (we don't edit the judge rubric). No action.
- **contract-check** — only guards `pm-tasks-core/references/contract.md`. Untouched. No action.

## 7. Non-goals / YAGNI

- No renaming of `ts-query-cqrs`.
- No `.size-limit.json` entries (guides have no JS dist).
- No new skill content beyond generalization + in-scope judge fixes.
- No changes to pm-tasks or django families.
- No marketplace entry for the meta-package (npm-only, matching pm-tasks meta).

## 8. Open risks

- **Generalization completeness**: a stray `your-best-day` left in any file fails the "agnostic" bar. Mitigation: final `grep -r 'your-best-day' skills/ts-ddd-* skills/ts-query-cqrs` must return empty before packaging.
- **Judge scores for guides**: guide skills may score differently than adapters; baseline entries just record reality (no target score to hit).
- **Volume**: 8 READMEs + 16 i18n files + 8 package.json + snapshots is large but mechanical → parallel subagents in implementation.
