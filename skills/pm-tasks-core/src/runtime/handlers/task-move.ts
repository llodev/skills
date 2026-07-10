import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type { TaskMoveRequest, TaskMoveResponse, TransportResult } from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskMoveHandler(
  req: TaskMoveRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskMoveResponse>> {
  const result = await ctx.transport.taskMove(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.move",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        previousListId: result.data.previousListOrSectionId,
        newListId: result.data.newListOrSectionId,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
