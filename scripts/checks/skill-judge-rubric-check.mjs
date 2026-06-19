#!/usr/bin/env node
/**
 * skill-judge-rubric-check.mjs
 *
 * Verifies the current skill-judge SKILL.md matches the committed golden master
 * (scripts/snapshots/skill-judge-rubric.json). Exits 0 on match, 1 on drift.
 *
 * If the rubric file is missing (clean clone, CI without skill-judge installed),
 * prints a skip note and exits 0.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { computeSnapshot } from "./skill-judge-rubric-snapshot.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const GOLDEN_PATH = join(REPO_ROOT, "scripts/snapshots/skill-judge-rubric.json");

const rubricPath = process.env.SKILL_JUDGE_RUBRIC_PATH
  ? resolve(process.env.SKILL_JUDGE_RUBRIC_PATH)
  : join(homedir(), ".claude/skills/skill-judge/SKILL.md");

// Skip gracefully if rubric not installed
if (!existsSync(rubricPath)) {
  console.log(
    "skill-judge-rubric-check: rubric file not found — skipping drift gate."
  );
  console.log(`  (looked for: ${rubricPath})`);
  process.exit(0);
}

// Require golden master to exist (must be committed)
if (!existsSync(GOLDEN_PATH)) {
  console.error(
    `skill-judge-rubric-check: golden master not found: ${GOLDEN_PATH}`
  );
  console.error(
    "  Run `make skill-judge-rubric-snapshot` to generate it, then commit the result."
  );
  process.exit(1);
}

const current = computeSnapshot();
const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));

let drifted = false;

// 1. SHA check
if (current.shaHash !== golden.shaHash) {
  console.error(`skill-judge-rubric-check: shaHash mismatch`);
  console.error(`  golden:  ${golden.shaHash}`);
  console.error(`  current: ${current.shaHash}`);
  drifted = true;
}

// 2. Dimension identity check (order-insensitive, identity-sensitive)
const goldenMap = new Map(golden.dimensions.map((d) => [d.name, d.maxScore]));
const currentMap = new Map(current.dimensions.map((d) => [d.name, d.maxScore]));

for (const [name, maxScore] of currentMap) {
  if (!goldenMap.has(name)) {
    console.error(`skill-judge-rubric-check: new dimension detected: "${name}" (${maxScore} pts)`);
    drifted = true;
  } else if (goldenMap.get(name) !== maxScore) {
    console.error(
      `skill-judge-rubric-check: maxScore changed for "${name}": ${goldenMap.get(name)} → ${maxScore}`
    );
    drifted = true;
  }
}

for (const [name] of goldenMap) {
  if (!currentMap.has(name)) {
    console.error(`skill-judge-rubric-check: dimension removed: "${name}"`);
    drifted = true;
  }
}

if (drifted) {
  console.error(
    "  Run `make skill-judge-rubric-snapshot` to ratchet OR revert the rubric change."
  );
  process.exit(1);
}

console.log("skill-judge rubric stable.");
process.exit(0);
