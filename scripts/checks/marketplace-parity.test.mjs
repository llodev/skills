import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const MARKETPLACE_PATH = `${ROOT}/.claude-plugin/marketplace.json`;

function runScript() {
  try {
    const stdout = execSync("node scripts/checks/marketplace-parity.mjs", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return {
      code: e.status ?? 1,
      stdout: e.stdout?.toString() || "",
      stderr: e.stderr?.toString() || "",
    };
  }
}

test("valid state — versions in sync → exit 0", () => {
  const result = runScript();
  assert.equal(
    result.code,
    0,
    `Expected exit 0, got ${result.code}. stderr: ${result.stderr} stdout: ${result.stdout}`
  );
  assert.ok(
    result.stdout.includes("ok   pm-tasks-core"),
    `Missing pm-tasks-core ok line. stdout: ${result.stdout}`
  );
  assert.ok(
    result.stdout.includes("ok   pm-tasks-asana"),
    `Missing pm-tasks-asana ok line. stdout: ${result.stdout}`
  );
  assert.ok(
    result.stdout.includes("ok   pm-tasks-trello"),
    `Missing pm-tasks-trello ok line. stdout: ${result.stdout}`
  );
});

test("forced drift in marketplace.json → exit 1", () => {
  const original = readFileSync(MARKETPLACE_PATH, "utf8");
  const data = JSON.parse(original);
  // Patch first plugin to a bogus version
  data.plugins[0].version = "999.0.0";
  writeFileSync(MARKETPLACE_PATH, JSON.stringify(data, null, 2));
  try {
    const result = runScript();
    assert.equal(
      result.code,
      1,
      `Expected exit 1, got ${result.code}. stderr: ${result.stderr} stdout: ${result.stdout}`
    );
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes("999.0.0"),
      `Expected '999.0.0' in output. Got: ${combined}`
    );
  } finally {
    writeFileSync(MARKETPLACE_PATH, original);
  }
});

test("plugin missing from pm-tasks/ → exit 1", () => {
  const original = readFileSync(MARKETPLACE_PATH, "utf8");
  const data = JSON.parse(original);
  data.plugins.push({
    name: "pm-tasks-ghost",
    version: "1.0.0",
    source: { source: "git-subdir", url: "https://github.com/llodev/skills.git", path: "pm-tasks/pm-tasks-ghost" },
    description: "Ghost plugin for testing.",
    author: { name: "llodev" },
  });
  writeFileSync(MARKETPLACE_PATH, JSON.stringify(data, null, 2));
  try {
    const result = runScript();
    assert.equal(
      result.code,
      1,
      `Expected exit 1, got ${result.code}. stderr: ${result.stderr} stdout: ${result.stdout}`
    );
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes("pm-tasks-ghost"),
      `Expected 'pm-tasks-ghost' in output. Got: ${combined}`
    );
  } finally {
    writeFileSync(MARKETPLACE_PATH, original);
  }
});
