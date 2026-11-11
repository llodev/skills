# U1 — Language-Respect Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `.<tool>.json` `language` field a first-class, validated config value that is surfaced to the agent on skill activation and guarded by a deterministic doctor check, so agent-side narration (comments the agent authors, autonomous commit/PR copy, code comments) stops silently drifting to English.

**Architecture:** Three concentric layers. (1) **Schema** — add an optional `language` property to each adapter's `schemas/config.json` so the field has a persistent, validated home (today it only exists as a runtime param `RuntimeContext.language` with no config source). (2) **Surface** — a banner block in the core SKILL.md + each adapter SKILL.md that reads the configured `language` and states the narration contract. (3) **Guardrail** — a new core doctor check `C-LANG-1` (severity `warn`) that reports whether `language` is set and whether it matches an installed i18n bundle. All deterministic; no natural-language detection.

**Tech Stack:** TypeScript (NodeNext ESM), Node ≥20 runtime, Vitest, Ajv 2020 (JSON Schema draft 2020-12), pnpm workspace, Changesets.

## AMENDMENT 2026-08-01 (governs over the body below)

**The config field is the existing `locale`, not a new `language` field.** During Task 1 review it was confirmed that all four adapter `schemas/config.json` already declare a `locale` property (enum `en-US`/`pt-BR`/`es-ES`), that `.<tool>.json` files already set it (e.g. `.trello.json` → `"pt-BR"`), and that each adapter's `adapter.ts` already forwards it to `RuntimeContext.language` "for narration." Introducing a separate `language` field would collide with `locale` and make `C-LANG-1` false-warn for every existing user. **Decision (user-confirmed): reuse `locale`.** Therefore, everywhere the body says "add a `language` config field" or "check `config.language`":

- `C-LANG-1` reads **`config.locale`** (not `language`).
- **No new schema field is added** — `locale` already exists and is enum-validated. Tasks 3–4 shrink to **banner + `availableLocales` wiring only** (no `schemas/config.json` change, no schema test).
- The SKILL.md banners reference **`locale`** as the narration signal.
- The `^[a-z]{2}-[A-Z]{2}$` shape check stays as a harmless belt-and-suspenders alongside the schema enum; the installed-bundle cross-check against `availableLocales` is unchanged.
- The two-language distinction is unchanged in substance: `config.locale` governs agent narration; the plan governs task content.

## Scope correction vs roadmap §2.4

The roadmap's proposed mitigation was "add a probe in `pm-tasks-core-doctor` that warns when recent audit entries' free-text language doesn't match the config." **This is not buildable as written:** the audit log stores compact, sub-PIPE_BUF JSONL entries containing IDs only — `task.comment.add` records `id`, `commentId`, `clientToken?`, **never the comment body** (see `skills/pm-tasks-core/references/audit-log-format.md`). There is no free-text field in the audit log to language-detect, and heuristic NL detection would be a false-positive generator anyway. This plan replaces that probe with a **deterministic presence/validity check** on `config.language`, which addresses the same failure mode (agent has no language signal → drifts to English) at the source rather than after the fact. The banner (Task 3/5) is the actual behavioral fix; the doctor check is the guardrail.

## The two-language distinction (locked)

Two independent concerns — do not conflate them:

- **Plan language** governs **task content**: card title, description, checklist item text. Source = the plan/prompt the user wrote. **Unchanged, out of scope.**
- **Config `language`** governs **agent-side narration**: comments the agent authors autonomously, autonomous-mode commit/PR copy, code comments, and doctor/CLI narration. Source = `.<tool>.json` `language`. **This is what U1 adds.**

## Global Constraints

- **Node floor `>=20`** — published `engines.node` must stay `>=20`; use only Node 20+ built-ins in runtime code (no new deps). Copied verbatim from repo root `package.json`.
- **Additive-only, non-breaking** — every change is a new optional field / new check / new doc block. No existing field renamed or removed. → **minor** version bumps only.
- **One PR = one changeset = one release** (`CLAUDE.md` § Release convention). Never batch changesets across PRs. This plan is a **phased program**: core ships first (Release 1), then each adapter ships in its own PR (Releases 2–5), mirroring the Lifecycle Fidelity cadence (PRs #52–#60).
- **Branch naming `pmt-<skill>-v<X.Y.Z>`** — e.g. `pmt-core-v1.15.0`, then `pmt-trello-v1.9.0`, etc.
- **Supported locales are discovered dynamically** per adapter via `listLocales(adapterPkg)` reading `skills/pm-tasks-<tool>/i18n/*.json` (currently `en-US`, `pt-BR`, `es-ES`). Do **not** hardcode an enum in the config schema — validate the shape (`^[a-z]{2}-[A-Z]{2}$`), let the doctor cross-check against installed bundles.
- **`references/contract.md` is untouchable here** — editing it forces a core MAJOR (`contract-check` Phase A). U1 touches config schemas + SKILL.md + doctor only, never `contract.md`.
- **`make validate`** after any schema or SKILL-frontmatter change.

## File Structure

**Release 1 — core (`@llodev/pm-tasks-core`, minor → v1.15.0):**

- Modify `skills/pm-tasks-core/src/doctor.ts` — add `availableLocales?: string[]` to `DoctorContext`; add `C_LANG_1` check; export it in the core check list.
- Modify `skills/pm-tasks-core/src/bin/doctor.ts` — load installed locales via `listLocales` and pass `availableLocales` into `ctx`.
- Modify `skills/pm-tasks-core/tests/doctor.test.ts` — cover `C-LANG-1` (absent / valid / unknown-locale cases).
- Modify `skills/pm-tasks-core/SKILL.md` — add the "Narration language" banner block + reference it from the Autonomous mode section.
- Modify `skills/pm-tasks-core/references/doctor.md` — add `C-LANG-1` to the check catalog.
- Modify `skills/pm-tasks-core/references/autonomous-mode.md` — cross-link the narration-language contract.
- Create `.changeset/<slug>.md` — `@llodev/pm-tasks-core: minor`.

**Releases 2–5 — adapters (trello, asana, jira, linear; each minor, own PR):**

- Modify `skills/pm-tasks-<tool>/schemas/config.json` — add optional `language` property.
- Modify `skills/pm-tasks-<tool>/src/doctor-cli.ts` — load + pass `availableLocales`.
- Modify `skills/pm-tasks-<tool>/SKILL.md` — add the narration-language banner (adapter-flavored).
- Modify `skills/pm-tasks-<tool>/tests/…` — schema-accepts-`language` test.
- Create `.changeset/<slug>.md` — `@llodev/pm-tasks-<tool>: minor`.

---

### Task 1: Core doctor check `C-LANG-1` + context plumbing

**Files:**

- Modify: `skills/pm-tasks-core/src/doctor.ts` (add `availableLocales?` to `DoctorContext` near line 14-23; add `C_LANG_1` near the other `C_CFG_*` checks ~line 267+; add to the exported check array)
- Modify: `skills/pm-tasks-core/src/bin/doctor.ts` (import `listLocales` + `registerI18nRoot` from the adapter i18n root; populate `ctx.availableLocales`)
- Test: `skills/pm-tasks-core/tests/doctor.test.ts`

**Interfaces:**

- Consumes: `DoctorContext` (existing: `tool`, `config`, `configPath`, `manifest`, `schema`, `auditLogPath`, `auditRotationMaxBytes`, `coreVersion?`), `DoctorCheck`, `DoctorResult`, existing `asRecord`/`asString` helpers in `doctor.ts`.
- Produces: `DoctorContext.availableLocales?: string[]`; a new exported `DoctorCheck` `C_LANG_1` with `id: "C-LANG-1"`, `severity: "warn"`, included in the array returned/consumed by `runChecks` callers.

- [ ] **Step 1: Write the failing test** (append to `tests/doctor.test.ts`)

```typescript
import { runChecks } from "../src/doctor.js";

function baseCtx(overrides: Record<string, unknown> = {}) {
  return {
    tool: "trello",
    configPath: "/tmp/.trello.json",
    config: {},
    manifest: { tool: "trello", verbs: [] },
    schema: { type: "object" },
    auditLogPath: "/tmp/audit.log",
    auditRotationMaxBytes: 10 * 1024 * 1024,
    availableLocales: ["en-US", "pt-BR", "es-ES"],
    ...overrides,
  };
}

function lang(report: Awaited<ReturnType<typeof runChecks>>) {
  return report.results.find((r) => r.check.id === "C-LANG-1")!;
}

describe("C-LANG-1 narration language", () => {
  it("warns when language is absent", async () => {
    const report = await runChecks(baseCtx({ config: {} }), []);
    const r = lang(report);
    expect(r.check.severity).toBe("warn");
    expect(r.result.ok).toBe(false);
    expect(r.result.message).toMatch(/no .*language/i);
    expect(r.result.fixHint).toMatch(/\.trello\.json/);
  });

  it("passes and echoes the language when set to an installed locale", async () => {
    const report = await runChecks(baseCtx({ config: { language: "pt-BR" } }), []);
    const r = lang(report);
    expect(r.result.ok).toBe(true);
    expect(r.result.message).toMatch(/pt-BR/);
  });

  it("warns when language has no installed i18n bundle", async () => {
    const report = await runChecks(baseCtx({ config: { language: "fr-FR" } }), []);
    const r = lang(report);
    expect(r.result.ok).toBe(false);
    expect(r.result.message).toMatch(/fr-FR/);
    expect(r.result.message).toMatch(/en-US|pt-BR|es-ES/);
  });

  it("passes without cross-check when availableLocales is unknown", async () => {
    const report = await runChecks(
      baseCtx({ config: { language: "fr-FR" }, availableLocales: undefined }),
      [],
    );
    const r = lang(report);
    expect(r.result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @llodev/pm-tasks-core exec vitest run tests/doctor.test.ts -t "C-LANG-1"`
Expected: FAIL — `C-LANG-1` not found in results (`lang(report)` throws / undefined).

- [ ] **Step 3: Add `availableLocales` to `DoctorContext`** in `src/doctor.ts`

```typescript
export interface DoctorContext {
  tool: string;
  configPath: string;
  config: unknown; // parsed .<tool>.json
  manifest: { tool: string; verbs: string[] };
  schema: unknown;
  auditLogPath: string;
  auditRotationMaxBytes: number;
  coreVersion?: string;
  /** Installed i18n locales for this adapter (from listLocales). Absent ⇒ skip cross-check. */
  availableLocales?: string[];
}
```

- [ ] **Step 4: Implement `C_LANG_1`** in `src/doctor.ts` (place after `C_CFG_4`, follow the `C_CFG_*` style; use existing `asRecord`/`asString` helpers)

```typescript
const LANG_SHAPE = /^[a-z]{2}-[A-Z]{2}$/;

const C_LANG_1: DoctorCheck = {
  id: "C-LANG-1",
  label: "Narration language set + has an i18n bundle",
  severity: "warn",
  async run(ctx) {
    const cfg = asRecord(ctx.config);
    const language = asString(cfg["language"]).trim();

    if (!language) {
      return {
        ok: false,
        message:
          "no `language` set — agent-side narration (comments it authors, autonomous commit/PR copy, code comments) will default to English",
        fixHint: `Add "language": "<locale>" (e.g. "pt-BR") to .${ctx.tool}.json.`,
      };
    }

    if (!LANG_SHAPE.test(language)) {
      return {
        ok: false,
        message: `language "${language}" is not a BCP-47 locale of the form xx-XX`,
        fixHint: `Use a locale like en-US, pt-BR, or es-ES in .${ctx.tool}.json.`,
      };
    }

    const installed = ctx.availableLocales;
    if (installed && installed.length > 0 && !installed.includes(language)) {
      return {
        ok: false,
        message: `language "${language}" has no installed i18n bundle; available: ${installed.join(", ")}`,
        fixHint: `Set language to one of ${installed.join(", ")} in .${ctx.tool}.json.`,
      };
    }

    return { ok: true, message: `narration language: ${language}` };
  },
};
```

- [ ] **Step 5: Register `C_LANG_1`** in the core check list (add to the array that `runChecks` iterates — same array holding `C_CFG_1..4`).

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @llodev/pm-tasks-core exec vitest run tests/doctor.test.ts -t "C-LANG-1"`
Expected: PASS (all 4 cases).

- [ ] **Step 7: Wire `availableLocales` in `src/bin/doctor.ts`** — after `loadAdapterAssets`, register the adapter i18n root and list its locales; add to `ctx`. When assets are missing, leave `availableLocales` undefined (check self-skips cross-check).

```typescript
// inside the per-config loop, after `const assets = await loadAdapterAssets(tool);`
let availableLocales: string[] | undefined;
if (assets) {
  try {
    const i18nRoot = path.join(PACKAGES_ROOT, `pm-tasks-${tool}`, "i18n");
    registerI18nRoot(`__doctor-${tool}`, i18nRoot);
    availableLocales = await listLocales(`__doctor-${tool}`);
  } catch {
    availableLocales = undefined; // never crash the doctor over locale discovery
  }
}
// add `availableLocales` to the `ctx` object literal
```

- [ ] **Step 8: Run the full core doctor suite**

Run: `pnpm --filter @llodev/pm-tasks-core exec vitest run tests/doctor.test.ts`
Expected: PASS (existing + new cases).

- [ ] **Step 9: Commit**

```bash
git add skills/pm-tasks-core/src/doctor.ts skills/pm-tasks-core/src/bin/doctor.ts skills/pm-tasks-core/tests/doctor.test.ts
git commit -m "feat(pm-tasks-core): add C-LANG-1 doctor check for narration language"
```

---

### Task 2: Core SKILL.md narration banner + docs

**Files:**

- Modify: `skills/pm-tasks-core/SKILL.md` (add a "Narration language" block; cross-link from the Autonomous mode section at line ~56-58)
- Modify: `skills/pm-tasks-core/references/doctor.md` (add `C-LANG-1` row to the check catalog)
- Modify: `skills/pm-tasks-core/references/autonomous-mode.md` (one line: agent-side narration follows `config.language`)

**Interfaces:**

- Consumes: nothing (documentation).
- Produces: the canonical wording of the narration contract that adapter SKILL.md banners (Tasks 3–5) reference. Exact contract sentence (reuse verbatim downstream):

  > **Narration language.** When `.<tool>.json` sets `language`, all agent-authored narration — comments the agent writes, autonomous-mode commit and PR copy, code comments, and audit/CLI free-text — MUST be in that language. The **plan's** language still governs task content (title, description, checklist items); these are separate concerns.

- [ ] **Step 1: Add the "Narration language" block** to `skills/pm-tasks-core/SKILL.md` (immediately before or after the `## Autonomous mode` section)

```markdown
## Narration language

When the tool's config (`.<tool>.json`) sets `language`, all **agent-authored narration** — comments the agent writes, autonomous-mode commit and PR copy, code comments, and audit/CLI free-text — MUST be in that language. The **plan's** language still governs **task content** (title, description, checklist items); these are separate concerns. If `language` is unset, `pm-tasks-core-doctor` (`C-LANG-1`) warns and narration defaults to English.
```

- [ ] **Step 2: Cross-link from Autonomous mode** — append to the Autonomous mode paragraph: `Agent-authored copy (commits, PRs, comments) follows the workspace narration language — see [Narration language](#narration-language).`

- [ ] **Step 3: Add `C-LANG-1` to `references/doctor.md`** check catalog (match the existing row format for `C-CFG-*`):

```markdown
| C-LANG-1 | warn | Narration language set + has an i18n bundle | `language` unset, malformed, or has no installed i18n bundle |
```

- [ ] **Step 4: Add one line to `references/autonomous-mode.md`** under the audit/scope discussion: `Agent-authored free-text (commit/PR/comment copy) uses the configured \`language\`; task content uses the plan's language.`

- [ ] **Step 5: Validate frontmatter + links**

Run: `make validate`
Expected: PASS (frontmatter, schemas, links, locale parity all green).

- [ ] **Step 6: Commit**

```bash
git add skills/pm-tasks-core/SKILL.md skills/pm-tasks-core/references/doctor.md skills/pm-tasks-core/references/autonomous-mode.md
git commit -m "docs(pm-tasks-core): document narration-language contract + C-LANG-1"
```

---

### Task 3: Trello adapter — schema `language` + SKILL banner + doctor-cli wiring (reference adapter)

**Files:**

- Modify: `skills/pm-tasks-trello/schemas/config.json` (add optional `language` property)
- Modify: `skills/pm-tasks-trello/src/doctor-cli.ts` (load + pass `availableLocales`)
- Modify: `skills/pm-tasks-trello/SKILL.md` (adapter-flavored narration banner)
- Test: `skills/pm-tasks-trello/tests/` (schema-accepts-`language`; pick the existing schema/config test file — e.g. a `*config*.test.ts` — or create `tests/config-language.test.ts`)

**Interfaces:**

- Consumes: `runDoctor` in `doctor-cli.ts` (existing), the core `DoctorContext.availableLocales` field (Task 1), `validateConfig` from `@llodev/pm-tasks-core`.
- Produces: `.trello.json` may now carry `language`; `runDoctor` populates `ctx.availableLocales` from `pm-tasks-trello/i18n`.

- [ ] **Step 1: Write the failing schema test** (`tests/config-language.test.ts`)

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateConfig } from "@llodev/pm-tasks-core";

const ROOT = path.resolve(__dirname, "..");

async function schema() {
  return JSON.parse(await readFile(path.join(ROOT, "schemas", "config.json"), "utf8"));
}

it("accepts a valid language locale", async () => {
  const res = await validateConfig(
    { board: "b", lists: { todo: "l" }, language: "pt-BR" },
    await schema(),
  );
  expect(res.ok).toBe(true);
});

it("rejects a malformed language value", async () => {
  const res = await validateConfig(
    { board: "b", lists: { todo: "l" }, language: "portuguese" },
    await schema(),
  );
  expect(res.ok).toBe(false);
});
```

> Adjust the minimal-valid config body (`board`/`lists`) to whatever `schemas/config.json` marks as `required` — read the schema's `required` array first and mirror it, so only the `language` field is under test.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @llodev/pm-tasks-trello exec vitest run tests/config-language.test.ts`
Expected: FAIL — malformed value currently accepted (no `language` constraint yet), or valid value rejected if schema has `additionalProperties: false`.

- [ ] **Step 3: Add `language` to `schemas/config.json`** — inside `properties`, additive:

```json
"language": {
  "type": "string",
  "pattern": "^[a-z]{2}-[A-Z]{2}$",
  "description": "BCP-47 locale (e.g. pt-BR) governing agent-side narration: comments the agent authors, autonomous commit/PR copy, code comments. Task content follows the plan's language, not this field."
}
```

> If the schema sets `"additionalProperties": false`, this addition is what makes the valid-case test pass; keep the property optional (do NOT add it to `required`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @llodev/pm-tasks-trello exec vitest run tests/config-language.test.ts`
Expected: PASS (valid accepted, malformed rejected).

- [ ] **Step 5: Wire `availableLocales` in `src/doctor-cli.ts`** — mirror Task 1 Step 7: register `pm-tasks-trello/i18n` and pass `availableLocales` into the `DoctorContext` built in `runDoctor`.

```typescript
// after building schema/manifest, before constructing ctx:
let availableLocales: string[] | undefined;
try {
  registerI18nRoot("__doctor-trello", path.join(ROOT, "i18n"));
  availableLocales = await listLocales("__doctor-trello");
} catch {
  availableLocales = undefined;
}
// add `availableLocales` to the DoctorContext object
```

- [ ] **Step 6: Add the narration banner to `skills/pm-tasks-trello/SKILL.md`** (near the autonomous/config section):

```markdown
> **Narration language.** When `.trello.json` sets `language`, agent-authored narration — comments the agent writes, autonomous commit/PR copy, code comments — MUST use it. The plan's language still governs card title/description/checklist text. `pm-tasks-core-doctor` `C-LANG-1` warns if unset. See pm-tasks-core § Narration language.
```

- [ ] **Step 7: Full adapter check**

Run: `pnpm --filter @llodev/pm-tasks-trello build && pnpm --filter @llodev/pm-tasks-trello exec vitest run && make validate`
Expected: PASS (build, tests, frontmatter/schema/link validation).

- [ ] **Step 8: Commit**

```bash
git add skills/pm-tasks-trello/schemas/config.json skills/pm-tasks-trello/src/doctor-cli.ts skills/pm-tasks-trello/SKILL.md skills/pm-tasks-trello/tests/config-language.test.ts
git commit -m "feat(pm-tasks-trello): add language config field + narration banner"
```

---

### Task 4: Fan out to asana / jira / linear

Repeat Task 3 verbatim for each remaining released adapter. Each is an **independent PR + changeset + release** (Global Constraints). Same three changes per adapter: schema `language` property, `doctor-cli.ts` `availableLocales` wiring, SKILL.md banner, plus the schema-accepts-`language` test.

- [ ] **Step 1: asana** — `skills/pm-tasks-asana/{schemas/config.json,src/doctor-cli.ts,SKILL.md,tests/config-language.test.ts}`; adjust the minimal-valid config body to asana's `required` fields (workspace/project/section). Test → schema → doctor-cli → banner → `pnpm --filter @llodev/pm-tasks-asana exec vitest run` → commit.
- [ ] **Step 2: jira** — same, jira's `required` fields. `pnpm --filter @llodev/pm-tasks-jira exec vitest run` → commit.
- [ ] **Step 3: linear** — same, linear's `required` fields. `pnpm --filter @llodev/pm-tasks-linear exec vitest run` → commit.

> Each adapter's SKILL banner swaps `.trello.json` → `.<tool>.json` and the "card" noun for the adapter's noun (task/issue). Everything else is identical to Task 3.

---

### Task 5: Changesets + phased release

**Files:**

- Create: `.changeset/<descriptive-slug>.md` — one per release, on its own PR/branch.

**Interfaces:**

- Consumes: `make changeset` (Changesets CLI).
- Produces: one **minor** bump per package, released in sequence per the one-PR-one-release rule.

- [ ] **Step 1: Core release first** — branch `pmt-core-v1.15.0`. Changeset:

```markdown
---
"@llodev/pm-tasks-core": minor
---

Add `C-LANG-1` doctor check and the narration-language contract: when a workspace config sets `language`, agent-authored narration (comments, autonomous commit/PR copy, code comments) must use it; task content still follows the plan's language. Replaces the roadmap's audit-free-text probe (not buildable — the audit log stores IDs, not prose) with a deterministic presence/validity check.
```

Run: `make pre-release` (skill-judge + rubric-drift gates — SKILL.md changed, so re-affirm/ratchet the baseline per `CLAUDE.md`). Open PR, merge, release.

- [ ] **Step 2: Adapters after core is published** — one branch/PR/changeset each: `pmt-trello-v1.9.0`, `pmt-asana-v1.10.0`, `pmt-jira-v1.3.0`, `pmt-linear-v1.2.0` (bump each from its current version). Each changeset:

```markdown
---
"@llodev/pm-tasks-<tool>": minor
---

Add optional `language` config field + narration-language banner (U1). Agent-side narration honors `.<tool>.json` `language`; surfaced by pm-tasks-core `C-LANG-1`.
```

- [ ] **Step 3: Update the roadmap** — remove U1 from `docs/roadmap.md` §2.4 and §3 once all five releases land (top-of-doc rule: remove shipped items, don't strikethrough). Note the scope correction in the commit body.

---

## Self-Review

**1. Spec coverage** (roadmap §2.4 U1):

- "`.<tool>.json language` field must dictate agent-side narration" → Task 3/4 schema field + Task 2/3 banner establish and surface it. ✅
- "surface `language` to the agent on skill activation (banner in SKILL.md)" → Task 2 (core) + Task 3/4 (adapters). ✅
- "add a probe in `pm-tasks-core-doctor` that warns when … language doesn't match config" → **reinterpreted** as `C-LANG-1` deterministic presence/validity check (Task 1), because the audit log has no free-text to detect against. Scope-correction section documents why. ✅ (with explicit deviation)
- "plan's language still dictates task title/description (separate concern)" → codified in the two-language distinction + every banner. ✅

**2. Placeholder scan:** No TBD/TODO. Every code step has concrete code; the one parametric spot (adapter `required` fields in Tasks 3/4) is called out with an explicit "read the schema's `required` array and mirror it" instruction rather than left vague. ✅

**3. Type consistency:** `DoctorContext.availableLocales?: string[]` defined in Task 1 Step 3, consumed by `C_LANG_1` (Task 1 Step 4) and populated in `bin/doctor.ts` (Task 1 Step 7) and each `doctor-cli.ts` (Task 3 Step 5 / Task 4). Check id `C-LANG-1` is identical across doctor.ts, tests, `references/doctor.md`, and every banner. `registerI18nRoot` / `listLocales` signatures match `skills/pm-tasks-core/src/i18n/registry.ts`. ✅
