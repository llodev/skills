/**
 * ClickUp MCP transport: implements the @llodev/pm-tasks-core Transport by
 * dispatching each canonical verb to `clickup_*` tools. The MCP dispatcher is
 * injected, so this module is testable with a recording stub, has no side
 * effects on import, and references no `mcp__*` symbol at build time.
 *
 * ClickUp specifics:
 *   - Tool names are passed without the server prefix (`clickup_create_task`).
 *   - Every call carries `workspace_id: config.workspace.id`.
 *   - Writes return an envelope, reads a bare task (see envelope.ts); a resolved
 *     `{error}` is handled like a thrown error.
 *   - Status names are pinned per list in config and resolved by role (status.ts).
 */

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
  TaskParentSetRequest,
  TaskParentSetResponse,
  TaskEstimateSetResponse,
} from "@llodev/pm-tasks-core/runtime";
import { normalizeEstimate } from "@llodev/pm-tasks-core/estimation";
import type { EstimateInput, EstimationStrategy } from "@llodev/pm-tasks-core/estimation";
import type { AttributionConfig } from "@llodev/pm-tasks-core/init-lib";
import {
  callTool,
  epochToIso,
  idString,
  isObj,
  taskUrl,
  unwrapTask,
  type ClickUpTaskView,
} from "./envelope.js";
import { classifyError, invalidRequest, shapeError, type TransportFailure } from "./errors.js";
import { DEFAULT_HOURS_PER_DAY, slugify, toMinutes } from "./estimation.js";
import { resolveStatus, statusKey, type StatusRole } from "./status.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * MCP-call dispatcher supplied by the agent runtime. `toolName` has no server
 * prefix (`"clickup_get_task"`, not `"mcp__clickup__clickup_get_task"`).
 */
export type McpCaller = (toolName: string, args: Record<string, unknown>) => Promise<unknown>;

/** One ClickUp list the adapter works in, with its statuses pinned by role. */
export interface ClickUpListConfig {
  id: string;
  name: string;
  space?: string;
  folder?: string;
  statuses: { open: string; wip?: string; done: string; closed?: string };
}

/**
 * Adapter-local estimation config: `clickupTarget` replaces core's Jira-named
 * `jiraTarget`. Absent, not an object, or `enabled: false` means estimation is disabled.
 */
export interface ClickUpEstimationConfig {
  strategy: EstimationStrategy;
  /** "time" → native `time_estimate` (leaf tasks) + `est:` tag; "none" → tag only */
  clickupTarget: "time" | "none";
  enabled?: boolean;
  /** Hours in one ideal day for `ideal_days` (default 6). */
  hoursPerDay?: number;
  scale?: number[];
  sizeMap?: Record<string, number>;
}

/** The parsed `.clickup.json` config. */
export interface ClickUpConfig {
  version: "1";
  locale?: "en-US" | "pt-BR" | "es-ES";
  workspace: { id: string; name: string };
  lists: ClickUpListConfig[];
  defaultListId?: string;
  members?: Array<{ id: string; name: string; email?: string; alias?: string }>;
  estimation?: ClickUpEstimationConfig;
  defaults?: { assigneeAlias?: string; escalateToAlias?: string };
  autonomous?: {
    enabled: boolean;
    allow: string[];
    scope?: { lists?: string[] };
    rateLimit?: { writesPerMinute?: number; commentsPerMinute?: number };
    auditLog?: string;
  };
  attribution?: AttributionConfig;
}

export interface CreateClickUpTransportOptions {
  mcp: McpCaller;
  config: ClickUpConfig;
}

/** ClickUp override of TaskEstimateSetRequest carrying `clickupTarget`. */
export interface ClickUpTaskEstimateSetRequest {
  taskId: string;
  input: EstimateInput;
  config: ClickUpEstimationConfig;
}

/** Transport with taskEstimateSet narrowed to the ClickUp estimation config. */
export type ClickUpTransport = Omit<Transport, "taskEstimateSet"> & {
  taskEstimateSet?(
    req: ClickUpTaskEstimateSetRequest,
  ): Promise<TransportResult<TaskEstimateSetResponse>>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const PRIORITIES = new Map([
  ["urgent", "urgent"],
  ["high", "high"],
  ["normal", "normal"],
  ["medium", "normal"],
  ["low", "low"],
]);

/** Native priority name; undefined (omitted from the call) when unknown. */
function mapPriority(priority: string | undefined): string | undefined {
  return typeof priority === "string" ? PRIORITIES.get(priority.trim().toLowerCase()) : undefined;
}

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

/**
 * A string that starts with a real calendar date (`YYYY-MM-DD`). Date rolls
 * `2026-02-30` over to March, so the prefix must survive a round trip.
 */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PREFIX.test(value)) return false;
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** Description with the `[ct:<token>]` footer, appended once. */
function withClientToken(description: string | undefined, clientToken: string | undefined) {
  const body = description ?? "";
  if (!clientToken) return body;
  const marker = `[ct:${clientToken}]`;
  if (body.includes(marker)) return body;
  return body.trim() === "" ? marker : `${body.trimEnd()}\n\n${marker}`;
}

/** `task.move` role words; a Map so prototype keys such as "constructor" never match. */
const ROLES = new Map<string, StatusRole>([
  ["open", "open"],
  ["wip", "wip"],
  ["done", "done"],
]);

/** A `task.move` target of six or more digits is a destination list id. */
const LIST_ID = /^\d{6,}$/;

/** `update_task` answer when the status is not in the task's list (renamed or removed). */
const STATUS_REJECTED = /status does not exist/i;

/** Status names compare case-insensitively and trimmed; the pinned name is sent verbatim. */
function sameStatus(current: string, pinned: string): boolean {
  return statusKey(current) === statusKey(pinned);
}

/**
 * INVALID_REQUEST (`id_required`, naming the field) for the first id that is not a
 * non-blank string; null when every id is usable. Runs before any MCP call.
 */
function missingId(verb: string, ids: Record<string, unknown>): TransportFailure | null {
  for (const [field, value] of Object.entries(ids)) {
    if (typeof value !== "string" || value.trim() === "") {
      return invalidRequest(verb, "id_required", `${field} must be a non-empty id`, { field });
    }
  }
  return null;
}

/** A thrown or resolved MCP failure, classified. */
function failure(e: unknown): TransportFailure {
  const { code, details } = classifyError(e);
  return { ok: false, code, details };
}

/** The idempotency short-circuit: the requested state already holds, nothing was written. */
function alreadyInState(verb: string, details: Record<string, unknown>): TransportFailure {
  return { ok: false, code: "ALREADY_IN_STATE", details: { ...details, verb } };
}

/** A verb ClickUp, or this config, cannot carry out; `reason` is a stable token. */
function notApplicable(verb: string, reason: string, message: string): TransportFailure {
  return { ok: false, code: "NOT_APPLICABLE", details: { verb, reason, message } };
}

/** The writes of `task.estimate.set`, in order; a partial failure names them. */
type EstimateStep = "time_estimate" | "tag_remove" | "tag_create" | "tag_add";

/**
 * A failed `task.estimate.set` write. Before anything was written it is the plain
 * classified failure. After a write it is partial: MCP_ERROR with
 * `partial`, the steps already applied and the failed one. An auth or rate-limit
 * failure keeps its code, so the caller still knows to sign in again or wait.
 */
function stepFailure(
  failed: TransportFailure,
  applied: readonly EstimateStep[],
  failedStep: EstimateStep,
): TransportFailure {
  if (applied.length === 0) return failed;
  const code =
    failed.code === "AUTH_ERROR" || failed.code === "RATE_LIMITED" ? failed.code : "MCP_ERROR";
  return {
    ok: false,
    code,
    details: {
      ...failed.details,
      verb: "task.estimate.set",
      partial: true,
      applied: [...applied],
      failedStep,
    },
  };
}

/** A task read with `clickup_get_task`: its home list and status name are always known. */
type HomeTask = ClickUpTaskView & { listId: string; status: string };

/**
 * Raw `get_task` fields a verb relies on beyond list, status and parent, checked so
 * a partial read never passes for a real value. `unwrapTask` reads a missing
 * `assignees` array as "nobody" and drops an entry without an id, so the union
 * write would unassign people; a missing `due_date` would read as "no due date";
 * missing `tags` as "no est: tag" (a second one would be added); a missing
 * `subtasks_count` as a leaf (the native estimate would land on a parent); and
 * without `space.id` the est: tag cannot be created after the estimate write.
 */
const READ_CHECKS = {
  assignees: (raw: Record<string, unknown>, task: ClickUpTaskView) =>
    Array.isArray(raw.assignees) && raw.assignees.length === task.assigneeIds.length,
  due_date: (raw: Record<string, unknown>, task: ClickUpTaskView) =>
    raw.due_date === null || task.dueDate !== null,
  tags: (raw: Record<string, unknown>, task: ClickUpTaskView) =>
    Array.isArray(raw.tags) && raw.tags.length === task.tagNames.length,
  subtasks_count: (raw: Record<string, unknown>) => typeof raw.subtasks_count === "number",
  space: (_raw: Record<string, unknown>, task: ClickUpTaskView) => task.spaceId !== undefined,
};
type ReadCheck = keyof typeof READ_CHECKS;

/** A ClickUp user id: digits only. Anything else ("me", an email, a name) is resolved. */
const USER_ID = /^\d+$/;

/** `clickup_create_comment.comment_text` maxLength (live schema). */
const COMMENT_MAX_LENGTH = 40000;

/** `utc_offset` of `clickup_get_user` ("-03:00", "+05:30") in minutes; null when unreadable. */
function offsetMinutes(value: unknown): number | null {
  const m = typeof value === "string" ? /^([+-])(\d{2}):?(\d{2})$/.exec(value) : null;
  if (!m) return null;
  const hours = Number(m[2]);
  const minutes = Number(m[3]);
  if (hours > 14 || minutes > 59) return null;
  return (m[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}

/** The calendar date (YYYY-MM-DD) of an ISO instant at a fixed UTC offset in minutes. */
function localDate(iso: string, offset: number): string {
  return new Date(Date.parse(iso) + offset * 60_000).toISOString().slice(0, 10);
}

/**
 * The comment carrying `marker` on a `clickup_get_task_comments` page, or null.
 * ClickUp keeps the marker verbatim and appends a newline to `comment_text`, so
 * this is a substring match. An unreadable page, or a match without an id or a
 * date, is a shape error: posting anyway could duplicate the comment.
 */
function markedComment(
  resp: unknown,
  marker: string,
  verb: string,
): TransportResult<TaskCommentAddResponse | null> {
  if (!isObj(resp) || !Array.isArray(resp.comments)) return shapeError(verb);
  for (const comment of resp.comments) {
    if (!isObj(comment) || typeof comment.comment_text !== "string") continue;
    if (!comment.comment_text.includes(marker)) continue;
    const commentId = idString(comment.id);
    const postedAt = epochToIso(comment.date);
    if (commentId === undefined || postedAt === null) return shapeError(verb);
    return { ok: true, data: { commentId, postedAt } };
  }
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createClickUpTransport(opts: CreateClickUpTransportOptions): ClickUpTransport {
  const { mcp, config } = opts;
  const workspaceId = config.workspace.id;

  /** Every ClickUp call carries the configured workspace. */
  const call = (tool: string, args: Record<string, unknown>) =>
    callTool(mcp, tool, { ...args, workspace_id: workspaceId });

  /**
   * One compact `clickup_get_task`: the only trusted source of a task's status,
   * home list and parent. A bare task always carries `list.id`, a status name and
   * a `parent` key (null for a root task). A write envelope or a partial read
   * lacks one of them, and `unwrapTask` would default it (no status, parentId
   * null): trusting that skips a write or lets a subtask pass as a root task, so
   * it is a shape error instead. `checks` names the further fields the verb
   * relies on (READ_CHECKS).
   */
  async function readTask(
    taskId: string,
    verb: string,
    checks: readonly ReadCheck[] = [],
  ): Promise<TransportResult<HomeTask>> {
    try {
      const raw = await call("clickup_get_task", { task_id: taskId });
      const task = unwrapTask(raw);
      if (!task || task.listId === undefined || task.status === undefined) {
        return shapeError(verb);
      }
      const fields = raw as Record<string, unknown>;
      const parent = fields.parent;
      if (parent !== null && (typeof parent !== "string" || parent === "")) {
        return shapeError(verb);
      }
      if (!checks.every((field) => READ_CHECKS[field](fields, task))) return shapeError(verb);
      return { ok: true, data: { ...task, listId: task.listId, status: task.status } };
    } catch (e) {
      return failure(e);
    }
  }

  /** `clickup_update_task` on one task: null on success, the classified failure otherwise. */
  async function updateTask(
    taskId: string,
    fields: Record<string, unknown>,
  ): Promise<TransportFailure | null> {
    try {
      await call("clickup_update_task", { task_id: taskId, ...fields });
      return null;
    } catch (e) {
      return failure(e);
    }
  }

  /**
   * The account's UTC offset in minutes, from `clickup_get_user`, read once
   * per transport; parallel callers share the read in flight. A failure or an
   * unreadable offset resolves null and is dropped, so the next call reads again.
   */
  let offsetRead: Promise<number | null> | undefined;
  function accountOffset(): Promise<number | null> {
    offsetRead ??= call("clickup_get_user", {})
      .then(
        (user) => offsetMinutes(isObj(user) ? user.utc_offset : undefined),
        () => null,
      )
      .then((offset) => {
        if (offset === null) offsetRead = undefined;
        return offset;
      });
    return offsetRead;
  }

  /**
   * The numeric user id for `userId`. Digits are used as given; "me", an email or
   * a username goes through `clickup_resolve_assignees`, which answers null for a
   * name shared by several users. Anything but exactly one numeric id fails closed
   * as `assignee_unresolved`, without echoing the input; an auth or rate-limit
   * failure keeps its code, since it is not about the user.
   */
  async function resolveAssignee(userId: string): Promise<TransportResult<string>> {
    if (USER_ID.test(userId)) return { ok: true, data: userId };
    const unresolved = invalidRequest(
      "task.assignee.add",
      "assignee_unresolved",
      "userId did not resolve to exactly one ClickUp user; pass a user id or a unique email",
    );
    try {
      const resp = await call("clickup_resolve_assignees", { assignees: [userId] });
      const ids = isObj(resp) && Array.isArray(resp.userIds) ? resp.userIds : [];
      const id = ids.length === 1 ? idString(ids[0]) : undefined;
      return id !== undefined && USER_ID.test(id) ? { ok: true, data: id } : unresolved;
    } catch (e) {
      const failed = failure(e);
      return failed.code === "AUTH_ERROR" || failed.code === "RATE_LIMITED" ? failed : unresolved;
    }
  }

  /** The status pinned for `role` in the task's home list; fails closed when unpinned. */
  function pinnedStatus(
    verb: string,
    task: HomeTask,
    role: StatusRole,
  ): { ok: true; status: string } | TransportFailure {
    const resolved = resolveStatus(config, task.listId, role);
    if (resolved.ok) return resolved;
    if (resolved.reason === "list_not_configured") {
      return invalidRequest(
        verb,
        resolved.reason,
        "The task's list is not in config.lists; register it with init",
        { listId: task.listId },
      );
    }
    return invalidRequest(
      verb,
      resolved.reason,
      `No status is pinned for role "${role}" in the task's list; pin it with init`,
      { listId: task.listId, role },
    );
  }

  /**
   * `clickup_update_task {status}`. A status ClickUp rejects (renamed or removed
   * after init) fails closed as `status_rejected`; any other error is classified.
   * Returns null on success.
   */
  async function writeStatus(
    verb: string,
    task: HomeTask,
    status: string,
  ): Promise<TransportFailure | null> {
    const failed = await updateTask(task.id, { status });
    if (failed === null || !STATUS_REJECTED.test(String(failed.details.message))) return failed;
    return invalidRequest(
      verb,
      "status_rejected",
      "ClickUp rejected the pinned status (renamed or removed after init); run init again",
      { status, listId: task.listId },
    );
  }

  /** `task.move` to a list id: `clickup_move_task`, root tasks only. */
  async function moveToList(
    task: HomeTask,
    listId: string,
  ): Promise<TransportResult<TaskMoveResponse>> {
    const verb = "task.move";
    if (task.listId === listId) return alreadyInState(verb, { listId: task.listId });
    if (task.parentId !== null) {
      return invalidRequest(
        verb,
        "subtask_cannot_move",
        "ClickUp moves root tasks only; move the parent task instead",
      );
    }
    try {
      const resp = await call("clickup_move_task", { task_id: task.id, list_id: listId });
      // `{success, task_id, custom_id, new_list_id}`; fall back to the requested id.
      const reported =
        typeof resp === "object" && resp !== null
          ? (resp as { new_list_id?: unknown }).new_list_id
          : undefined;
      const newListId = typeof reported === "string" && reported !== "" ? reported : listId;
      return {
        ok: true,
        data: { previousListOrSectionId: task.listId, newListOrSectionId: newListId },
      };
    } catch (e) {
      return failure(e);
    }
  }

  return {
    // -------------------------------------------------------------------
    // task.create → clickup_create_task
    //
    // boardOrProjectId = list id; listOrSectionId = initial status name
    // (empty → the list's default). `estimate` is not written here: the
    // estimate goes through task.estimate.set.
    // -------------------------------------------------------------------
    async taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>> {
      const verb = "task.create";
      if (typeof req.boardOrProjectId !== "string" || req.boardOrProjectId.trim() === "") {
        return invalidRequest(verb, "list_required", "boardOrProjectId (the list id) is required");
      }
      // null is treated like an absent dueDate; "" is still invalid.
      if (req.dueDate != null && !isCalendarDate(req.dueDate)) {
        return invalidRequest(
          verb,
          "invalid_due_date",
          "dueDate must start with a calendar date (YYYY-MM-DD)",
        );
      }

      const args: Record<string, unknown> = { list_id: req.boardOrProjectId, name: req.name };
      const status = typeof req.listOrSectionId === "string" ? req.listOrSectionId.trim() : "";
      if (status !== "") args.status = status;
      const description = withClientToken(req.description, req.clientToken);
      if (description.trim() !== "") args.markdown_description = description;
      if (req.labels && req.labels.length > 0) args.tags = req.labels;
      const priority = mapPriority(req.priority);
      if (priority !== undefined) args.priority = priority;
      if (req.dueDate != null) args.due_date = req.dueDate.slice(0, 10);

      try {
        const task = unwrapTask(await call("clickup_create_task", args));
        if (!task) return shapeError(verb);
        return { ok: true, data: { id: task.id, url: task.url ?? taskUrl(task.id) } };
      } catch (e) {
        return failure(e);
      }
    },

    // -------------------------------------------------------------------
    // task.move → clickup_update_task {status} or clickup_move_task
    //
    // open | wip | done (any case) → the status pinned for that role in the
    // task's home list. A digit string of six or more is a destination list
    // id → clickup_move_task (root tasks only). The task is read first; no
    // write when the requested status or list already holds.
    // -------------------------------------------------------------------
    async taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>> {
      const verb = "task.move";
      const noId = missingId(verb, { taskId: req.taskId });
      if (noId) return noId;
      const target =
        typeof req.targetListOrSectionId === "string" ? req.targetListOrSectionId.trim() : "";
      const role = ROLES.get(target.toLowerCase());
      if (role === undefined && !LIST_ID.test(target)) {
        return invalidRequest(
          verb,
          "invalid_target",
          "targetListOrSectionId must be open, wip, done or a numeric list id",
        );
      }

      const read = await readTask(req.taskId, verb);
      if (!read.ok) return read;
      const task = read.data;
      if (role === undefined) return moveToList(task, target);

      const pinned = pinnedStatus(verb, task, role);
      if (!pinned.ok) return pinned;
      if (sameStatus(task.status, pinned.status)) {
        return alreadyInState(verb, { status: pinned.status });
      }
      const failed = await writeStatus(verb, task, pinned.status);
      if (failed) return failed;
      return {
        ok: true,
        data: { previousListOrSectionId: task.status, newListOrSectionId: pinned.status },
      };
    },

    // -------------------------------------------------------------------
    // checklist.check → clickup_update_task {status} on a subtask
    //
    // Checklist items are subtasks: itemId = the subtask, checklistId = its
    // parent. complete → the pinned `done` status, incomplete → `open`. The
    // item is complete when its status is the pinned `done` status.
    // -------------------------------------------------------------------
    async checklistCheck(
      req: ChecklistCheckRequest,
    ): Promise<TransportResult<ChecklistCheckResponse>> {
      const verb = "checklist.check";
      const noId = missingId(verb, { itemId: req.itemId, checklistId: req.checklistId });
      if (noId) return noId;
      if (req.targetState !== "complete" && req.targetState !== "incomplete") {
        return invalidRequest(
          verb,
          "invalid_target_state",
          "targetState must be complete or incomplete",
        );
      }

      const read = await readTask(req.itemId, verb);
      if (!read.ok) return read;
      const item = read.data;
      if (item.parentId !== req.checklistId) {
        return invalidRequest(
          verb,
          "not_a_checklist_item",
          "itemId must be a subtask whose parent is checklistId",
        );
      }

      const done = pinnedStatus(verb, item, "done");
      if (!done.ok) return done;
      const previousState = sameStatus(item.status, done.status) ? "complete" : "incomplete";
      if (previousState === req.targetState) {
        return alreadyInState(verb, { state: previousState });
      }
      const target = req.targetState === "complete" ? done : pinnedStatus(verb, item, "open");
      if (!target.ok) return target;
      const failed = await writeStatus(verb, item, target.status);
      if (failed) return failed;
      return { ok: true, data: { previousState, newState: req.targetState } };
    },

    // -------------------------------------------------------------------
    // task.close → clickup_update_task {status: pinned done}
    //
    // Already at the pinned done status, or at the pinned closed status (a
    // cancelled task is not turned into done) → {closed: true} with no write.
    // closeListOrSectionId is ignored: closing never changes the list.
    // -------------------------------------------------------------------
    async taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>> {
      const verb = "task.close";
      const noId = missingId(verb, { taskId: req.taskId });
      if (noId) return noId;
      const read = await readTask(req.taskId, verb);
      if (!read.ok) return read;
      const task = read.data;

      const done = pinnedStatus(verb, task, "done");
      if (!done.ok) return done;
      const closed = resolveStatus(config, task.listId, "closed");
      const alreadyClosed =
        sameStatus(task.status, done.status) ||
        (closed.ok && sameStatus(task.status, closed.status));
      if (!alreadyClosed) {
        const failed = await writeStatus(verb, task, done.status);
        if (failed) return failed;
      }
      return { ok: true, data: { closed: true } };
    },

    // -------------------------------------------------------------------
    // task.due-date.set → clickup_update_task {due_date: YYYY-MM-DD}
    //
    // ClickUp stores a date-only value at 04:00 local time of the account
    // timezone. The write is skipped when the stored instant's LOCAL date
    // (account offset from clickup_get_user) is the requested date; without a
    // readable offset it writes anyway. A one-hour DST gap cannot move 04:00
    // across midnight. previousDueAt is the stored ISO instant; newDueAt is
    // the date written (YYYY-MM-DD), since ClickUp keeps no time of day.
    // -------------------------------------------------------------------
    async taskDueDateSet(
      req: TaskDueDateSetRequest,
    ): Promise<TransportResult<TaskDueDateSetResponse>> {
      const verb = "task.due-date.set";
      const noId = missingId(verb, { taskId: req.taskId });
      if (noId) return noId;
      if (!isCalendarDate(req.dueAt)) {
        return invalidRequest(
          verb,
          "invalid_due_date",
          "dueAt must start with a calendar date (YYYY-MM-DD)",
        );
      }
      const date = req.dueAt.slice(0, 10);

      const read = await readTask(req.taskId, verb, ["due_date"]);
      if (!read.ok) return read;
      const task = read.data;
      const data = { previousDueAt: task.dueDate, newDueAt: date };
      if (task.dueDate !== null) {
        const offset = await accountOffset();
        if (offset !== null && localDate(task.dueDate, offset) === date) return { ok: true, data };
      }
      const failed = await updateTask(task.id, { due_date: date });
      return failed ?? { ok: true, data };
    },

    // -------------------------------------------------------------------
    // task.assignee.add → clickup_update_task {assignees: current ∪ new}
    //
    // `assignees` replaces the whole set, so the write is the union of
    // the assignees just read and the new id; v1 never removes. A non-numeric
    // userId ("me", an email) is resolved to an id first. Already assigned →
    // {added: false} with no write.
    // -------------------------------------------------------------------
    async taskAssigneeAdd(
      req: TaskAssigneeAddRequest,
    ): Promise<TransportResult<TaskAssigneeAddResponse>> {
      const verb = "task.assignee.add";
      const noId = missingId(verb, { taskId: req.taskId, userId: req.userId });
      if (noId) return noId;
      const user = await resolveAssignee(req.userId.trim());
      if (!user.ok) return user;

      const read = await readTask(req.taskId, verb, ["assignees"]);
      if (!read.ok) return read;
      const current = read.data.assigneeIds;
      if (current.includes(user.data)) {
        return { ok: true, data: { added: false, currentAssigneeIds: current } };
      }
      const assignees = [...current, user.data];
      const failed = await updateTask(read.data.id, { assignees });
      return failed ?? { ok: true, data: { added: true, currentAssigneeIds: assignees } };
    },

    // -------------------------------------------------------------------
    // task.comment.add → clickup_create_comment {entity_type: "task"}
    //
    // With a clientToken the text is posted as `[ct:<token>] <text>`, after a
    // scan of the task's first comments page: a comment already carrying the
    // marker is returned instead of posting again. The attribution
    // prefix, when configured, is already in `text`.
    // -------------------------------------------------------------------
    async taskCommentAdd(
      req: TaskCommentAddRequest,
    ): Promise<TransportResult<TaskCommentAddResponse>> {
      const verb = "task.comment.add";
      const noId = missingId(verb, { taskId: req.taskId });
      if (noId) return noId;
      if (typeof req.text !== "string" || req.text.trim() === "") {
        return invalidRequest(verb, "text_required", "text must be a non-empty comment");
      }
      const marker = req.clientToken ? `[ct:${req.clientToken}]` : undefined;
      const text = marker === undefined ? req.text : `${marker} ${req.text}`;
      if (text.length > COMMENT_MAX_LENGTH) {
        return invalidRequest(
          verb,
          "text_too_long",
          `The comment, with its [ct:] marker, exceeds ${COMMENT_MAX_LENGTH} characters`,
        );
      }

      try {
        if (marker !== undefined) {
          const page = await call("clickup_get_task_comments", { task_id: req.taskId });
          const found = markedComment(page, marker, verb);
          if (!found.ok) return found;
          if (found.data !== null) return { ok: true, data: found.data };
        }
        const resp = await call("clickup_create_comment", {
          entity_type: "task",
          entity_id: req.taskId,
          comment_text: text,
        });
        // `{success, comment_id}`: no timestamp, so the comment was posted now.
        const commentId = isObj(resp) ? idString(resp.comment_id) : undefined;
        if (commentId === undefined) return shapeError(verb);
        return { ok: true, data: { commentId, postedAt: new Date().toISOString() } };
      } catch (e) {
        return failure(e);
      }
    },

    // -------------------------------------------------------------------
    // task.parent.set → clickup_update_task {parent}
    //
    // The server also moves the task into the parent's list; the response
    // type has no field for it, so it is not reported. The MCP cannot
    // clear a parent: a missing parentId is NOT_APPLICABLE. Already under
    // that parent → no write. parentId is trimmed once, before every use.
    // -------------------------------------------------------------------
    async taskParentSet(
      req: TaskParentSetRequest,
    ): Promise<TransportResult<TaskParentSetResponse>> {
      const verb = "task.parent.set";
      const noId = missingId(verb, { taskId: req.taskId });
      if (noId) return noId;
      const requested: unknown = req.parentId;
      const parentId = typeof requested === "string" ? requested.trim() : "";
      if (parentId === "") {
        return notApplicable(
          verb,
          "detach_unsupported",
          "ClickUp cannot turn a subtask back into a top-level task through the MCP",
        );
      }
      if (parentId === req.taskId.trim()) {
        return invalidRequest(verb, "self_parent", "A task cannot be its own parent");
      }

      const read = await readTask(req.taskId, verb);
      if (!read.ok) return read;
      const task = read.data;
      const data = { previousParentId: task.parentId, newParentId: parentId };
      if (task.parentId === parentId) return { ok: true, data };
      const failed = await updateTask(task.id, { parent: parentId });
      return failed ?? { ok: true, data };
    },

    // -------------------------------------------------------------------
    // task.estimate.set → clickup_update_task {time_estimate} + est:<slug> tag
    //
    // On or off: .clickup.json must declare `estimation`, and neither it nor
    // the request config may say `enabled: false` (NOT_APPLICABLE). The
    // request config then drives strategy, clickupTarget, scale, sizeMap and
    // hoursPerDay. The native estimate (whole minutes) is written only when
    // clickupTarget is "time", the strategy yields a time, and the task is a
    // leaf: ClickUp keeps a parent's own estimate, and roll-up views would add
    // its children's to it. The `est:<slug>` tag is always replace-set:
    // every other `est:*` tag is removed, the tag is ensured in the space and
    // added. What the task already holds is not written again. A failure
    // after a write is partial.
    // -------------------------------------------------------------------
    async taskEstimateSet(
      req: ClickUpTaskEstimateSetRequest,
    ): Promise<TransportResult<TaskEstimateSetResponse>> {
      const verb = "task.estimate.set";
      const requested: unknown = req.config;
      if (
        !isObj(config.estimation) ||
        config.estimation.enabled === false ||
        (isObj(requested) && requested.enabled === false)
      ) {
        return notApplicable(
          verb,
          "estimation_disabled",
          "Estimation is disabled: no estimation block in .clickup.json, or enabled is false",
        );
      }
      const noId = missingId(verb, { taskId: req.taskId });
      if (noId) return noId;
      if (!isObj(requested)) {
        return invalidRequest(
          verb,
          "estimation_config_required",
          "config (the estimation block of .clickup.json) is required",
        );
      }
      const { strategy, clickupTarget, scale, sizeMap } = req.config;
      const hoursPerDay: unknown = req.config.hoursPerDay ?? DEFAULT_HOURS_PER_DAY;
      if (typeof hoursPerDay !== "number" || !(hoursPerDay >= 1 && hoursPerDay <= 24)) {
        return invalidRequest(
          verb,
          "invalid_hours_per_day",
          "estimation.hoursPerDay must be a number from 1 to 24",
        );
      }

      // Core's `jiraTarget` is the adapter-local target: "time" or "none".
      const jiraTarget = clickupTarget === "time" ? "time" : "none";
      const result = normalizeEstimate(req.input, { strategy, jiraTarget, scale, sizeMap });
      if (!result.ok) {
        return invalidRequest(verb, "invalid_estimate", "The estimate does not fit the strategy");
      }
      const normalized = result.value;
      const minutes =
        normalized.timeString === undefined
          ? undefined
          : toMinutes(normalized.timeString, hoursPerDay);
      if (minutes !== undefined && !(Number.isSafeInteger(minutes) && minutes > 0)) {
        return invalidRequest(
          verb,
          "invalid_estimate",
          "A time estimate must be a finite duration of at least one minute",
        );
      }
      const tag = `est:${slugify(normalized.humanReadable)}`;
      if (tag === "est:") {
        return invalidRequest(
          verb,
          "invalid_estimate",
          "The estimate has no letter or digit for its tag",
        );
      }

      const read = await readTask(req.taskId, verb, ["tags", "subtasks_count", "space"]);
      if (!read.ok) return read;
      const task = read.data;

      // The writes, in order: the native estimate first, then the tag.
      const steps: Array<[EstimateStep, string, Record<string, unknown>]> = [];
      const timed = jiraTarget === "time" && minutes !== undefined && task.subtaskCount === 0;
      if (timed && task.timeEstimateMs !== minutes * 60_000) {
        steps.push([
          "time_estimate",
          "clickup_update_task",
          { task_id: task.id, time_estimate: String(minutes) },
        ]);
      }
      // ClickUp stores tag names lowercased and removes them ignoring case.
      const estTags = task.tagNames.filter((name) => name.toLowerCase().startsWith("est:"));
      for (const name of estTags) {
        if (name.toLowerCase() === tag) continue;
        steps.push([
          "tag_remove",
          "clickup_remove_tag_from_task",
          { task_id: task.id, tag_name: name },
        ]);
      }
      if (!estTags.some((name) => name.toLowerCase() === tag)) {
        steps.push(
          ["tag_create", "clickup_create_space_tag", { space_id: task.spaceId, name: tag }],
          ["tag_add", "clickup_add_tag_to_task", { task_id: task.id, tag_name: tag }],
        );
      }

      const applied: EstimateStep[] = [];
      for (const [step, tool, args] of steps) {
        try {
          await call(tool, args);
        } catch (e) {
          return stepFailure(failure(e), applied, step);
        }
        if (!applied.includes(step)) applied.push(step);
      }
      return { ok: true, data: { normalized, fieldWritten: timed ? "time_estimate" : null } };
    },
  };
}
