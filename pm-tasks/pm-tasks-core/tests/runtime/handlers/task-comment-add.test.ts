import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskCommentAddHandler } from "../../../src/runtime/handlers/task-comment-add.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskCommentAddHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-comment-add-test-"));
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
      taskAssigneeAdd: reject("taskAssigneeAdd") as unknown as Transport["taskAssigneeAdd"],
      taskCommentAdd: async (req) => {
        calls.push({ method: "taskCommentAdd", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
    };
    return { transport, calls };
  }

  it("delegates to transport.taskCommentAdd with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { commentId: "comment1", postedAt: "2026-06-21T22:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    const req = { taskId: "card1", text: "hello world", clientToken: "ct-comment-1" };
    await taskCommentAddHandler(req, ctx);
    expect(calls).toEqual([{ method: "taskCommentAdd", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { commentId: "comment1", postedAt: "2026-06-21T22:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    const result = await taskCommentAddHandler(
      { taskId: "card1", text: "hello world", clientToken: "ct-comment-1" },
      ctx,
    );
    expect(result).toEqual({
      ok: true,
      data: { commentId: "comment1", postedAt: "2026-06-21T22:00:00.000Z" },
    });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "AUTH_ERROR" });
    const ctx = makeCtx({ transport });
    const result = await taskCommentAddHandler(
      { taskId: "card1", text: "hello world", clientToken: "ct-comment-1" },
      ctx,
    );
    expect(result).toEqual({ ok: false, code: "AUTH_ERROR" });
  });

  it("appends one audit entry on success with id, commentId, clientToken present", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { commentId: "comment1", postedAt: "2026-06-21T22:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    await taskCommentAddHandler(
      { taskId: "card1", text: "hello world", clientToken: "ct-comment-1" },
      ctx,
    );
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.comment.add",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      commentId: "comment1",
      clientToken: "ct-comment-1",
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "AUTH_ERROR" });
    const ctx = makeCtx({ transport });
    await taskCommentAddHandler(
      { taskId: "card1", text: "hello world", clientToken: "ct-comment-1" },
      ctx,
    );
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.comment.add",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "AUTH_ERROR",
    });
  });

  it("audit entry has NO clientToken key when request omits clientToken", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { commentId: "comment1", postedAt: "2026-06-21T22:00:00.000Z" },
    });
    const ctx = makeCtx({ transport });
    await taskCommentAddHandler({ taskId: "card1", text: "hello world" }, ctx);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(Object.prototype.hasOwnProperty.call(entry, "clientToken")).toBe(false);
  });
});
