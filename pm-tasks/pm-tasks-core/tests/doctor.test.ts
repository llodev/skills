// Tests for src/doctor.ts + src/bin/doctor.ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, it, expect, afterEach } from "vitest";

// Resolve paths relative to this test file (tests/ is 1 level below package root)
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(TEST_DIR, "..");
// Workspace root is 2 levels above pm-tasks-core (pm-tasks/pm-tasks-core → pm-tasks → root)
const WORKSPACE_ROOT = path.resolve(PKG_ROOT, "../..");
import {
  CORE_CHECKS,
  runChecks,
  detectCanary,
  type DoctorContext,
  type DoctorCheck,
} from "../src/doctor.js";
import { renderReport } from "../src/bin/doctor.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MANIFEST = {
  tool: "trello",
  verbs: ["task.create", "checklist.check", "task.close", "task.comment.add"],
};

const SCHEMA: unknown = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["tool", "boards"],
  properties: {
    tool: { type: "string" },
    boards: { type: "array" },
  },
};

function makeTmpDir(): string {
  return mkdtempSync(path.join(tmpdir(), "pm-tasks-doctor-test-"));
}

function baseConfig() {
  return {
    tool: "trello",
    boards: [{ id: "board-1", name: "My Board", alias: "my-board" }],
    lists: [{ id: "list-1", name: "Backlog", alias: "backlog" }],
    members: [],
    defaults: {},
    autonomous: {
      enabled: false,
      allow: ["task.create"],
      scope: { boards: ["board-1"], lists: ["list-1"] },
    },
  };
}

function makeCtx(tmp: string, overrides: Partial<DoctorContext> = {}): DoctorContext {
  const configPath = path.join(tmp, ".trello.json");
  const config = baseConfig();
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  return {
    tool: "trello",
    configPath,
    config,
    manifest: MANIFEST,
    schema: SCHEMA,
    auditLogPath: path.join(tmp, "audit.log"),
    auditRotationMaxBytes: 10 * 1024 * 1024,
    ...overrides,
  };
}

const tmps: string[] = [];
function tmpDir(): string {
  const d = makeTmpDir();
  tmps.push(d);
  return d;
}

afterEach(() => {
  for (const d of tmps.splice(0)) {
    try {
      rmSync(d, { recursive: true });
    } catch {
      /* ignore */
    }
  }
});

// ---------------------------------------------------------------------------
// Test 1: fully-valid context → all checks pass
// ---------------------------------------------------------------------------

describe("runChecks — valid context", () => {
  it("returns ok=true for all CORE_CHECKS when context is clean", async () => {
    const tmp = tmpDir();
    const ctx = makeCtx(tmp);
    const report = await runChecks(ctx);

    expect(report.tool).toBe("trello");
    expect(report.results.length).toBe(CORE_CHECKS.length);
    const failures = report.results.filter((r) => !r.result.ok);
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 2: C-CFG-2 — autonomous.allow contains unknown verb
// ---------------------------------------------------------------------------

describe("runChecks — C-CFG-2 unknown verb", () => {
  it("fails C-CFG-2 and includes the offending verb in message", async () => {
    const tmp = tmpDir();
    const config = {
      ...baseConfig(),
      autonomous: { ...baseConfig().autonomous, allow: ["task.create", "task.assign"] },
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));
    const ctx = makeCtx(tmp, { config, configPath });

    const report = await runChecks(ctx);
    const cfgCheck = report.results.find((r) => r.check.id === "C-CFG-2");
    expect(cfgCheck).toBeDefined();
    expect(cfgCheck!.result.ok).toBe(false);
    expect(cfgCheck!.result.message).toContain("task.assign");
  });
});

// ---------------------------------------------------------------------------
// Test 3: C-CFG-3 — autonomous.scope.boards has unknown ID
// ---------------------------------------------------------------------------

describe("runChecks — C-CFG-3 unknown scope board", () => {
  it("fails C-CFG-3 and lists the unknown ID", async () => {
    const tmp = tmpDir();
    const config = {
      ...baseConfig(),
      autonomous: {
        ...baseConfig().autonomous,
        scope: { boards: ["board-1", "board-unknown"], lists: ["list-1"] },
      },
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));
    const ctx = makeCtx(tmp, { config, configPath });

    const report = await runChecks(ctx);
    const cfgCheck = report.results.find((r) => r.check.id === "C-CFG-3");
    expect(cfgCheck).toBeDefined();
    expect(cfgCheck!.result.ok).toBe(false);
    expect(cfgCheck!.result.message).toContain("board-unknown");
  });
});

// ---------------------------------------------------------------------------
// Test 4: renderReport JSON — correct shape + exitCode=1 on error
// ---------------------------------------------------------------------------

describe("renderReport — JSON mode", () => {
  it("outputs parseable JSON with summary.exitCode=1 when error check failed", async () => {
    const tmp = tmpDir();
    // Make C-CFG-2 fail
    const config = {
      ...baseConfig(),
      autonomous: { ...baseConfig().autonomous, allow: ["task.assign"] },
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));
    const ctx = makeCtx(tmp, { config, configPath });

    const report = await runChecks(ctx);
    const rendered = renderReport(report, { format: "json", fixHintsOnly: false });
    const parsed = JSON.parse(rendered) as {
      tool: string;
      configPath: string;
      results: Array<{
        id: string;
        severity: string;
        ok: boolean;
        message: string;
        fixHint: string | null;
      }>;
      summary: { pass: number; warn: number; fail: number; exitCode: number };
    };

    expect(parsed.tool).toBe("trello");
    expect(parsed.configPath).toBe(configPath);
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(parsed.results[0]).toHaveProperty("id");
    expect(parsed.results[0]).toHaveProperty("severity");
    expect(parsed.results[0]).toHaveProperty("ok");
    expect(parsed.results[0]).toHaveProperty("message");
    expect(parsed.results[0]).toHaveProperty("fixHint");
    expect(parsed.summary.exitCode).toBe(1);
    expect(parsed.summary.fail).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: renderReport markdown — table header + status icons
// ---------------------------------------------------------------------------

describe("renderReport — markdown mode", () => {
  it("contains table header and at least one ✅ cell", async () => {
    const tmp = tmpDir();
    const ctx = makeCtx(tmp);
    const report = await runChecks(ctx);
    const rendered = renderReport(report, { format: "md", fixHintsOnly: false });

    expect(rendered).toContain("## pm-tasks-core-doctor — trello");
    expect(rendered).toContain("| ID | Status | Check | Message | Fix hint |");
    expect(rendered).toContain("✅");
  });
});

// ---------------------------------------------------------------------------
// Test 6: --fix-hints-only — skips passing rows, includes failing rows
// ---------------------------------------------------------------------------

describe("renderReport — fix-hints-only mode", () => {
  it("hides passing rows and shows failing rows in markdown", async () => {
    const tmp = tmpDir();
    // Inject a failing extra check
    const failCheck: DoctorCheck = {
      id: "C-TEST-1",
      label: "Always fails",
      severity: "error",
      async run() {
        return { ok: false, message: "intentional failure", fixHint: "fix it" };
      },
    };
    const ctx = makeCtx(tmp);
    const report = await runChecks(ctx, [failCheck]);
    // Override results so we have one passing row too (C-FS-1 should pass)
    const rendered = renderReport(report, { format: "md", fixHintsOnly: true });

    // Failing row must appear
    expect(rendered).toContain("C-TEST-1");
    expect(rendered).toContain("intentional failure");

    // Passing rows must NOT appear
    const passingRow = report.results.find((r) => r.result.ok && r.check.id !== "C-TEST-1");
    if (passingRow) {
      // Table rows for passing checks should not appear in fix-hints-only output
      expect(rendered).not.toContain(`| ${passingRow.check.id} |`);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 7 (bonus): CLI bin — spawn with --json --tool and curated config
// ---------------------------------------------------------------------------

describe("CLI bin — spawned process", () => {
  it("outputs valid JSON and exits 0 on clean config", () => {
    const tmp = tmpDir();

    // The CLI uses the real trello schema from the sibling package — the config
    // must satisfy that schema (requires: version, boards, lists).
    const config = {
      version: "1",
      boards: [{ id: "board-01", name: "My Board", alias: "my-board" }],
      lists: [{ id: "list-01-", name: "Backlog", alias: "backlog", boardAlias: "my-board" }],
      members: [],
      defaults: {},
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));

    const binPath = path.join(PKG_ROOT, "dist/bin/doctor.js");

    // The bin looks for ../../../pm-tasks-<tool>/ relative to dist/bin/ which
    // resolves to <workspace>/pm-tasks-<tool>/ — that sibling dir exists in monorepo.
    const result = spawnSync(
      "node",
      [binPath, "--json", "--tool", "trello", "--config", configPath],
      { cwd: WORKSPACE_ROOT, encoding: "utf8", timeout: 15000 },
    );

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as { tool: string; summary: { exitCode: number } };
    expect(parsed.tool).toBe("trello");
    expect(parsed.summary.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: C-FS-1 failure, C-FS-3 warn, C-CFG-1 fail, C-CFG-3 sections, C-CFG-4 aliases
// ---------------------------------------------------------------------------

describe("runChecks — branch coverage", () => {
  it("C-FS-1 fails when configPath does not exist", async () => {
    const tmp = tmpDir();
    // Don't write the config file
    const ctx = makeCtx(tmp, { configPath: path.join(tmp, "nonexistent.json") });
    const report = await runChecks(ctx);
    const fs1 = report.results.find((r) => r.check.id === "C-FS-1");
    expect(fs1!.result.ok).toBe(false);
    expect(fs1!.result.fixHint).toBeTruthy();
  });

  it("C-FS-3 warns when audit log is over 80% of threshold", async () => {
    const tmp = tmpDir();
    const ctx = makeCtx(tmp, {
      auditRotationMaxBytes: 100, // tiny threshold
    });
    // Write a 90-byte audit log (> 80 bytes = 80% of 100)
    writeFileSync(ctx.auditLogPath, "x".repeat(90));
    const report = await runChecks(ctx);
    const fs3 = report.results.find((r) => r.check.id === "C-FS-3");
    expect(fs3!.result.ok).toBe(false);
    expect(fs3!.result.message).toContain("/");
    expect(fs3!.check.severity).toBe("warn");
  });

  it("C-CFG-1 fails when config does not match schema", async () => {
    const tmp = tmpDir();
    const invalidConfig = { wrong: "field" }; // missing required 'tool', 'boards'
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(invalidConfig));
    const ctx = makeCtx(tmp, { config: invalidConfig, configPath });
    const report = await runChecks(ctx);
    const cfg1 = report.results.find((r) => r.check.id === "C-CFG-1");
    expect(cfg1!.result.ok).toBe(false);
    expect(cfg1!.result.message).toContain("failed");
  });

  it("C-CFG-3 checks sections when config.sections is present (asana-like)", async () => {
    const tmp = tmpDir();
    const config = {
      ...baseConfig(),
      sections: [{ id: "sec-1", name: "Section A", alias: "sec-a" }],
      autonomous: {
        enabled: false,
        allow: ["task.create"],
        scope: { boards: ["board-1"], lists: ["list-1"], sections: ["sec-unknown"] },
      },
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));
    const ctx = makeCtx(tmp, { config, configPath });
    const report = await runChecks(ctx);
    const cfg3 = report.results.find((r) => r.check.id === "C-CFG-3");
    expect(cfg3!.result.ok).toBe(false);
    expect(cfg3!.result.message).toContain("sec-unknown");
  });

  it("C-CFG-4 fails when boardAlias/listAlias/assigneeAlias don't resolve", async () => {
    const tmp = tmpDir();
    const config = {
      ...baseConfig(),
      defaults: {
        boardAlias: "nonexistent-board",
        listAlias: "nonexistent-list",
        assigneeAlias: "nonexistent-user",
      },
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));
    const ctx = makeCtx(tmp, { config, configPath });
    const report = await runChecks(ctx);
    const cfg4 = report.results.find((r) => r.check.id === "C-CFG-4");
    expect(cfg4!.result.ok).toBe(false);
    expect(cfg4!.result.message).toContain("nonexistent");
  });

  it("C-CFG-4 passes when assigneeAlias is 'me' (built-in)", async () => {
    const tmp = tmpDir();
    const config = {
      ...baseConfig(),
      defaults: { assigneeAlias: "me" },
    };
    const configPath = path.join(tmp, ".trello.json");
    writeFileSync(configPath, JSON.stringify(config));
    const ctx = makeCtx(tmp, { config, configPath });
    const report = await runChecks(ctx);
    const cfg4 = report.results.find((r) => r.check.id === "C-CFG-4");
    expect(cfg4!.result.ok).toBe(true);
  });

  it("runChecks catches thrown errors from a check and marks it failed", async () => {
    const tmp = tmpDir();
    const ctx = makeCtx(tmp);
    const throwingCheck: DoctorCheck = {
      id: "C-THROW-1",
      label: "Throws",
      severity: "error",
      async run() {
        throw new Error("check blew up");
      },
    };
    const report = await runChecks(ctx, [throwingCheck]);
    const thrown = report.results.find((r) => r.check.id === "C-THROW-1");
    expect(thrown!.result.ok).toBe(false);
    expect(thrown!.result.message).toContain("threw");
  });
});

// ---------------------------------------------------------------------------
// Test: detectCanary — pure detector
// ---------------------------------------------------------------------------

describe("detectCanary — pure detector", () => {
  it("detects a canary version and extracts the PR number", () => {
    const result = detectCanary("0.0.0-pr-42-abc1234");
    expect(result).toEqual({ isCanary: true, pr: "42" });
  });

  it("returns not-canary for a released version", () => {
    const result = detectCanary("1.10.0");
    expect(result).toEqual({ isCanary: false, pr: null });
  });

  it("returns not-canary for undefined", () => {
    const result = detectCanary(undefined);
    expect(result).toEqual({ isCanary: false, pr: null });
  });
});

// ---------------------------------------------------------------------------
// Test: C-VER-1 — canary probe
// ---------------------------------------------------------------------------

describe("C-VER-1 — canary probe", () => {
  it("is present in CORE_CHECKS with severity === 'warn'", () => {
    const check = CORE_CHECKS.find((c) => c.id === "C-VER-1");
    expect(check).toBeDefined();
    expect(check!.severity).toBe("warn");
  });

  it("returns ok=false with PR number in message for a canary version", async () => {
    const tmp = tmpDir();
    const ctx = makeCtx(tmp, { coreVersion: "0.0.0-pr-42-abc1234" });
    const report = await runChecks(ctx);
    const ver1 = report.results.find((r) => r.check.id === "C-VER-1");
    expect(ver1!.result.ok).toBe(false);
    expect(ver1!.result.message).toContain("PR #42");
  });

  it("returns ok=true for a released version", async () => {
    const tmp = tmpDir();
    const ctx = makeCtx(tmp, { coreVersion: "1.10.0" });
    const report = await runChecks(ctx);
    const ver1 = report.results.find((r) => r.check.id === "C-VER-1");
    expect(ver1!.result.ok).toBe(true);
  });
});
