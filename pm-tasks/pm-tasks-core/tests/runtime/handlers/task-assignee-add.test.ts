import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskAssigneeAddHandler } from "../../../src/runtime/handlers/task-assignee-add.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskAssigneeAddHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-assignee-add-test-"));
    auditLogPath = join(tmpDir, "audit.log");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeCtx(overrides: Partial<RuntimeContext> & { transport: Transport }): RuntimeContext {
    return {
      tool: "trello",
      config: {},
      session: "test-session",
      auditLogPath,
      language: undefined,
      ...overrides,
    };
  }

  function buildRecordingTransport(canned: { ok: boolean; data?: unknown; code?: string }): {
    transport: Transport;
    calls: { method: string; req: unknown }[];
  } {
    const calls: { method: string; req: unknown }[] = [];
    const reject = (method: string) => async (req: unknown) => {
      calls.push({ method, req });
      throw new Error(`unexpected call to ${method}`);
    };
    const transport: Transport = {
      taskCreate: reject("taskCreate") as unknown as Transport["taskCreate"],
      taskMove: reject("taskMove") as unknown as Transport["taskMove"],
      checklistCheck: reject("checklistCheck") as unknown as Transport["checklistCheck"],
      taskClose: reject("taskClose") as unknown as Transport["taskClose"],
      taskDueDateSet: reject("taskDueDateSet") as unknown as Transport["taskDueDateSet"],
      taskAssigneeAdd: async (req) => {
        calls.push({ method: "taskAssigneeAdd", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
      taskCommentAdd: reject("taskCommentAdd") as unknown as Transport["taskCommentAdd"],
    };
    return { transport, calls };
  }

  it("delegates to transport.taskAssigneeAdd with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { added: true, currentAssigneeIds: ["user0", "user1"] },
    });
    const ctx = makeCtx({ transport });
    const req = { taskId: "card1", userId: "user1" };
    await taskAssigneeAddHandler(req, ctx);
    expect(calls).toEqual([{ method: "taskAssigneeAdd", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { added: true, currentAssigneeIds: ["user0", "user1"] },
    });
    const ctx = makeCtx({ transport });
    const result = await taskAssigneeAddHandler({ taskId: "card1", userId: "user1" }, ctx);
    expect(result).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["user0", "user1"] },
    });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    const result = await taskAssigneeAddHandler({ taskId: "card1", userId: "user1" }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("appends one audit entry on success (newly added) with the required fields", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { added: true, currentAssigneeIds: ["user0", "user1"] },
    });
    const ctx = makeCtx({ transport });
    await taskAssigneeAddHandler({ taskId: "card1", userId: "user1" }, ctx);
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.assignee.add",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      userAlias: "user1",
      added: true,
      currentAssigneeIds: ["user0", "user1"],
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    await taskAssigneeAddHandler({ taskId: "card1", userId: "user1" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.assignee.add",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "NOT_FOUND",
    });
  });

  it("audit entry has added: false and currentAssigneeIds unchanged when assignee already present", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { added: false, currentAssigneeIds: ["user0", "user1"] },
    });
    const ctx = makeCtx({ transport });
    await taskAssigneeAddHandler({ taskId: "card1", userId: "user1" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.assignee.add",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      userAlias: "user1",
      added: false,
      currentAssigneeIds: ["user0", "user1"],
    });
  });
});
