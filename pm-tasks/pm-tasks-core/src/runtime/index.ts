import { readFile } from "node:fs/promises";
import { generateSession } from "./session.js";
import { resolveDataDir } from "../audit.js";
import type {
  Transport,
  TransportResult,
  TaskCreateRequest,
  TaskCreateResponse,
  TaskMoveRequest,
  TaskMoveResponse,
  ChecklistCheckRequest,
  ChecklistCheckResponse,
  TaskCloseRequest,
  TaskCloseResponse,
  TaskDueDateSetRequest,
  TaskDueDateSetResponse,
  TaskAssigneeAddRequest,
  TaskAssigneeAddResponse,
  TaskCommentAddRequest,
  TaskCommentAddResponse,
} from "./transport.js";

export interface CreateRuntimeOptions {
  /** Tool name — used for audit-log path and error messages. e.g. "trello", "asana". */
  tool: string;
  /** Absolute or cwd-relative path to .<tool>.json config file. */
  configPath: string;
  /** Transport implementation (Phase 3 provides MCP-bound transports). */
  transport: Transport;
  /** Session id for audit-log correlation. Defaults to generateSession() when omitted. */
  session?: string;
  /** Optional locale hint (forwarded from .<tool>.json locale field for narration). */
  language?: string;
}

export interface Runtime {
  taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>>;
  taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>>;
  checklistCheck(req: ChecklistCheckRequest): Promise<TransportResult<ChecklistCheckResponse>>;
  taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>>;
  taskDueDateSet(req: TaskDueDateSetRequest): Promise<TransportResult<TaskDueDateSetResponse>>;
  taskAssigneeAdd(req: TaskAssigneeAddRequest): Promise<TransportResult<TaskAssigneeAddResponse>>;
  taskCommentAdd(req: TaskCommentAddRequest): Promise<TransportResult<TaskCommentAddResponse>>;
}

export async function createCoreRuntime(opts: CreateRuntimeOptions): Promise<Runtime> {
  const { tool, configPath, transport, language } = opts;

  // 1. Load + parse config; throw clear errors on missing file / invalid JSON
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    throw new Error(
      `pm-tasks-core: config not found at ${configPath} — run 'npx @llodev/pm-tasks-${tool} init' to create one`,
    );
  }

  let config: unknown;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(`pm-tasks-core: invalid JSON in config at ${configPath}`);
  }

  // 2. Resolve session (caller override OR generateSession())
  const session = opts.session ?? generateSession();

  // 3. Resolve audit log path via resolveDataDir(tool) + "/audit.log"
  const auditLogPath = resolveDataDir(tool) + "/audit.log";

  // Internal context — Phase 2 verb handlers will close over this.
  // Kept here so Phase 2 readers see exactly what's available.
  const _ctx = { config, transport, session, auditLogPath, tool, language };
  void _ctx; // suppress unused-variable warnings until Phase 2 wires handlers

  // 4. Return Runtime with stub verb methods — each THROWS until Phase 2 wires a real handler.
  const notImpl = (verb: string): never => {
    throw new Error(`pm-tasks-core runtime: ${verb} stub — Phase 2 handler not yet wired`);
  };

  return {
    taskCreate: async () => notImpl("task.create"),
    taskMove: async () => notImpl("task.move"),
    checklistCheck: async () => notImpl("checklist.check"),
    taskClose: async () => notImpl("task.close"),
    taskDueDateSet: async () => notImpl("task.due-date.set"),
    taskAssigneeAdd: async () => notImpl("task.assignee.add"),
    taskCommentAdd: async () => notImpl("task.comment.add"),
  };
}
