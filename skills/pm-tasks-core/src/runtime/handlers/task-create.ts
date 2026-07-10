import { appendAuditEntry, type AuditEntry } from "../../audit.js";
import type { TaskCreateRequest, TaskCreateResponse, TransportResult } from "../transport.js";
import type { RuntimeContext } from "../index.js";

export async function taskCreateHandler(
  req: TaskCreateRequest,
  ctx: RuntimeContext,
): Promise<TransportResult<TaskCreateResponse>> {
  const result = await ctx.transport.taskCreate(req);

  const base: AuditEntry = {
    ts: new Date().toISOString(),
    verb: "task.create",
    tool: ctx.tool,
    ok: result.ok,
    session: ctx.session,
  };

  const entry: AuditEntry = result.ok
    ? {
        ...base,
        id: result.data.id,
        url: result.data.url,
        name: req.name,
        clientToken: req.clientToken,
        scope: {
          board: req.boardOrProjectId,
          list: req.listOrSectionId,
        },
      }
    : {
        ...base,
        code: result.code,
      };

  await appendAuditEntry(entry, { logPath: ctx.auditLogPath });

  return result;
}
