import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type {
  ChecklistCheckRequest,
  ChecklistCheckResponse,
  TransportResult,
} from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function checklistCheckHandler(
  req: ChecklistCheckRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<ChecklistCheckResponse>> {
  const result = await ctx.transport.checklistCheck(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "checklist.check",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        item: req.itemId,
        previousState: result.data.previousState,
        newState: result.data.newState,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
