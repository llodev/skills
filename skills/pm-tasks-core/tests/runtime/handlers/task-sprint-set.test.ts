import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskSprintSetHandler } from "../../../src/runtime/handlers/task-sprint-set.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskSprintSetHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-sprint-set-test-"));
    auditLogPath = join(tmpDir, "audit.log");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeCtx(canned: { ok: boolean; data?: unknown; code?: string }): RuntimeContext {
    const transport = {
      taskSprintSet: async (req: unknown) => {
        void req;
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
    } as unknown as Transport;
    return {
      tool: "linear",
      config: {},
      session: "test-session",
      auditLogPath,
      language: undefined,
      transport,
    };
  }

  it("returns the transport envelope and audits id + sprintRef on success", async () => {
    const ctx = makeCtx({ ok: true, data: { sprintSet: true } });
    const result = await taskSprintSetHandler({ taskId: "ISS-1", sprintRef: "Sprint 5" }, ctx);
    expect(result).toEqual({ ok: true, data: { sprintSet: true } });

    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.sprint.set",
      tool: "linear",
      ok: true,
      session: "test-session",
      id: "ISS-1",
      sprintRef: "Sprint 5",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "code")).toBe(false);
  });

  it("audits code (and omits id/sprintRef) on failure", async () => {
    const ctx = makeCtx({ ok: false, code: "NOT_FOUND" });
    const result = await taskSprintSetHandler({ taskId: "ISS-1", sprintRef: "Sprint 5" }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });

    expect(existsSync(auditLogPath)).toBe(true);
    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.sprint.set",
      tool: "linear",
      ok: false,
      code: "NOT_FOUND",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "id")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, "sprintRef")).toBe(false);
  });

  it("audits NOT_APPLICABLE when sprint/cycle feature is disabled", async () => {
    const ctx = makeCtx({ ok: false, code: "NOT_APPLICABLE" });
    const result = await taskSprintSetHandler({ taskId: "ISS-1", sprintRef: "Sprint 5" }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_APPLICABLE" });

    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.sprint.set",
      ok: false,
      code: "NOT_APPLICABLE",
    });
  });
});
