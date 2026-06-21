import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskDueDateSetHandler } from "../../../src/runtime/handlers/task-due-date-set.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskDueDateSetHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-due-date-set-test-"));
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
      taskDueDateSet: async (req) => {
        calls.push({ method: "taskDueDateSet", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
      taskAssigneeAdd: reject("taskAssigneeAdd") as unknown as Transport["taskAssigneeAdd"],
      taskCommentAdd: reject("taskCommentAdd") as unknown as Transport["taskCommentAdd"],
    };
    return { transport, calls };
  }

  it("delegates to transport.taskDueDateSet with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { previousDueAt: "2026-06-15T00:00:00.000Z", newDueAt: "2026-07-01T00:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    const req = { taskId: "card1", dueAt: "2026-07-01T00:00:00.000Z" };
    await taskDueDateSetHandler(req, ctx);
    expect(calls).toEqual([{ method: "taskDueDateSet", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousDueAt: "2026-06-15T00:00:00.000Z", newDueAt: "2026-07-01T00:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    const result = await taskDueDateSetHandler(
      { taskId: "card1", dueAt: "2026-07-01T00:00:00.000Z" },
      ctx,
    );
    expect(result).toEqual({
      ok: true,
      data: { previousDueAt: "2026-06-15T00:00:00.000Z", newDueAt: "2026-07-01T00:00:00.000Z" },
    });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    const result = await taskDueDateSetHandler(
      { taskId: "card1", dueAt: "2026-07-01T00:00:00.000Z" },
      ctx,
    );
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("appends one audit entry on success with the required fields", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousDueAt: "2026-06-15T00:00:00.000Z", newDueAt: "2026-07-01T00:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    await taskDueDateSetHandler({ taskId: "card1", dueAt: "2026-07-01T00:00:00.000Z" }, ctx);
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.due-date.set",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      due: "2026-07-01T00:00:00.000Z",
      previousDueAt: "2026-06-15T00:00:00.000Z",
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    await taskDueDateSetHandler({ taskId: "card1", dueAt: "2026-07-01T00:00:00.000Z" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.due-date.set",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "NOT_FOUND",
    });
  });

  it("includes previousDueAt: null when adapter cannot determine prior due", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousDueAt: null, newDueAt: "2026-07-01T00:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    await taskDueDateSetHandler({ taskId: "card1", dueAt: "2026-07-01T00:00:00.000Z" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.due-date.set",
      ok: true,
      id: "card1",
      due: "2026-07-01T00:00:00.000Z",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "previousDueAt")).toBe(true);
    expect(entry.previousDueAt).toBeNull();
  });
});
