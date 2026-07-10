import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type {
  TaskEstimateSetRequest,
  TaskEstimateSetResponse,
  TransportResult,
} from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskEstimateSetHandler(
  req: TaskEstimateSetRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskEstimateSetResponse>> {
  const result = await ctx.transport.taskEstimateSet!(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.estimate.set",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        fieldWritten: result.data.fieldWritten,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
