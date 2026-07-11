import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskEstimateSetHandler } from "../../../src/runtime/handlers/task-estimate-set.js";
import type { RuntimeContext } from "../../../src/runtime/index.js";
import type { Transport } from "../../../src/runtime/transport.js";

describe("taskEstimateSetHandler", () => {
  let tmpDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pm-tasks-task-estimate-set-test-"));
    auditLogPath = join(tmpDir, "audit.log");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeCtx(canned: { ok: boolean; data?: unknown; code?: string }): RuntimeContext {
    const transport = {
      taskEstimateSet: async (req: unknown) => {
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

  it("returns the transport envelope and audits id + fieldWritten on success", async () => {
    const ctx = makeCtx({ ok: true, data: { fieldWritten: "story_points" } });
    const result = await taskEstimateSetHandler({ taskId: "ISSUE-1", value: 5 }, ctx);
    expect(result).toEqual({ ok: true, data: { fieldWritten: "story_points" } });

    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.estimate.set",
      tool: "jira",
      ok: true,
      session: "test-session",
      id: "ISSUE-1",
      fieldWritten: "story_points",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "code")).toBe(false);
  });

  it("audits code (and omits id/fieldWritten) on failure", async () => {
    const ctx = makeCtx({ ok: false, code: "NOT_FOUND" });
    const result = await taskEstimateSetHandler({ taskId: "ISSUE-1", value: 5 }, ctx);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });

    expect(existsSync(auditLogPath)).toBe(true);
    const entry = JSON.parse(readFileSync(auditLogPath, "utf8").trim());
    expect(entry).toMatchObject({
      verb: "task.estimate.set",
      tool: "jira",
      ok: false,
      code: "NOT_FOUND",
    });
    expect(Object.prototype.hasOwnProperty.call(entry, "id")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, "fieldWritten")).toBe(false);
  });
});
