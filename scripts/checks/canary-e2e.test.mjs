// canary-e2e.test.mjs — hermetic unit tests for canary-e2e.mjs exports.
// Uses node:test + node:assert/strict. No live registry. No new dependencies.
// "fixture registry" = manually planted node_modules in a tmp sandbox.
// Scope note: runSmoke test covers all 4 checks on the good path and the
// shebang (file-read) check on the broken path. Dynamic-import checks (core,
// testkit) are covered on the good path via real ESM fixture modules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  canaryInstallSpecs,
  canaryInstallCommand,
  resolveCanaryInputs,
  runSmoke,
} from "./canary-e2e.mjs";

// ── 1. canaryInstallSpecs ────────────────────────────────────────────────────

test("canaryInstallSpecs: superset of 4 packages, each at exact canary version", () => {
  const specs = canaryInstallSpecs(42, "abc1234");
  const expected = [
    "@llodev/pm-tasks-asana@0.0.0-pr-42-abc1234",
    "@llodev/pm-tasks-core@0.0.0-pr-42-abc1234",
    "@llodev/pm-tasks-testkit@0.0.0-pr-42-abc1234",
    "@llodev/pm-tasks-trello@0.0.0-pr-42-abc1234",
  ];
  for (const spec of expected) {
    assert.ok(specs.includes(spec), `missing spec: ${spec}`);
  }
  // Guard hermeticity: no range prefixes allowed
  for (const spec of specs) {
    assert.ok(!spec.includes("^"), `range prefix ^ in spec: ${spec}`);
    assert.ok(!spec.includes("~"), `range prefix ~ in spec: ${spec}`);
    // Every spec must be pinned to this exact version
    assert.ok(spec.includes("@0.0.0-pr-42-abc1234"), `version mismatch in spec: ${spec}`);
  }
});

// ── 1b. canaryInstallCommand ─────────────────────────────────────────────────

test("canaryInstallCommand: carries --legacy-peer-deps and every exact spec", () => {
  const specs = canaryInstallSpecs(42, "abc1234");
  const cmd = canaryInstallCommand(specs);
  // Regression guard: npm 7+ strict peer resolver errors ERESOLVE on the
  // prerelease caret peer range (e.g. testkit's peer on core) without this flag.
  assert.ok(cmd.includes("--legacy-peer-deps"), `missing --legacy-peer-deps: ${cmd}`);
  assert.ok(cmd.includes("--no-save"), `missing --no-save: ${cmd}`);
  for (const spec of specs) {
    assert.ok(cmd.includes(spec), `command missing spec: ${spec}`);
  }
});

// ── 2. resolveCanaryInputs ───────────────────────────────────────────────────

test("resolveCanaryInputs: parses --pr and --sha from argv", () => {
  const result = resolveCanaryInputs(["--from-canary", "--pr", "42", "--sha", "abc1234"], {});
  assert.equal(result.pr, "42");
  assert.equal(result.sha, "abc1234");
});

test("resolveCanaryInputs: falls back to env vars", () => {
  const result = resolveCanaryInputs([], { CANARY_PR_NUMBER: "99", CANARY_SHA: "deadbee" });
  assert.equal(result.pr, "99");
  assert.equal(result.sha, "deadbee");
});

test("resolveCanaryInputs: argv takes precedence over env", () => {
  const result = resolveCanaryInputs(["--pr", "5", "--sha", "aabbccd"], {
    CANARY_PR_NUMBER: "99",
    CANARY_SHA: "zzzz",
  });
  assert.equal(result.pr, "5");
  assert.equal(result.sha, "aabbccd");
});

test("resolveCanaryInputs: throws when --pr / CANARY_PR_NUMBER is missing", () => {
  assert.throws(() => resolveCanaryInputs(["--sha", "abc1234"], {}), /CANARY_PR_NUMBER/);
});

test("resolveCanaryInputs: throws when --sha / CANARY_SHA is missing", () => {
  assert.throws(() => resolveCanaryInputs(["--pr", "42"], {}), /CANARY_SHA/);
});

test("resolveCanaryInputs: throws when both inputs are missing", () => {
  assert.throws(() => resolveCanaryInputs([], {}), /requires/);
});

// ── 3. runSmoke with planted fixture ────────────────────────────────────────

/** Plant a complete, valid smoke fixture in `sandbox`. */
function plantGoodFixture(sandbox) {
  // sandbox package.json (required for npm cwd context)
  writeFileSync(
    path.join(sandbox, "package.json"),
    JSON.stringify({ name: "canary", version: "0.0.0", private: true }, null, 2),
  );

  // pm-tasks-core: ESM module exporting `interpolate`
  const coreDir = path.join(sandbox, "node_modules", "@llodev", "pm-tasks-core");
  mkdirSync(coreDir, { recursive: true });
  writeFileSync(
    path.join(coreDir, "package.json"),
    JSON.stringify(
      {
        name: "@llodev/pm-tasks-core",
        version: "0.0.0",
        type: "module",
        exports: { "./init-lib": "./init-lib.js" },
      },
      null,
      2,
    ),
  );
  writeFileSync(path.join(coreDir, "init-lib.js"), "export const interpolate = (s, v) => s;\n");

  // pm-tasks-asana: dist/bin/init.js with shebang
  const asanaBinDir = path.join(
    sandbox,
    "node_modules",
    "@llodev",
    "pm-tasks-asana",
    "dist",
    "bin",
  );
  mkdirSync(asanaBinDir, { recursive: true });
  writeFileSync(path.join(asanaBinDir, "init.js"), "#!/usr/bin/env node\n// stub\n");

  // pm-tasks-trello: dist/bin/init.js with shebang
  const trelloBinDir = path.join(
    sandbox,
    "node_modules",
    "@llodev",
    "pm-tasks-trello",
    "dist",
    "bin",
  );
  mkdirSync(trelloBinDir, { recursive: true });
  writeFileSync(path.join(trelloBinDir, "init.js"), "#!/usr/bin/env node\n// stub\n");

  // pm-tasks-testkit: ESM module exporting `createFakeAdapter`
  const testkitDir = path.join(sandbox, "node_modules", "@llodev", "pm-tasks-testkit");
  mkdirSync(testkitDir, { recursive: true });
  writeFileSync(
    path.join(testkitDir, "package.json"),
    JSON.stringify(
      {
        name: "@llodev/pm-tasks-testkit",
        version: "0.0.0",
        type: "module",
        exports: { ".": "./index.js" },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(testkitDir, "index.js"),
    [
      "export function createFakeAdapter() {",
      "  return { 'task.create': async (i) => ({ ok: true, ref: { id: 'fake-1' } }) };",
      "}",
      "",
    ].join("\n"),
  );
}

test("runSmoke: returns 0 on a fully valid fixture", () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "pm-tasks-canary-test-"));
  try {
    plantGoodFixture(sandbox);
    const failures = runSmoke(sandbox);
    assert.equal(failures, 0, "expected 0 failures on good fixture");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("runSmoke: returns > 0 when trello shebang is missing", () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "pm-tasks-canary-test-"));
  try {
    plantGoodFixture(sandbox);
    // Overwrite trello bin without shebang
    const trelloBin = path.join(
      sandbox,
      "node_modules",
      "@llodev",
      "pm-tasks-trello",
      "dist",
      "bin",
      "init.js",
    );
    writeFileSync(trelloBin, "// no shebang here\n");
    const failures = runSmoke(sandbox);
    assert.ok(failures > 0, `expected >= 1 failure, got ${failures}`);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("runSmoke: returns > 0 when asana shebang is missing", () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "pm-tasks-canary-test-"));
  try {
    plantGoodFixture(sandbox);
    const asanaBin = path.join(
      sandbox,
      "node_modules",
      "@llodev",
      "pm-tasks-asana",
      "dist",
      "bin",
      "init.js",
    );
    writeFileSync(asanaBin, "// no shebang here\n");
    const failures = runSmoke(sandbox);
    assert.ok(failures > 0, `expected >= 1 failure, got ${failures}`);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
