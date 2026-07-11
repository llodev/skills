import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskParentSetHandler } from "../../../src/runtime/handlers/task-parent-set.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskParentSetHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-parent-set-test-"));
    auditLogPath = join(tmpDir, "audit.log");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeCtx(canned: { ok: boolean; data?: unknown; code?: string }): RuntimeContext {
    const transport = {
      taskParentSet: async (req: unknown) => {
        void req;
        return canned.ok
          ? { ok: true, data: canned.data as never }
          : { ok: false, code: canned.code as never };
      },
    } as unknown as Transport;
    return {
      tool: "jira",
      config: {},
      session: "test-session",
      auditLogPath,
      language: undefined,
      transport,
    };
  }

  it("returns the transport envelope and audits id + parentId on success", async () => {
    const ctx = makeCtx({ ok: true, data: { parentSet: true } });
    const result = await taskParentSetHandler({ taskId: "SUB-1", parentId: "EPIC-9" }, ctx);
    expect(result).toEqual({ ok: true, data: { parentSet: true } });

    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.parent.set",
      tool: "jira",
      ok: true,
      session: "test-session",
      id: "SUB-1",
      parentId: "EPIC-9",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "code")).toBe(false);
  });

  it("audits code (and omits id/parentId) on failure", async () => {
    const ctx = makeCtx({ ok: false, code: "NOT_FOUND" });
    const result = await taskParentSetHandler({ taskId: "SUB-1", parentId: "EPIC-9" }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });

    expect(existsSync(auditLogPath)).toBe(true);
    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.parent.set",
      tool: "jira",
      ok: false,
      code: "NOT_FOUND",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "id")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, "parentId")).toBe(false);
  });
});
