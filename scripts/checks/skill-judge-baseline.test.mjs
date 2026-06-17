import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "../..");

test("baseline file is valid JSON keyed by relative SKILL.md path", async () => {
  const raw = await readFile(path.join(REPO, "scripts/snapshots/skill-judge-baseline.json"), "utf8");
  const data = JSON.parse(raw);
  for (const [key, entry] of Object.entries(data)) {
    assert.match(key, /^pm-tasks\/[a-z0-9-]+\/SKILL\.md$/);
    assert.equal(typeof entry.score, "number");
    assert.ok(entry.score >= 0 && entry.score <= 100);
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.capturedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

// Golden-master rubric snapshot tests
const GOLDEN_PATH = path.join(REPO, "scripts/snapshots/skill-judge-golden.json");
const BASELINE_PATH = path.join(REPO, "scripts/snapshots/skill-judge-baseline.json");

test("golden: every entry has the 4 required keys", async () => {
  const raw = await readFile(GOLDEN_PATH, "utf8");
  const golden = JSON.parse(raw);
  for (const [key, entry] of Object.entries(golden)) {
    assert.ok("rubricVersion" in entry, `${key}: missing rubricVersion`);
    assert.ok("rubricChecksum" in entry, `${key}: missing rubricChecksum`);
    assert.ok("dimensionScores" in entry, `${key}: missing dimensionScores`);
    assert.ok("totalRaw" in entry, `${key}: missing totalRaw`);
  }
});

test("golden: path parity with baseline — same keys, no extras", async () => {
  const [rawG, rawB] = await Promise.all([
    readFile(GOLDEN_PATH, "utf8"),
    readFile(BASELINE_PATH, "utf8"),
  ]);
  const goldenKeys = Object.keys(JSON.parse(rawG)).sort();
  const baselineKeys = Object.keys(JSON.parse(rawB)).sort();
  assert.deepEqual(
    goldenKeys,
    baselineKeys,
    "golden.json and baseline.json must have identical path keys"
  );
});

test("golden: totalRaw matches baseline score for every path", async () => {
  const [rawG, rawB] = await Promise.all([
    readFile(GOLDEN_PATH, "utf8"),
    readFile(BASELINE_PATH, "utf8"),
  ]);
  const golden = JSON.parse(rawG);
  const baseline = JSON.parse(rawB);
  for (const [key, entry] of Object.entries(golden)) {
    assert.equal(
      entry.totalRaw,
      baseline[key].score,
      `${key}: score in golden doesn't match baseline; one of them needs updating`
    );
  }
});

test("golden: rubricVersion matches ^v\\d+(\\.\\d+)?$", async () => {
  const raw = await readFile(GOLDEN_PATH, "utf8");
  const golden = JSON.parse(raw);
  const RE = /^v\d+(\.\d+)?$/;
  for (const [key, entry] of Object.entries(golden)) {
    assert.match(
      entry.rubricVersion,
      RE,
      `${key}: rubricVersion "${entry.rubricVersion}" is not in vN or vN.N format`
    );
  }
});

test("golden: rubricChecksum is non-empty and either sha256:<hex> or 'manual'", async () => {
  const raw = await readFile(GOLDEN_PATH, "utf8");
  const golden = JSON.parse(raw);
  const RE = /^(sha256:[0-9a-f]{64}|manual)$/;
  for (const [key, entry] of Object.entries(golden)) {
    assert.match(
      entry.rubricChecksum,
      RE,
      `${key}: rubricChecksum "${entry.rubricChecksum}" must be sha256:<hex> or "manual"`
    );
  }
});
