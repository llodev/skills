import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type { TaskCloseRequest, TaskCloseResponse, TransportResult } from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskCloseHandler(
  req: TaskCloseRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskCloseResponse>> {
  const result = await ctx.transport.taskClose(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.close",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        closed: result.data.closed,
        ...(result.data.movedToListOrSectionId !== undefined
          ? { movedToListOrSectionId: result.data.movedToListOrSectionId }
          : {}),
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
