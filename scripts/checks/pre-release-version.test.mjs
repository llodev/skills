import test from "node:test";
import assert from "node:assert/strict";
import { findCanaryVersions, scanWorkspace } from "./pre-release-version.mjs";

// ── findCanaryVersions — pure unit cases ──────────────────────────────────────

test("findCanaryVersions — clean list returns empty array", () => {
  const result = findCanaryVersions([
    { name: "a", version: "1.2.3" },
    { name: "b", version: "1.0.0" },
  ]);
  assert.deepEqual(result, []);
});

test("findCanaryVersions — detects a single canary and excludes clean ones", () => {
  const result = findCanaryVersions([
    { name: "a", version: "0.0.0-pr-5-abc1234" },
    { name: "b", version: "1.0.0" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "a");
  assert.equal(result[0].version, "0.0.0-pr-5-abc1234");
});

test("findCanaryVersions — detects multiple offenders", () => {
  const result = findCanaryVersions([
    { name: "a", version: "0.0.0-pr-5-abc1234" },
    { name: "b", version: "0.0.0-pr-7-def5678" },
    { name: "c", version: "1.0.0" },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((p) => p.name),
    ["a", "b"],
  );
});

// ── scanWorkspace — real-tree integration assertion ───────────────────────────

test("scanWorkspace — current working tree has no canary -pr- versions", () => {
  const offenders = scanWorkspace();
  assert.deepEqual(
    offenders,
    [],
    `Expected no canary versions but found: ${offenders.map((p) => p.name + "@" + p.version).join(", ")}`,
  );
});
