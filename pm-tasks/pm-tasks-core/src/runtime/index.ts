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
import { taskCreateHandler } from "./handlers/task-create.js";
import { taskMoveHandler } from "./handlers/task-move.js";
import { checklistCheckHandler } from "./handlers/checklist-check.js";
import { taskCloseHandler } from "./handlers/task-close.js";
import { taskDueDateSetHandler } from "./handlers/task-due-date-set.js";
import { taskAssigneeAddHandler } from "./handlers/task-assignee-add.js";
import { taskCommentAddHandler } from "./handlers/task-comment-add.js";

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

/**
 * Internal context handed to each verb handler. Holds the resolved
 * runtime state so handlers can dispatch via transport, append audit
 * entries, and reference config + locale.
 */
export interface RuntimeContext {
  /** Tool name (e.g. "trello", "asana") — written into audit entries' `tool` field. */
  tool: string;
  /** Parsed config from .<tool>.json (typed `unknown` here; Phase 4.1 may narrow via generic). */
  config: unknown;
  /** Transport implementation for the bound adapter. */
  transport: Transport;
  /** Session id for audit-log correlation. */
  session: string;
  /** Absolute path to audit log file. */
  auditLogPath: string;
  /** Optional locale hint from .<tool>.json. */
  language: string | undefined;
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

  // Internal context — verb handlers close over this.
  const ctx: RuntimeContext = { config, transport, session, auditLogPath, tool, language };

  // 4. Return Runtime — all 7 verb handlers wired (Phase 2 complete).
  return {
    taskCreate: (req) => taskCreateHandler(req, ctx),
    taskMove: (req) => taskMoveHandler(req, ctx),
    checklistCheck: (req) => checklistCheckHandler(req, ctx),
    taskClose: (req) => taskCloseHandler(req, ctx),
    taskDueDateSet: (req) => taskDueDateSetHandler(req, ctx),
    taskAssigneeAdd: (req) => taskAssigneeAddHandler(req, ctx),
    taskCommentAdd: (req) => taskCommentAddHandler(req, ctx),
  };
}
