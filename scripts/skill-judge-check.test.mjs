import test from "node:test";
import assert from "node:assert/strict";
import { computeVerdict } from "./skill-judge-check.mjs";

test("verdict PASS when current >= baseline - tolerance", () => {
  const v = computeVerdict({ current: 80, baseline: 82, tolerance: 5 });
  assert.equal(v.status, "PASS");
});

test("verdict FAIL when current < baseline - tolerance", () => {
  const v = computeVerdict({ current: 70, baseline: 82, tolerance: 5 });
  assert.equal(v.status, "FAIL");
  assert.equal(v.delta, -12);
});

test("verdict WARN when current drops within tolerance", () => {
  const v = computeVerdict({ current: 79, baseline: 82, tolerance: 5 });
  assert.equal(v.status, "WARN");
});

test("verdict NEW when no baseline entry exists", () => {
  const v = computeVerdict({ current: 60, baseline: null, tolerance: 5 });
  assert.equal(v.status, "NEW");
});
