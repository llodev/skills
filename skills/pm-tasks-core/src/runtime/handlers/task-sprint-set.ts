import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type { TaskSprintSetRequest, TaskSprintSetResponse, TransportResult } from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskSprintSetHandler(
  req: TaskSprintSetRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskSprintSetResponse>> {
  const result = await ctx.transport.taskSprintSet!(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.sprint.set",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        sprintRef: req.sprintRef,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
