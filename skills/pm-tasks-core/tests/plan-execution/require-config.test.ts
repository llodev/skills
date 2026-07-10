import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { requireConfig, ConfigRequiredError } from "../../src/plan-execution/require-config.js";

let workDir: string;
let configPath: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "require-config-test-"));
  configPath = path.join(workDir, ".trello.json");
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("requireConfig", () => {
  it("throws ConfigRequiredError with code MISSING when the file does not exist", async () => {
    let caught: unknown;
    try {
      await requireConfig({ configPath, tool: "trello" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigRequiredError);
    const err = caught as ConfigRequiredError;
    expect(err.code).toBe("MISSING");
    expect(err.tool).toBe("trello");
    expect(err.toolPath).toBe(configPath);
    expect(err.hint).toContain("npx @llodev/pm-tasks-trello init");
    expect(err.message).toContain("config not found");
    expect(err.message).toContain(err.hint);
  });

  it("throws ConfigRequiredError with code INVALID_JSON when the file is not valid JSON", async () => {
    await writeFile(configPath, "{ not: valid json", "utf8");
    let caught: unknown;
    try {
      await requireConfig({ configPath, tool: "trello" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigRequiredError);
    const err = caught as ConfigRequiredError;
    expect(err.code).toBe("INVALID_JSON");
    expect(err.tool).toBe("trello");
    expect(err.toolPath).toBe(configPath);
    expect(err.hint).toContain("npx @llodev/pm-tasks-trello init");
    expect(err.message).toContain("is not valid JSON");
  });

  it("throws ConfigRequiredError with code SCHEMA_VIOLATION when the config fails schema validation", async () => {
    await writeFile(configPath, JSON.stringify({}), "utf8");
    const schema = { type: "object", required: ["boards"] };
    let caught: unknown;
    try {
      await requireConfig({ configPath, tool: "trello", schema });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigRequiredError);
    const err = caught as ConfigRequiredError;
    expect(err.code).toBe("SCHEMA_VIOLATION");
    expect(err.tool).toBe("trello");
    expect(err.toolPath).toBe(configPath);
    expect(err.hint).toContain("npx @llodev/pm-tasks-trello init");
    expect(err.errors).not.toBeNull();
    expect(err.errors).not.toBeUndefined();
    expect(Array.isArray(err.errors)).toBe(true);
    expect((err.errors as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(err.message).toContain("fails schema validation");
  });

  it("returns the parsed config unchanged when schema is omitted", async () => {
    const fixture = { boards: [{ id: "b1" }] };
    await writeFile(configPath, JSON.stringify(fixture), "utf8");
    const result = await requireConfig({ configPath, tool: "trello" });
    expect(result).toEqual(fixture);
  });

  it("returns the parsed config unchanged when schema validation passes", async () => {
    const fixture = { boards: [{ id: "b1" }] };
    await writeFile(configPath, JSON.stringify(fixture), "utf8");
    const schema = {
      type: "object",
      required: ["boards"],
      properties: { boards: { type: "array" } },
    };
    const result = await requireConfig({ configPath, tool: "trello", schema });
    expect(result).toEqual(fixture);
  });

  it("emits an asana-specific hint when tool is 'asana'", async () => {
    const asanaPath = path.join(workDir, ".asana.json");
    let caught: unknown;
    try {
      await requireConfig({ configPath: asanaPath, tool: "asana" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigRequiredError);
    const err = caught as ConfigRequiredError;
    expect(err.hint).toContain("npx @llodev/pm-tasks-asana init");
    expect(err.hint).not.toContain("pm-tasks-trello");
  });

  it("does not wrap unexpected I/O errors (EISDIR when configPath is a directory)", async () => {
    // Reliable cross-platform non-ENOENT error: point configPath at a directory.
    // readFile on a directory yields EISDIR, which our helper must bubble up
    // unchanged instead of wrapping in ConfigRequiredError.
    const dirAsConfig = path.join(workDir, "config-dir");
    await mkdir(dirAsConfig);
    let caught: unknown;
    try {
      await requireConfig({ configPath: dirAsConfig, tool: "trello" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(caught).not.toBeInstanceOf(ConfigRequiredError);
    expect((caught as NodeJS.ErrnoException).code).toBe("EISDIR");
  });

  it("leaves error.errors undefined on MISSING and INVALID_JSON variants", async () => {
    // MISSING
    let missingErr: ConfigRequiredError | undefined;
    try {
      await requireConfig({ configPath, tool: "trello" });
    } catch (e) {
      missingErr = e as ConfigRequiredError;
    }
    expect(missingErr).toBeInstanceOf(ConfigRequiredError);
    expect(missingErr!.errors).toBeUndefined();

    // INVALID_JSON
    await writeFile(configPath, "{ broken", "utf8");
    let invalidErr: ConfigRequiredError | undefined;
    try {
      await requireConfig({ configPath, tool: "trello" });
    } catch (e) {
      invalidErr = e as ConfigRequiredError;
    }
    expect(invalidErr).toBeInstanceOf(ConfigRequiredError);
    expect(invalidErr!.errors).toBeUndefined();
  });

  it("is a proper Error subclass (instanceof Error, correct name, non-empty stack)", async () => {
    let caught: unknown;
    try {
      await requireConfig({ configPath, tool: "trello" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    const err = caught as ConfigRequiredError;
    expect(err.name).toBe("ConfigRequiredError");
    expect(typeof err.stack).toBe("string");
    expect((err.stack as string).length).toBeGreaterThan(0);
  });
});
