import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createCoreRuntime } from "../../src/runtime/index.js";
import type { Transport } from "../../src/runtime/transport.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("createCoreRuntime", () => {
  let tmpDir: string;
  let configPath: string;

  // No-op Transport stub — all methods return failure envelopes; never called by stub verbs.
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

  it("stub verb methods throw with dotted canonical name in the message", async () => {
    const rt = await createCoreRuntime({ tool: "trello", configPath, transport: stubTransport });
    await expect(
      rt.taskCreate({ boardOrProjectId: "b1", listOrSectionId: "l1", name: "x" }),
    ).rejects.toThrow(/task\.create stub.*Phase 2/);
    await expect(
      rt.checklistCheck({
        taskId: "c1",
        checklistId: "cl1",
        itemId: "ci1",
        targetState: "complete",
      }),
    ).rejects.toThrow(/checklist\.check stub.*Phase 2/);
  });
});
