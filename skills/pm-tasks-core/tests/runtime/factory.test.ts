import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createCoreRuntime } from "../../src/runtime/index.js";
import type { Transport } from "../../src/runtime/transport.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("createCoreRuntime", () => {
  let tmpDir: string;
  let configPath: string;

  // No-op Transport stub — all methods return failure envelopes.
  const stubTransport: Transport = {
    taskCreate: async () => ({ ok: false, code: "INVALID_REQUEST" }),
    taskMove: async () => ({ ok: false, code: "INVALID_REQUEST" }),
    checklistCheck: async () => ({ ok: false, code: "INVALID_REQUEST" }),
    taskClose: async () => ({ ok: false, code: "INVALID_REQUEST" }),
    taskDueDateSet: async () => ({ ok: false, code: "INVALID_REQUEST" }),
    taskAssigneeAdd: async () => ({ ok: false, code: "INVALID_REQUEST" }),
    taskCommentAdd: async () => ({ ok: false, code: "INVALID_REQUEST" }),
  };

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-runtime-test-"));
    configPath = join(tmpDir, ".trello.json");
    writeFileSync(configPath, JSON.stringify({ version: "1", autonomous: { enabled: false } }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns a Runtime with all 7 verb methods", async () => {
    const rt = await createCoreRuntime({ tool: "trello", configPath, transport: stubTransport });
    expect(typeof rt.taskCreate).toBe("function");
    expect(typeof rt.taskMove).toBe("function");
    expect(typeof rt.checklistCheck).toBe("function");
    expect(typeof rt.taskClose).toBe("function");
    expect(typeof rt.taskDueDateSet).toBe("function");
    expect(typeof rt.taskAssigneeAdd).toBe("function");
    expect(typeof rt.taskCommentAdd).toBe("function");
  });

  it("returns a Runtime with taskParentSet, taskEstimateSet, and taskSprintSet methods", async () => {
    const rt = await createCoreRuntime({ tool: "trello", configPath, transport: stubTransport });
    expect(typeof rt.taskParentSet).toBe("function");
    expect(typeof rt.taskEstimateSet).toBe("function");
    expect(typeof rt.taskSprintSet).toBe("function");
  });

  it("taskParentSet → UNSUPPORTED_VERB when transport omits the method", async () => {
    const rt = await createCoreRuntime({ tool: "trello", configPath, transport: stubTransport });
    const result = await rt.taskParentSet({ taskId: "t1", parentId: "p1" });
    expect(result).toEqual({ ok: false, code: "UNSUPPORTED_VERB" });
  });

  it("taskEstimateSet → UNSUPPORTED_VERB when transport omits the method", async () => {
    const rt = await createCoreRuntime({ tool: "trello", configPath, transport: stubTransport });
    const result = await rt.taskEstimateSet({
      taskId: "t1",
      input: 5,
      config: { strategy: "story_points", jiraTarget: "story_points" },
    });
    expect(result).toEqual({ ok: false, code: "UNSUPPORTED_VERB" });
  });

  it("taskSprintSet → UNSUPPORTED_VERB when transport omits the method", async () => {
    const rt = await createCoreRuntime({ tool: "trello", configPath, transport: stubTransport });
    const result = await rt.taskSprintSet({ taskId: "t1", sprintRef: "Sprint 1" });
    expect(result).toEqual({ ok: false, code: "UNSUPPORTED_VERB" });
  });

  it("taskParentSet → reaches stub when transport provides the method", async () => {
    const parentSetResult = {
      ok: true as const,
      data: { previousParentId: null, newParentId: "p1" },
    };
    const transportWithParentSet = {
      ...stubTransport,
      taskParentSet: async () => parentSetResult,
    };
    const rt = await createCoreRuntime({
      tool: "trello",
      configPath,
      transport: transportWithParentSet,
    });
    const result = await rt.taskParentSet({ taskId: "t1", parentId: "p1" });
    expect(result).toEqual(parentSetResult);
  });

  it("taskEstimateSet → reaches stub when transport provides the method", async () => {
    const estimateResult = {
      ok: true as const,
      data: {
        normalized: { points: 5, humanReadable: "5", jiraTarget: "story_points" as const },
        fieldWritten: "story_points",
      },
    };
    const transportWithEstimate = {
      ...stubTransport,
      taskEstimateSet: async () => estimateResult,
    };
    const rt = await createCoreRuntime({
      tool: "trello",
      configPath,
      transport: transportWithEstimate,
    });
    const result = await rt.taskEstimateSet({
      taskId: "t1",
      input: 5,
      config: { strategy: "story_points", jiraTarget: "story_points" },
    });
    expect(result).toEqual(estimateResult);
  });

  it("throws a clear error when configPath does not exist", async () => {
    const missing = join(tmpDir, "missing.json");
    await expect(
      createCoreRuntime({ tool: "trello", configPath: missing, transport: stubTransport }),
    ).rejects.toThrow(/config not found at .*missing\.json.*npx @llodev\/pm-tasks-trello init/);
  });

  it("throws a clear error on invalid JSON", async () => {
    writeFileSync(configPath, "{not valid json");
    await expect(
      createCoreRuntime({ tool: "trello", configPath, transport: stubTransport }),
    ).rejects.toThrow(/invalid JSON in config at/);
  });
});
