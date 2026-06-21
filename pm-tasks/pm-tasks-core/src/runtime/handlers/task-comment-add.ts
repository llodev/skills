import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type {
  TaskCommentAddRequest,
  TaskCommentAddResponse,
  TransportResult,
} from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskCommentAddHandler(
  req: TaskCommentAddRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskCommentAddResponse>> {
  const result = await ctx.transport.taskCommentAdd(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.comment.add",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: req.taskId,
        commentId: result.data.commentId,
        clientToken: req.clientToken,
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
