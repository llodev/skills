// Unit tests for canary-cleanup-filter.mjs — node:test + node:assert/strict.
// Regression guard for the node -e argv bug: the cleanup filter silently
// matched nothing because `node -e ... -- "$PREFIX"` put the arg at argv[1]
// (node -e has no script-path slot), leaving argv[2] undefined.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCanaryVersions } from "./canary-cleanup-filter.mjs";

test("matchCanaryVersions: returns this PR's canary versions", () => {
  const versions = ["1.9.0", "0.0.0-pr-22-9002a06", "1.10.0", "0.0.0-pr-22-37dcb7d"];
  assert.deepEqual(matchCanaryVersions(versions, 22), [
    "0.0.0-pr-22-9002a06",
    "0.0.0-pr-22-37dcb7d",
  ]);
});

test("matchCanaryVersions: trailing-dash anchor — PR 42 never matches PR 421", () => {
  const versions = ["0.0.0-pr-42-aaaaaaa", "0.0.0-pr-421-bbbbbbb", "0.0.0-pr-4-ccccccc"];
  assert.deepEqual(matchCanaryVersions(versions, 42), ["0.0.0-pr-42-aaaaaaa"]);
});

test("matchCanaryVersions: prNumber as string works (CLI passes a string)", () => {
  // The bug made this return [] regardless of input; assert a real match.
  assert.deepEqual(matchCanaryVersions(["0.0.0-pr-22-9002a06"], "22"), ["0.0.0-pr-22-9002a06"]);
});

test("matchCanaryVersions: normalises a single bare-string version", () => {
  // `npm view <pkg> versions --json` returns a string when only one version exists.
  assert.deepEqual(matchCanaryVersions("0.0.0-pr-22-9002a06", 22), ["0.0.0-pr-22-9002a06"]);
  assert.deepEqual(matchCanaryVersions("1.9.0", 22), []);
});

test("matchCanaryVersions: no matches returns empty", () => {
  assert.deepEqual(matchCanaryVersions(["1.9.0", "1.10.0"], 22), []);
});
