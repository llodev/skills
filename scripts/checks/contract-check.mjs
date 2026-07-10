#!/usr/bin/env node
// Phase A: Fails if contract.md changed without a matching major changeset.
// Phase B: Validates adapter manifests against schema + cross-checks SKILL.md verb mentions.
import { execSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv = require("ajv/dist/2020");

// ── Phase A: contract.md change detection ────────────────────────────────────

const BASE = process.env.GITHUB_BASE_REF || "main";
const CONTRACT = "skills/pm-tasks-core/references/contract.md";

let failed = false;

const changed = execSync(`git diff --name-only origin/${BASE}...HEAD`, { encoding: "utf8" })
  .trim()
  .split("\n");

if (!changed.includes(CONTRACT)) {
  console.log("ok   contract.md unchanged");
  // Phase A passes — fall through to Phase B
} else {
  // Additive-only check: if zero deletions, it's non-breaking → minor permitted.
  const numstat = execSync(`git diff --numstat origin/${BASE}...HEAD -- ${CONTRACT}`, {
    encoding: "utf8",
  }).trim();
  let phaseADone = false;
  if (numstat) {
    const [insertions, deletions] = numstat.split(/\s+/);
    if (Number(deletions) === 0 && Number(insertions) > 0) {
      console.log(
        `ok   contract.md additive-only (${insertions} insertions, 0 deletions) — minor permitted`,
      );
      phaseADone = true;
    }
  }

  if (!phaseADone) {
    const csDir = ".changeset";
    if (!existsSync(csDir)) {
      console.error("FAIL contract changed but .changeset/ missing");
      failed = true;
    } else {
      const csFiles = execSync(`ls ${csDir}/*.md 2>/dev/null || true`, { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter(Boolean);
      let hasCoreMajor = false;
      for (const f of csFiles) {
        const src = await readFile(f, "utf8");
        if (/^"@llodev\/pm-tasks-core":\s*major\s*$/m.test(src)) {
          hasCoreMajor = true;
          break;
        }
      }
      if (hasCoreMajor) {
        console.log("ok   contract.md changed with matching core major bump");
      } else {
        console.error("FAIL contract.md changed but no major changeset for @llodev/pm-tasks-core");
        failed = true;
      }
    }
  }
}

// ── Phase B: adapter manifest validation ─────────────────────────────────────

const schemaPath = "skills/pm-tasks-core/schemas/adapter-manifest.schema.json";
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const ajv = new Ajv({ strict: false });
const validate = ajv.compile(schema);

const CANONICAL_VERBS = new Set([
  "task.create",
  "task.move",
  "task.close",
  "task.due-date.set",
  "task.assignee.add",
  "task.comment.add",
  "checklist.check",
  // F3 + F7 (v1.11.0): adapter-optional — existing adapters need not declare these verbs.
  // Jira adapter (Phase 2) will declare them; adding here allows declaration without namespace error.
  "task.parent.set",
  "task.estimate.set",
]);

const entries = await readdir("skills", { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  if (!entry.name.startsWith("pm-tasks-")) continue;
  if (entry.name === "pm-tasks-core") continue;

  const pkgJsonPath = `skills/${entry.name}/package.json`;
  if (!existsSync(pkgJsonPath)) continue;
  const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf8"));

  // Skip scaffolds: version starts with "0."
  if (pkgJson.version?.startsWith("0.")) continue;

  const manifestPath = `skills/${entry.name}/manifest.json`;
  if (!existsSync(manifestPath)) {
    console.error(`FAIL ${entry.name}: missing manifest.json`);
    failed = true;
    continue;
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  if (!validate(manifest)) {
    console.error(
      `FAIL ${entry.name}: manifest schema violations: ${JSON.stringify(validate.errors)}`,
    );
    failed = true;
    continue;
  }

  // Cross-field: custom (non-canonical) verbs must start with manifest.tool namespace
  let adapterFailed = false;
  for (const verb of manifest.verbs) {
    if (CANONICAL_VERBS.has(verb)) continue;
    const namespace = verb.split(".")[0];
    if (namespace !== manifest.tool) {
      console.error(
        `FAIL ${entry.name}: custom verb '${verb}' must start with namespace '${manifest.tool}.' (manifest.tool = '${manifest.tool}')`,
      );
      failed = true;
      adapterFailed = true;
    }
  }

  // SKILL.md grep: every verb must appear in the adapter's SKILL.md
  const skillMdPath = `skills/${entry.name}/SKILL.md`;
  if (!existsSync(skillMdPath)) {
    console.error(`FAIL ${entry.name}: missing SKILL.md`);
    failed = true;
    adapterFailed = true;
  } else {
    const skillContent = await readFile(skillMdPath, "utf8");
    for (const verb of manifest.verbs) {
      if (!skillContent.includes(verb)) {
        console.error(
          `FAIL ${entry.name}: verb '${verb}' declared in manifest but not mentioned in SKILL.md`,
        );
        failed = true;
        adapterFailed = true;
      }
    }
  }

  if (!adapterFailed) {
    console.log(`ok   ${entry.name}: manifest validated (${manifest.verbs.length} verbs)`);
  }
}

process.exit(failed ? 1 : 0);
