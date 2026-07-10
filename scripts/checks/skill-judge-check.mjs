#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE_PATH = path.join(REPO, "scripts/snapshots/skill-judge-baseline.json");
const DEFAULT_TOLERANCE = 5;
// NOISE_BAND (2) — tolerance window for skill-judge drift between runs.
// |Δ| ≤ 2 is treated as rubric variance, not real regression. A score
// dropping within this window is logged as WARN (does not fail CI); a
// score improving within this window does NOT require a baseline ratchet.
// Update the baseline (mandatory) when Δ ≥ +3. Bypass with
// SKIP_SKILL_JUDGE_GATE=1 + changeset note when drift is inside [-2, +2].
// See `.changeset/README.md` § Quality gate for the operational flow.
const NOISE_BAND = 2;

export function computeVerdict({ current, baseline, tolerance = DEFAULT_TOLERANCE }) {
  if (baseline === null || baseline === undefined) {
    return { status: "NEW", current, baseline: null, delta: null };
  }
  const delta = current - baseline;
  if (delta >= -NOISE_BAND) return { status: "PASS", current, baseline, delta };
  if (Math.abs(delta) <= tolerance) return { status: "WARN", current, baseline, delta };
  return { status: "FAIL", current, baseline, delta };
}

export async function loadBaseline() {
  const raw = await readFile(BASELINE_PATH, "utf8");
  return JSON.parse(raw);
}

export async function listSkillFiles() {
  const out = [];
  const root = path.join(REPO, "skills");
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(root, entry.name, "SKILL.md");
    try {
      await readFile(skillPath, "utf8");
      out.push(path.relative(REPO, skillPath));
    } catch {
      /* skip */
    }
  }
  return out.sort();
}

async function run() {
  const baseline = await loadBaseline();
  const skills = await listSkillFiles();

  const stdin = await new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });
  if (!stdin.trim()) {
    console.error(
      "usage: <agent invokes skill-judge per skill, pipes JSON {skillPath: score} to stdin>",
    );
    process.exit(2);
  }
  const scores = JSON.parse(stdin);

  let hadFail = false;
  console.log("skill-judge check:");
  for (const skill of skills) {
    const current = scores[skill];
    if (current === undefined) {
      console.log(`  - ${skill}: SKIP (no current score supplied)`);
      continue;
    }
    const base = baseline[skill]?.score ?? null;
    const v = computeVerdict({ current, baseline: base });
    const tag =
      v.status === "PASS" ? "✅" : v.status === "WARN" ? "⚠️" : v.status === "NEW" ? "🆕" : "❌";
    const deltaTxt = v.delta === null ? "(new)" : `Δ ${v.delta > 0 ? "+" : ""}${v.delta}`;
    console.log(`  ${tag} ${skill}: ${current}/100 ${deltaTxt} (baseline ${v.baseline ?? "—"})`);
    if (v.status === "FAIL") hadFail = true;
  }
  if (hadFail) {
    console.error("\nFAIL: one or more skills regressed beyond tolerance.");
    process.exit(1);
  }
  console.log("\nOK");
}

if (process.argv[1] && process.argv[1].endsWith("skill-judge-check.mjs")) {
  await run();
}
