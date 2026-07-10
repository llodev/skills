import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskCloseHandler } from "../../../src/runtime/handlers/task-close.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskCloseHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-close-test-"));
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
      taskClose: async (req) => {
        calls.push({ method: "taskClose", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
      taskDueDateSet: reject("taskDueDateSet") as unknown as Transport["taskDueDateSet"],
      taskAssigneeAdd: reject("taskAssigneeAdd") as unknown as Transport["taskAssigneeAdd"],
      taskCommentAdd: reject("taskCommentAdd") as unknown as Transport["taskCommentAdd"],
    };
    return { transport, calls };
  }

  it("delegates to transport.taskClose with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { closed: true, movedToListOrSectionId: "doneListId" },
    });
    const ctx = makeCtx({ transport });
    const req = { taskId: "card1", closeListOrSectionId: "doneListId" };
    await taskCloseHandler(req, ctx);
    expect(calls).toEqual([{ method: "taskClose", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const canned = { ok: true, data: { closed: true, movedToListOrSectionId: "doneListId" } };
    const { transport } = buildRecordingTransport(canned);
    const ctx = makeCtx({ transport });
    const result = await taskCloseHandler(
      { taskId: "card1", closeListOrSectionId: "doneListId" },
      ctx,
    );
    expect(result).toEqual({
      ok: true,
      data: { closed: true, movedToListOrSectionId: "doneListId" },
    });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const canned = { ok: false, code: "NOT_FOUND" };
    const { transport } = buildRecordingTransport(canned);
    const ctx = makeCtx({ transport });
    const result = await taskCloseHandler({ taskId: "card1" }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("appends one audit entry on success with id, closed, movedToListOrSectionId (Trello path)", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { closed: true, movedToListOrSectionId: "doneListId" },
    });
    const ctx = makeCtx({ transport });
    await taskCloseHandler({ taskId: "card1", closeListOrSectionId: "doneListId" }, ctx);
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.close",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      closed: true,
      movedToListOrSectionId: "doneListId",
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field and no closed/movedToListOrSectionId", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    await taskCloseHandler({ taskId: "card1" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.close",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "NOT_FOUND",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "closed")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, "movedToListOrSectionId")).toBe(false);
  });

  it("on Asana-style success (no movedToListOrSectionId): audit entry has id, closed, and movedToListOrSectionId key is OMITTED", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { closed: true },
    });
    const ctx = makeCtx({ transport, tool: "asana" });
    await taskCloseHandler({ taskId: "card1" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.close",
      tool: "asana",
      ok: true,
      session: "test-session",
      id: "card1",
      closed: true,
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "movedToListOrSectionId")).toBe(false);
  });
});
