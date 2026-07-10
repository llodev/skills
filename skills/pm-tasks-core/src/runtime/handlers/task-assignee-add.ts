import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type {
  TaskAssigneeAddRequest,
  TaskAssigneeAddResponse,
  TransportResult,
} from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskAssigneeAddHandler(
  req: TaskAssigneeAddRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskAssigneeAddResponse>> {
  const result = await ctx.transport.taskAssigneeAdd(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.assignee.add",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        userAlias: req.userId,
        added: result.data.added,
        currentAssigneeIds: result.data.currentAssigneeIds,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
