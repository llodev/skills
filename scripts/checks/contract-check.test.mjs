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
  assert.equal(
    result.code,
    0,
    `Expected exit 0, got ${result.code}. stderr: ${result.stderr} stdout: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes("ok   pm-tasks-asana"),
    `Missing asana ok line. stdout: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes("ok   pm-tasks-trello"),
    `Missing trello ok line. stdout: ${result.stdout}`,
  );
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
      `Expected 'missing manifest.json' in output. Got: ${combined}`,
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
    assert.equal(
      result.code,
      0,
      `task.move should be accepted as canonical. stderr: ${result.stderr} stdout: ${result.stdout}`,
    );
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
    assert.equal(
      result.code,
      0,
      `Manifest with task.create + task.move should pass schema. stderr: ${result.stderr} stdout: ${result.stdout}`,
    );
  } finally {
    writeFileSync(manifestPath, original);
  }
});

test("task.parent.set accepted as canonical verb — no namespace prefix required", () => {
  const manifestPath = `${ROOT}/pm-tasks/pm-tasks-asana/manifest.json`;
  const original = readFileSync(manifestPath, "utf8");
  const patched = JSON.parse(original);
  // Add task.parent.set to verify it is accepted as canonical (no namespace error)
  if (!patched.verbs.includes("task.parent.set")) {
    patched.verbs.push("task.parent.set");
  }
  // Also mention the verb in SKILL.md check — we patch the manifest temporarily and
  // rely on asana SKILL.md already mentioning "task.parent.set" OR skip by using a
  // minimal manifest that only has canonical verbs (SKILL.md grep skips canonical verbs
  // that appear in the manifest — wait, actually it greps ALL declared verbs).
  // Use a minimal manifest with just the new verb to isolate the namespace check.
  const minimalPatched = { tool: "asana", verbs: ["task.parent.set"] };
  writeFileSync(manifestPath, JSON.stringify(minimalPatched, null, 2));
  // Also temporarily patch SKILL.md to mention the verb
  const skillMdPath = `${ROOT}/pm-tasks/pm-tasks-asana/SKILL.md`;
  const originalSkill = readFileSync(skillMdPath, "utf8");
  writeFileSync(skillMdPath, originalSkill + "\ntask.parent.set\n");
  try {
    const result = runScript();
    assert.equal(
      result.code,
      0,
      `task.parent.set should be accepted as canonical (no namespace error). stderr: ${result.stderr} stdout: ${result.stdout}`,
    );
  } finally {
    writeFileSync(manifestPath, original);
    writeFileSync(skillMdPath, originalSkill);
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
      `Expected 'weird.thing' in output. Got: ${combined}`,
    );
  } finally {
    writeFileSync(manifestPath, original);
  }
});
