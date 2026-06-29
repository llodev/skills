import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type { TaskParentSetRequest, TaskParentSetResponse, TransportResult } from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskParentSetHandler(
  req: TaskParentSetRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskParentSetResponse>> {
  const result = await ctx.transport.taskParentSet!(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.parent.set",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        parentId: req.parentId,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
