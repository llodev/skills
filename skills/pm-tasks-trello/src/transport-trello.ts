/**
 * Trello MCP transport — implements the @llodev/pm-tasks-core Transport
 * interface by dispatching every canonical verb through `mcp__trello__*`
 * tool calls. The MCP dispatcher is injected (caller-supplied callback,
 * matching the established `probeMCP` pattern in
 * pm-tasks-core/src/init-lib.ts) so this module stays:
 *
 *   - testable           — tests inject a recording stub
 *   - side-effect free   — `import` does not throw, log, or call anything
 *   - decoupled at build — no `mcp__*` symbols are referenced at compile time
 *
 * Verb mappings follow `pm-tasks-trello/references/operations.md` verbatim.
 * Idempotency fetches stay at the handler / Phase 5 hook layer per the
 * Phase 2 contract; this transport is a thin dispatcher that classifies
 * MCP errors into TransportErrorCode and wraps each result in a typed
 * TransportResult<T> envelope.
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
import { mapWithConcurrency } from "./concurrency.js";
import type { ChecklistInput, ChecklistResult } from "./batch.js";

/**
 * MCP-call dispatcher. The agent runtime that loads this transport
 * provides a function that proxies to the real `mcp__trello__*` tools.
 * Tests inject a recording stub.
 */
export type McpCaller = (toolName: string, args: Record<string, unknown>) => Promise<unknown>;

export interface CreateTrelloTransportOptions {
  mcp: McpCaller;
}

/** Trello transport plus Trello-only extension methods (F13). Not part of core Transport. */
export type TrelloTransport = Transport & {
  createChecklists(
    cardId: string,
    checklists: readonly ChecklistInput[],
    concurrency?: number,
  ): Promise<TransportResult<ChecklistResult[]>>;
};

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
    details: { message: "Trello MCP returned unexpected response shape", verb },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTrelloTransport(opts: CreateTrelloTransportOptions): TrelloTransport {
  const { mcp } = opts;

  return {
    // -------------------------------------------------------------------
    // 1. task.create → mcp__trello__create_card
    // -------------------------------------------------------------------
    async taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>> {
      const desc = req.clientToken
        ? `[ct:${req.clientToken}] ${req.description ?? ""}`.trim()
        : req.description;
      const args: Record<string, unknown> = {
        idList: req.listOrSectionId,
        name: req.name,
        desc,
      };
      if (req.dueDate !== undefined) args.due = req.dueDate;
      try {
        const resp = await mcp("mcp__trello__create_card", args);
        if (!isObjectWith(resp, "id") || typeof resp.id !== "string") {
          return shapeError("task.create");
        }
        let url: string | undefined;
        if (isObjectWith(resp, "url") && typeof resp.url === "string") {
          url = resp.url;
        } else if (isObjectWith(resp, "shortLink") && typeof resp.shortLink === "string") {
          url = `https://trello.com/c/${resp.shortLink}`;
        }
        return { ok: true, data: { id: resp.id, ...(url !== undefined ? { url } : {}) } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 2. task.move → mcp__trello__move_card
    // -------------------------------------------------------------------
    async taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>> {
      try {
        await mcp("mcp__trello__move_card", {
          cardId: req.taskId,
          idList: req.targetListOrSectionId,
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
    // 3. checklist.check → mcp__trello__trello_update_check_item
    // -------------------------------------------------------------------
    async checklistCheck(
      req: ChecklistCheckRequest,
    ): Promise<TransportResult<ChecklistCheckResponse>> {
      try {
        await mcp("mcp__trello__trello_update_check_item", {
          cardId: req.taskId,
          checkItemId: req.itemId,
          state: req.targetState === "complete" ? "complete" : "incomplete",
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
    // 4. task.close → mcp__trello__update_card (+ mcp__trello__move_card)
    // -------------------------------------------------------------------
    async taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>> {
      // Call A — mark dueComplete
      try {
        await mcp("mcp__trello__update_card", { id: req.taskId, dueComplete: true });
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }

      // Call B — optional move
      if (req.closeListOrSectionId !== undefined) {
        try {
          await mcp("mcp__trello__move_card", {
            cardId: req.taskId,
            idList: req.closeListOrSectionId,
          });
        } catch (e) {
          // Partial failure: card IS dueComplete but failed to move
          const inner = e instanceof Error ? e.message : String(e);
          return {
            ok: false,
            code: "MCP_ERROR",
            details: { phase: "move", message: inner },
          };
        }
        return {
          ok: true,
          data: { closed: true, movedToListOrSectionId: req.closeListOrSectionId },
        };
      }

      return { ok: true, data: { closed: true } };
    },

    // -------------------------------------------------------------------
    // 5. task.due-date.set → mcp__trello__update_card
    // -------------------------------------------------------------------
    async taskDueDateSet(
      req: TaskDueDateSetRequest,
    ): Promise<TransportResult<TaskDueDateSetResponse>> {
      try {
        await mcp("mcp__trello__update_card", { id: req.taskId, due: req.dueAt });
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
    // 6. task.assignee.add → mcp__trello__trello_add_member_to_card
    // -------------------------------------------------------------------
    async taskAssigneeAdd(
      req: TaskAssigneeAddRequest,
    ): Promise<TransportResult<TaskAssigneeAddResponse>> {
      try {
        const resp = await mcp("mcp__trello__trello_add_member_to_card", {
          cardId: req.taskId,
          memberId: req.userId,
        });
        let currentAssigneeIds: string[] = [req.userId];
        if (isObjectWith(resp, "idMembers") && Array.isArray(resp.idMembers)) {
          const ids = resp.idMembers.filter((m): m is string => typeof m === "string");
          if (ids.length > 0) currentAssigneeIds = ids;
        }
        return {
          ok: true,
          data: { added: true, currentAssigneeIds },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 7. task.comment.add → mcp__trello__trello_add_comment
    // -------------------------------------------------------------------
    async taskCommentAdd(
      req: TaskCommentAddRequest,
    ): Promise<TransportResult<TaskCommentAddResponse>> {
      const text = req.clientToken ? `[ct:${req.clientToken}] ${req.text}` : req.text;
      try {
        const resp = await mcp("mcp__trello__trello_add_comment", {
          cardId: req.taskId,
          text,
        });
        if (!isObjectWith(resp, "id") || typeof resp.id !== "string") {
          return shapeError("task.comment.add");
        }
        const postedAt =
          isObjectWith(resp, "date") && typeof resp.date === "string"
            ? resp.date
            : new Date().toISOString();
        return {
          ok: true,
          data: { commentId: resp.id, postedAt },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // F13. createChecklists (Trello extension) →
    //   mcp__trello__trello_create_checklist + trello_create_check_item
    //   Two-phase so in-flight calls per phase stay ≤ `concurrency`.
    // -------------------------------------------------------------------
    async createChecklists(
      cardId: string,
      checklists: readonly ChecklistInput[],
      concurrency = 8,
    ): Promise<TransportResult<ChecklistResult[]>> {
      try {
        // Phase 1 — create every checklist (parallel, capped).
        const created = await mapWithConcurrency(checklists, concurrency, async (cl) => {
          const resp = await mcp("mcp__trello__trello_create_checklist", { cardId, name: cl.name });
          if (!isObjectWith(resp, "id") || typeof resp.id !== "string") {
            throw new Error("Trello create_checklist returned no id");
          }
          return { id: resp.id, name: cl.name, itemNames: cl.items };
        });

        // Phase 2 — create all items across all checklists (flattened, capped).
        const flat = created.flatMap((c) =>
          c.itemNames.map((name) => ({ checklistId: c.id, name })),
        );
        const itemRefs = await mapWithConcurrency(flat, concurrency, async (it) => {
          const ir = await mcp("mcp__trello__trello_create_check_item", {
            checklistId: it.checklistId,
            name: it.name,
          });
          if (!isObjectWith(ir, "id") || typeof ir.id !== "string") {
            throw new Error("Trello create_check_item returned no id");
          }
          return { checklistId: it.checklistId, id: ir.id, name: it.name };
        });

        // Regroup items under their checklist, preserving order.
        const data: ChecklistResult[] = created.map((c) => ({
          id: c.id,
          name: c.name,
          items: itemRefs
            .filter((r) => r.checklistId === c.id)
            .map((r) => ({ id: r.id, name: r.name })),
        }));
        return { ok: true, data };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },
  };
}
