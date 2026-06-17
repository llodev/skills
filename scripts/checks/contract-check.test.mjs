import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync } from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

function runScript() {
  try {
    const stdout = execSync("node scripts/checks/contract-check.mjs", {
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

test("valid state — all adapters pass → exit 0", () => {
  const result = runScript();
  assert.equal(result.code, 0, `Expected exit 0, got ${result.code}. stderr: ${result.stderr} stdout: ${result.stdout}`);
  assert.ok(result.stdout.includes("ok   pm-tasks-asana"), `Missing asana ok line. stdout: ${result.stdout}`);
  assert.ok(result.stdout.includes("ok   pm-tasks-trello"), `Missing trello ok line. stdout: ${result.stdout}`);
});

test("missing manifest → exit 1 with specific message", () => {
  const manifestPath = `${ROOT}/pm-tasks/pm-tasks-asana/manifest.json`;
  const backupPath = `${ROOT}/pm-tasks/pm-tasks-asana/manifest.json.bak`;
  renameSync(manifestPath, backupPath);
  try {
    const result = runScript();
    assert.equal(result.code, 1, `Expected exit 1, got ${result.code}`);
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes("missing manifest.json"),
      `Expected 'missing manifest.json' in output. Got: ${combined}`
    );
  } finally {
    renameSync(backupPath, manifestPath);
  }
});

test("task.move accepted as canonical verb — no namespace prefix required", () => {
  const manifestPath = `${ROOT}/pm-tasks/pm-tasks-asana/manifest.json`;
  const original = readFileSync(manifestPath, "utf8");
  const patched = JSON.parse(original);
  // task.move should already be present; if not, add it to verify acceptance
  if (!patched.verbs.includes("task.move")) {
    patched.verbs.push("task.move");
  }
  writeFileSync(manifestPath, JSON.stringify(patched, null, 2));
  try {
    const result = runScript();
    assert.equal(result.code, 0, `task.move should be accepted as canonical. stderr: ${result.stderr} stdout: ${result.stdout}`);
  } finally {
    writeFileSync(manifestPath, original);
  }
});

test("manifest with only task.create and task.move validates without errors", () => {
  const manifestPath = `${ROOT}/pm-tasks/pm-tasks-asana/manifest.json`;
  const original = readFileSync(manifestPath, "utf8");
  const patched = { tool: "asana", verbs: ["task.create", "task.move"] };
  writeFileSync(manifestPath, JSON.stringify(patched, null, 2));
  try {
    const result = runScript();
    // contract-check validates manifest schema + namespace rules; a minimal verb list is valid
    assert.equal(result.code, 0, `Manifest with task.create + task.move should pass schema. stderr: ${result.stderr} stdout: ${result.stdout}`);
  } finally {
    writeFileSync(manifestPath, original);
  }
});

test("custom verb with wrong namespace → exit 1", () => {
  const manifestPath = `${ROOT}/pm-tasks/pm-tasks-asana/manifest.json`;
  const original = readFileSync(manifestPath, "utf8");
  const patched = JSON.parse(original);
  patched.verbs.push("weird.thing");
  writeFileSync(manifestPath, JSON.stringify(patched, null, 2));
  try {
    const result = runScript();
    assert.equal(result.code, 1, `Expected exit 1, got ${result.code}`);
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes("weird.thing"),
      `Expected 'weird.thing' in output. Got: ${combined}`
    );
  } finally {
    writeFileSync(manifestPath, original);
  }
});
