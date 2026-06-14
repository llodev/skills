import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");

test("baseline file is valid JSON keyed by relative SKILL.md path", async () => {
  const raw = await readFile(path.join(REPO, "scripts/skill-judge-baseline.json"), "utf8");
  const data = JSON.parse(raw);
  for (const [key, entry] of Object.entries(data)) {
    assert.match(key, /^pm-tasks\/[a-z0-9-]+\/SKILL\.md$/);
    assert.equal(typeof entry.score, "number");
    assert.ok(entry.score >= 0 && entry.score <= 100);
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.capturedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});
