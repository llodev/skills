import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checklistCheckHandler } from "../../../src/runtime/handlers/checklist-check.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("checklistCheckHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-checklist-check-test-"));
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
      checklistCheck: async (req) => {
        calls.push({ method: "checklistCheck", req });
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
      taskClose: reject("taskClose") as unknown as Transport["taskClose"],
      taskDueDateSet: reject("taskDueDateSet") as unknown as Transport["taskDueDateSet"],
      taskAssigneeAdd: reject("taskAssigneeAdd") as unknown as Transport["taskAssigneeAdd"],
      taskCommentAdd: reject("taskCommentAdd") as unknown as Transport["taskCommentAdd"],
    };
    return { transport, calls };
  }

  it("delegates to transport.checklistCheck with the same request", async () => {
    const { transport, calls } = buildRecordingTransport({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
    const ctx = makeCtx({ transport });
    const req = {
      taskId: "card1",
      checklistId: "cl1",
      itemId: "ci1",
      targetState: "complete" as const,
    };
    await checklistCheckHandler(req, ctx);
    expect(calls).toEqual([{ method: "checklistCheck", req }]);
  });

  it("returns the transport result envelope unchanged on success", async () => {
    const canned = { ok: true, data: { previousState: "incomplete", newState: "complete" } };
    const { transport } = buildRecordingTransport(canned);
    const ctx = makeCtx({ transport });
    const result = await checklistCheckHandler(
      { taskId: "card1", checklistId: "cl1", itemId: "ci1", targetState: "complete" },
      ctx,
    );
    expect(result).toEqual({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
  });

  it("returns the transport result envelope unchanged on failure", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    const result = await checklistCheckHandler(
      { taskId: "card1", checklistId: "cl1", itemId: "ci1", targetState: "complete" },
      ctx,
    );
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("appends one audit entry on success with the required fields", async () => {
    const { transport } = buildRecordingTransport({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
    const ctx = makeCtx({ transport });
    await checklistCheckHandler(
      { taskId: "card1", checklistId: "cl1", itemId: "ci1", targetState: "complete" },
      ctx,
    );
    expect(existsSync(auditLogPath)).toBe(true);
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "checklist.check",
      tool: "trello",
      ok: true,
      session: "test-session",
      id: "card1",
      item: "ci1",
      previousState: "incomplete",
      newState: "complete",
    });
    expect(typeof entry.ts).toBe("string");
    expect(() => new Date(entry.ts).toISOString()).not.toThrow();
  });

  it("appends one audit entry on failure with code field and no state fields", async () => {
    const { transport } = buildRecordingTransport({ ok: false, code: "NOT_FOUND" });
    const ctx = makeCtx({ transport });
    await checklistCheckHandler(
      { taskId: "card1", checklistId: "cl1", itemId: "ci1", targetState: "complete" },
      ctx,
    );
    const lines = readFileSync(auditLogPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      verb: "checklist.check",
      tool: "trello",
      ok: false,
      session: "test-session",
      code: "NOT_FOUND",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "previousState")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, "newState")).toBe(false);
  });
});
