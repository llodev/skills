#!/usr/bin/env node
/**
 * skill-judge-rubric-snapshot.mjs
 *
 * Reads the skill-judge SKILL.md rubric, computes a SHA-256 fingerprint,
 * extracts dimension names + max scores, and emits structured JSON.
 *
 * Usage:
 *   node scripts/checks/skill-judge-rubric-snapshot.mjs          # stdout
 *   node scripts/checks/skill-judge-rubric-snapshot.mjs --write  # write golden master
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const SNAPSHOT_PATH = join(REPO_ROOT, "scripts/snapshots/skill-judge-rubric.json");

// Resolve rubric path: env override or default ~/.claude/skills/skill-judge/SKILL.md
const rubricPath = process.env.SKILL_JUDGE_RUBRIC_PATH
  ? resolve(process.env.SKILL_JUDGE_RUBRIC_PATH)
  : join(homedir(), ".claude/skills/skill-judge/SKILL.md");

/**
 * Parse skill-judge SKILL.md to extract dimension list.
 * Looks for headings matching: ### D<N>: <Name> (N points)
 * Returns [{ name, maxScore }] in definition order.
 */
function parseDimensions(content) {
  const dimensions = [];
  // Match lines like: ### D1: Knowledge Delta (20 points)
  // or: ### D7: Pattern Recognition (10 points)
  const re = /^#{1,6}\s+(D\d+:\s+[^(]+)\((\d+)\s+points?\)/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    const name = match[1].trim();
    const maxScore = parseInt(match[2], 10);
    dimensions.push({ name, maxScore });
  }
  return dimensions;
}

export function computeSnapshot() {
  if (!existsSync(rubricPath)) {
    return null; // caller decides whether to error or skip
  }

  const content = readFileSync(rubricPath, "utf8");
  const shaHash = createHash("sha256").update(content).digest("hex");
  const dimensions = parseDimensions(content);

  return {
    shaHash,
    dimensions,
    capturedAt: new Date().toISOString(),
  };
}

// CLI entrypoint
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(rubricPath)) {
    console.error(
      `skill-judge-rubric-snapshot: rubric file not found: ${rubricPath}`
    );
    console.error(
      "  Set SKILL_JUDGE_RUBRIC_PATH to override, or install the skill-judge skill."
    );
    process.exit(1);
  }

  const snapshot = computeSnapshot();

  const writeMode = process.argv.includes("--write");
  if (writeMode) {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    console.log(`skill-judge-rubric-snapshot: written to ${SNAPSHOT_PATH}`);
    console.log(`  sha256: ${snapshot.shaHash.slice(0, 12)}...`);
    console.log(`  dimensions: ${snapshot.dimensions.length}`);
  } else {
    console.log(JSON.stringify(snapshot, null, 2));
  }
}
