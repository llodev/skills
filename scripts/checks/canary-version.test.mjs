import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { canaryVersion, listCanaryPackages } from "./canary-version.mjs";

// ── canaryVersion ─────────────────────────────────────────────────────────────

test("canaryVersion(42, 'abc1234') === '0.0.0-pr-42-abc1234'", () => {
  assert.equal(canaryVersion(42, "abc1234"), "0.0.0-pr-42-abc1234");
});

test("canaryVersion accepts string prNumber '42' → same result", () => {
  assert.equal(canaryVersion("42", "abc1234"), "0.0.0-pr-42-abc1234");
});

test("canaryVersion is deterministic (two calls equal)", () => {
  assert.equal(canaryVersion(42, "abc1234"), canaryVersion(42, "abc1234"));
});

test("canaryVersion result matches strict semver pre-release regex", () => {
  const result = canaryVersion(42, "abc1234");
  assert.match(result, /^0\.0\.0-[a-zA-Z0-9._-]+$/);
});

// prNumber — rejection cases
test("canaryVersion throws on prNumber 0", () => {
  assert.throws(() => canaryVersion(0, "abc1234"));
});

test("canaryVersion throws on prNumber -1", () => {
  assert.throws(() => canaryVersion(-1, "abc1234"));
});

test("canaryVersion throws on prNumber 1.5", () => {
  assert.throws(() => canaryVersion(1.5, "abc1234"));
});

test("canaryVersion throws on prNumber NaN", () => {
  assert.throws(() => canaryVersion(NaN, "abc1234"));
});

test("canaryVersion throws on prNumber empty string", () => {
  assert.throws(() => canaryVersion("", "abc1234"));
});

test("canaryVersion throws on prNumber '4x'", () => {
  assert.throws(() => canaryVersion("4x", "abc1234"));
});

test("canaryVersion throws on prNumber undefined", () => {
  assert.throws(() => canaryVersion(undefined, "abc1234"));
});

// shortSha — rejection cases
test("canaryVersion throws on empty shortSha", () => {
  assert.throws(() => canaryVersion(42, ""));
});

test("canaryVersion throws on non-hex shortSha 'xyz'", () => {
  assert.throws(() => canaryVersion(42, "xyz"));
});

// ── listCanaryPackages ────────────────────────────────────────────────────────

test("listCanaryPackages includes all four known package names", () => {
  const names = listCanaryPackages().map((p) => p.name);
  assert.ok(names.includes("@llodev/pm-tasks-core"), "missing @llodev/pm-tasks-core");
  assert.ok(names.includes("@llodev/pm-tasks-asana"), "missing @llodev/pm-tasks-asana");
  assert.ok(names.includes("@llodev/pm-tasks-trello"), "missing @llodev/pm-tasks-trello");
  assert.ok(names.includes("@llodev/pm-tasks-testkit"), "missing @llodev/pm-tasks-testkit");
});

test("listCanaryPackages every entry has valid shape and passes private filter", () => {
  const packages = listCanaryPackages();
  for (const pkg of packages) {
    assert.ok(
      pkg.name.startsWith("@llodev/pm-tasks-"),
      `name must start with @llodev/pm-tasks-: ${pkg.name}`,
    );
    assert.ok(existsSync(pkg.dir), `dir must exist on disk: ${pkg.dir}`);
    assert.ok(pkg.version && pkg.version.length > 0, `version must be non-empty: ${pkg.name}`);
    // Verify the private filter: re-read package.json and confirm private !== true
    const raw = JSON.parse(readFileSync(pkg.packageJsonPath, "utf8"));
    assert.notEqual(raw.private, true, `${pkg.name} must not be private`);
  }
});

test("listCanaryPackages is sorted by name (deterministic)", () => {
  const packages = listCanaryPackages();
  const names = packages.map((p) => p.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted);
});
