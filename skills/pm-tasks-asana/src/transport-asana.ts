/**
 * Asana MCP transport — implements the @llodev/pm-tasks-core Transport
 * interface by dispatching every canonical verb through
 * `mcp__claude_ai_Asana__*` tool calls. The MCP dispatcher is injected
 * (caller-supplied callback, matching the established `probeMCP` pattern in
 * pm-tasks-core/src/init-lib.ts) so this module stays:
 *
 *   - testable           — tests inject a recording stub
 *   - side-effect free   — `import` does not throw, log, or call anything
 *   - decoupled at build — no `mcp__*` symbols are referenced at compile time
 *
 * Verb mappings follow `pm-tasks-asana/references/operations.md` verbatim.
 * Idempotency fetches stay at the handler / Phase 5 hook layer per the
 * Phase 2 contract; this transport is a thin dispatcher that classifies
 * MCP errors into TransportErrorCode and wraps each result in a typed
 * TransportResult<T> envelope.
 *
 * Asana-specific deltas vs the Trello transport:
 *   - Five of seven verbs route through `update_tasks` (Asana's general
 *     batch update endpoint) — the `updates: [{ task, ...fields }]` shape
 *     is uniform across move / checklist.check / close / due-date / assignee.
 *   - `taskClose` is single-call: the visual "move to Done" is a separate
 *     caller-driven `task.move` per operations.md L12. `closeListOrSectionId`
 *     is IGNORED at the transport layer; the response data omits
 *     `movedToListOrSectionId` entirely.
 *   - `taskDueDateSet` converts ISO 8601 → `YYYY-MM-DD` via `.slice(0,10)`
 *     because Asana's `due_on` field rejects full timestamps. Malformed
 *     input short-circuits to `INVALID_REQUEST` BEFORE the MCP call.
 *   - `taskAssigneeAdd` sets the single primary `assignee` field; multi-
 *     followers semantics are deferred to handler / Phase 5 hooks per
 *     operations.md L14 simplification.
 */

import type {
  Transport,
  TransportResult,
  TransportErrorCode,
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
} from "@llodev/pm-tasks-core/runtime";

/**
 * MCP-call dispatcher. The agent runtime that loads this transport
 * provides a function that proxies to the real `mcp__claude_ai_Asana__*`
 * tools. Tests inject a recording stub.
 */
export type McpCaller = (toolName: string, args: Record<string, unknown>) => Promise<unknown>;

export interface CreateAsanaTransportOptions {
  mcp: McpCaller;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isObjectWith<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === "object" && value !== null && key in value;
}

function classifyError(e: unknown): { code: TransportErrorCode; details: Record<string, unknown> } {
  if (!(e instanceof Error)) return { code: "MCP_ERROR", details: { message: String(e) } };
  const msg = e.message.toLowerCase();
  if (msg.includes("not found") || msg.includes("404")) {
    return { code: "NOT_FOUND", details: { message: e.message } };
  }
  if (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden")
  ) {
    return { code: "AUTH_ERROR", details: { message: e.message } };
  }
  if (msg.includes("429") || msg.includes("rate limit")) {
    return { code: "RATE_LIMITED", details: { message: e.message } };
  }
  return { code: "MCP_ERROR", details: { message: e.message } };
}

function shapeError(verb: string): {
  ok: false;
  code: TransportErrorCode;
  details: Record<string, unknown>;
} {
  return {
    ok: false,
    code: "MCP_ERROR",
    details: { message: "Asana MCP returned unexpected response shape", verb },
  };
}

/**
 * Validate ISO 8601 prefix `YYYY-MM-DD` and return the date portion.
 * Returns null when the input is empty or doesn't start with that shape.
 * Asana's `due_on` field accepts only `YYYY-MM-DD`, not full timestamps.
 */
function isoToDueOn(input: string): string | null {
  if (typeof input !== "string" || input.length < 10) return null;
  const head = input.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(head)) return null;
  return head;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAsanaTransport(opts: CreateAsanaTransportOptions): Transport {
  const { mcp } = opts;

  return {
    // -------------------------------------------------------------------
    // 1. task.create → mcp__claude_ai_Asana__create_tasks
    // -------------------------------------------------------------------
    async taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>> {
      const notes = req.clientToken
        ? `[ct:${req.clientToken}] ${req.description ?? ""}`.trim()
        : req.description;
      const taskPayload: Record<string, unknown> = {
        name: req.name,
        memberships: [{ project: req.boardOrProjectId, section: req.listOrSectionId }],
      };
      if (notes !== undefined) taskPayload.notes = notes;
      if (req.dueDate !== undefined) {
        const dueOn = isoToDueOn(req.dueDate);
        if (dueOn === null) {
          return {
            ok: false,
            code: "INVALID_REQUEST",
            details: { message: "dueDate must be ISO 8601", verb: "taskCreate" },
          };
        }
        taskPayload.due_on = dueOn;
      }
      try {
        const resp = await mcp("mcp__claude_ai_Asana__create_tasks", { tasks: [taskPayload] });
        if (!isObjectWith(resp, "tasks") || !Array.isArray(resp.tasks) || resp.tasks.length === 0) {
          return shapeError("task.create");
        }
        const first: unknown = resp.tasks[0];
        if (!isObjectWith(first, "gid") || typeof first.gid !== "string") {
          return shapeError("task.create");
        }
        let url: string | undefined;
        if (isObjectWith(first, "permalink_url") && typeof first.permalink_url === "string") {
          url = first.permalink_url;
        }
        return { ok: true, data: { id: first.gid, ...(url !== undefined ? { url } : {}) } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 2. task.move → mcp__claude_ai_Asana__update_tasks
    // -------------------------------------------------------------------
    async taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>> {
      try {
        await mcp("mcp__claude_ai_Asana__update_tasks", {
          updates: [
            {
              task: req.taskId,
              memberships: [{ project: "", section: req.targetListOrSectionId }],
            },
          ],
        });
        return {
          ok: true,
          data: {
            previousListOrSectionId: null,
            newListOrSectionId: req.targetListOrSectionId,
          },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 3. checklist.check → mcp__claude_ai_Asana__update_tasks (subtask)
    // -------------------------------------------------------------------
    async checklistCheck(
      req: ChecklistCheckRequest,
    ): Promise<TransportResult<ChecklistCheckResponse>> {
      try {
        await mcp("mcp__claude_ai_Asana__update_tasks", {
          updates: [{ task: req.itemId, completed: req.targetState === "complete" }],
        });
        const previousState: "complete" | "incomplete" =
          req.targetState === "complete" ? "incomplete" : "complete";
        return {
          ok: true,
          data: { previousState, newState: req.targetState },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 4. task.close → mcp__claude_ai_Asana__update_tasks (single-call)
    //   closeListOrSectionId is IGNORED for Asana — visual move is a
    //   separate caller-driven task.move per operations.md L12.
    // -------------------------------------------------------------------
    async taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>> {
      try {
        await mcp("mcp__claude_ai_Asana__update_tasks", {
          updates: [{ task: req.taskId, completed: true }],
        });
        return { ok: true, data: { closed: true } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 5. task.due-date.set → mcp__claude_ai_Asana__update_tasks
    //   Converts ISO 8601 → YYYY-MM-DD (Asana's due_on shape).
    //   Malformed input short-circuits to INVALID_REQUEST.
    // -------------------------------------------------------------------
    async taskDueDateSet(
      req: TaskDueDateSetRequest,
    ): Promise<TransportResult<TaskDueDateSetResponse>> {
      const dueOn = isoToDueOn(req.dueAt);
      if (dueOn === null) {
        return {
          ok: false,
          code: "INVALID_REQUEST",
          details: { message: "dueAt must be ISO 8601", verb: "taskDueDateSet" },
        };
      }
      try {
        await mcp("mcp__claude_ai_Asana__update_tasks", {
          updates: [{ task: req.taskId, due_on: dueOn }],
        });
        return {
          ok: true,
          data: { previousDueAt: null, newDueAt: req.dueAt },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 6. task.assignee.add → mcp__claude_ai_Asana__update_tasks
    //   Single-assignee model at this layer; multi-followers deferred
    //   to handler / Phase 5 hooks per operations.md L14.
    // -------------------------------------------------------------------
    async taskAssigneeAdd(
      req: TaskAssigneeAddRequest,
    ): Promise<TransportResult<TaskAssigneeAddResponse>> {
      try {
        await mcp("mcp__claude_ai_Asana__update_tasks", {
          updates: [{ task: req.taskId, assignee: req.userId }],
        });
        return {
          ok: true,
          data: { added: true, currentAssigneeIds: [req.userId] },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 7. task.comment.add → mcp__claude_ai_Asana__add_comment
    // -------------------------------------------------------------------
    async taskCommentAdd(
      req: TaskCommentAddRequest,
    ): Promise<TransportResult<TaskCommentAddResponse>> {
      const text = req.clientToken ? `[ct:${req.clientToken}] ${req.text}` : req.text;
      try {
        const resp = await mcp("mcp__claude_ai_Asana__add_comment", {
          task: req.taskId,
          text,
        });
        if (!isObjectWith(resp, "gid") || typeof resp.gid !== "string") {
          return shapeError("task.comment.add");
        }
        const postedAt =
          isObjectWith(resp, "created_at") && typeof resp.created_at === "string"
            ? resp.created_at
            : new Date().toISOString();
        return {
          ok: true,
          data: { commentId: resp.gid, postedAt },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },
  };
}
