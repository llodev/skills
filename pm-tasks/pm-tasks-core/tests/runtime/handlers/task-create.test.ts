import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskCreateHandler } from "../../../src/runtime/handlers/task-create.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskCreateHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-create-test-"));
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
      taskCreate: async (req) => {
        calls.push({ method: "taskCreate", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
      taskMove: reject("taskMove") as unknown as Transport["taskMove"],
      checklistCheck: reject("checklistCheck") as unknown as Transport["checklistCheck"],
      taskClose: reject("taskClose") as unknown as Transport["taskClose"],
      taskDueDateSet: reject("taskDueDateSet") as unknown as Transport["taskDueDateSet"],
      taskAssigneeAdd: reject("taskAssigneeAdd") as unknown as Transport["taskAssigneeAdd"],
      taskCommentAdd: reject("taskCommentAdd") as unknown as Transport["taskCommentAdd"],
    };
    return { transport, calls };
  }

  it("delegates to transport.taskCreate with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { id: "cardA", url: "https://trello.com/c/xyz" },
    });
    const ctx = makeCtx({ transport });
    const req = {
      boardOrProjectId: "boardA",
      listOrSectionId: "listA",
      name: "My task",
      clientToken: "ct-123",
    };
    await taskCreateHandler(req, ctx);
    expect(calls).toEqual([{ method: "taskCreate", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { id: "cardA", url: "https://trello.com/c/xyz" },
    });
    const ctx = makeCtx({ transport });
    const result = await taskCreateHandler(
      { boardOrProjectId: "boardA", listOrSectionId: "listA", name: "X" },
      ctx,
    );
    expect(result).toEqual({ ok: true, data: { id: "cardA", url: "https://trello.com/c/xyz" } });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "RATE_LIMITED" });
    const ctx = makeCtx({ transport });
    const result = await taskCreateHandler(
      { boardOrProjectId: "boardA", listOrSectionId: "listA", name: "X" },
      ctx,
    );
    expect(result).toEqual({ ok: false, code: "RATE_LIMITED" });
  });

  it("appends one audit entry on success with the required fields", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { id: "cardA", url: "https://trello.com/c/xyz" },
    });
    const ctx = makeCtx({ transport });
    await taskCreateHandler(
      {
        boardOrProjectId: "boardA",
        listOrSectionId: "listA",
        name: "My task",
        clientToken: "ct-123",
      },
      ctx,
    );
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.create",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "cardA",
      url: "https://trello.com/c/xyz",
      name: "My task",
      clientToken: "ct-123",
      scope: { board: "boardA", list: "listA" },
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "AUTH_ERROR" });
    const ctx = makeCtx({ transport });
    await taskCreateHandler(
      { boardOrProjectId: "boardA", listOrSectionId: "listA", name: "X" },
      ctx,
    );
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "task.create",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "AUTH_ERROR",
    });
  });
});
