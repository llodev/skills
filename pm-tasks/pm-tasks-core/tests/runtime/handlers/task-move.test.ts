import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskMoveHandler } from "../../../src/runtime/handlers/task-move.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskMoveHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-move-test-"));
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
      taskMove: async (req) => {
        calls.push({ method: "taskMove", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
      checklistCheck: reject("checklistCheck") as unknown as Transport["checklistCheck"],
      taskClose: reject("taskClose") as unknown as Transport["taskClose"],
      taskDueDateSet: reject("taskDueDateSet") as unknown as Transport["taskDueDateSet"],
      taskAssigneeAdd: reject("taskAssigneeAdd") as unknown as Transport["taskAssigneeAdd"],
      taskCommentAdd: reject("taskCommentAdd") as unknown as Transport["taskCommentAdd"],
    };
    return { transport, calls };
  }

  it("delegates to transport.taskMove with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { previousListOrSectionId: "listA", newListOrSectionId: "listB" },
    });
    const ctx = makeCtx({ transport });
    const req = { taskId: "card1", targetListOrSectionId: "listB" };
    await taskMoveHandler(req, ctx);
    expect(calls).toEqual([{ method: "taskMove", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousListOrSectionId: "listA", newListOrSectionId: "listB" },
    });
    const ctx = makeCtx({ transport });
    const result = await taskMoveHandler({ taskId: "card1", targetListOrSectionId: "listB" }, ctx);
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: "listA", newListOrSectionId: "listB" },
    });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    const result = await taskMoveHandler({ taskId: "card1", targetListOrSectionId: "listB" }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("appends one audit entry on success with the required fields", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousListOrSectionId: "listA", newListOrSectionId: "listB" },
    });
    const ctx = makeCtx({ transport });
    await taskMoveHandler({ taskId: "card1", targetListOrSectionId: "listB" }, ctx);
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.move",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      previousListId: "listA",
      newListId: "listB",
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    await taskMoveHandler({ taskId: "card1", targetListOrSectionId: "listB" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.move",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "NOT_FOUND",
    });
  });

  it("includes previousListId: null when adapter cannot determine prior list", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousListOrSectionId: null, newListOrSectionId: "listB" },
    });
    const ctx = makeCtx({ transport });
    await taskMoveHandler({ taskId: "card1", targetListOrSectionId: "listB" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.move",
      ok: true,
      id: "card1",
      newListId: "listB",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "previousListId")).toBe(true);
    expect(entry.previousListId).toBeNull();
  });
});
