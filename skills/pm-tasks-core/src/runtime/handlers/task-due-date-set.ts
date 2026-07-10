import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type {
  TaskDueDateSetRequest,
  TaskDueDateSetResponse,
  TransportResult,
} from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskDueDateSetHandler(
  req: TaskDueDateSetRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskDueDateSetResponse>> {
  const result = await ctx.transport.taskDueDateSet(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.due-date.set",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        due: result.data.newDueAt,
        previousDueAt: result.data.previousDueAt,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
