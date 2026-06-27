/**
 * Jira MCP transport — implements the @llodev/pm-tasks-core Transport
 * interface by dispatching every canonical verb through
 * `mcp__atlassian__*` tool calls. The MCP dispatcher is injected
 * (caller-supplied callback) so this module stays:
 *
 *   - testable           — tests inject a recording stub
 *   - side-effect free   — `import` does not throw, log, or call anything
 *   - decoupled at build — no `mcp__*` symbols are referenced at compile time
 *
 * Jira-specific deltas vs Asana/Trello transports:
 *   - `cloudId`, `projectKey`, and `issueTypes` come from the factory-time
 *     `config` argument (closed over by every verb). `req.boardOrProjectId`
 *     and `req.listOrSectionId` are intentionally IGNORED — Jira identity
 *     is fully determined by the config that was validated at adapter-init
 *     time; requests carry these fields only for Transport-interface compat.
 *   - `taskMove` / `taskClose` both run a two-call "transition engine":
 *     `getTransitionsForJiraIssue` → match by `statusCategory.key` →
 *     `transitionJiraIssue`. This is locale-safe (status names vary by
 *     workspace language; category keys are stable).
 *   - `checklistCheck` models checklist items as Subtasks: complete=create+
 *     transition-to-done; incomplete=transition-to-new.
 *   - `taskDueDateSet` skips gracefully when Jira signals that the field is
 *     not applicable (Subtask semantics) via error-string matching.
 *   - `taskAssigneeAdd` has an accountId fast-path: if `userId` already
 *     looks like an Atlassian accountId it skips the lookup call.
 *   - `taskCommentAdd` always passes `markdown: true` — load-bearing;
 *     Atlassian MCP renders body as ADF when false.
 *   - F3 (`task.parent.set`) and F7 (`task.estimate.set`) are NOT
 *     implemented here — Phase 4 only.
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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * MCP-call dispatcher. The agent runtime that loads this transport
 * provides a function that proxies to the real `mcp__atlassian__*`
 * tools. Tests inject a recording stub.
 */
export type McpCaller = (toolName: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * Jira workspace/project identity — NOT exported; adapter.ts narrows from
 * the parsed `.jira.json` config. Transport closes over these values at
 * factory time so that no verb needs to read them from the request.
 */
interface JiraConfig {
  site: { cloudId: string };
  project: { key: string };
  /** canonical key → locale name, e.g. { task: "Tarefa", subtask: "Subtarefa" } */
  issueTypes: Record<string, string>;
}

export interface CreateJiraTransportOptions {
  mcp: McpCaller;
  config: JiraConfig;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isObjectWith<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === "object" && value !== null && key in value;
}

/**
 * Classify a thrown error into a TransportErrorCode.
 * Mirrors the pattern used by transport-asana / transport-trello.
 */
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
    details: { message: "Jira MCP returned unexpected response shape", verb },
  };
}

/**
 * Resolve the Jira transition id that moves an issue into the given
 * status category.
 *
 * @param mcp       - injected MCP caller
 * @param cloudId   - Atlassian cloud id
 * @param issueKey  - e.g. "KAN-1"
 * @param categoryKey - stable Jira category: "new" | "indeterminate" | "done"
 * @returns `{ id, toStatusId }` where `id` is the transitionId and
 *          `toStatusId` is the resulting status id.
 * @throws Error with message starting `TRANSITION_NOT_FOUND:<key>:<category>`
 *         when no transition exists for the category.
 * @throws Error with generic message when the MCP response is malformed.
 */
async function resolveTransition(
  mcp: McpCaller,
  cloudId: string,
  issueKey: string,
  categoryKey: string,
): Promise<{ id: string; toStatusId: string }> {
  const result = await mcp("getTransitionsForJiraIssue", { cloudId, issueKey });

  if (!isObjectWith(result, "transitions") || !Array.isArray(result.transitions)) {
    throw new Error("Jira MCP: getTransitionsForJiraIssue returned unexpected shape");
  }

  const transitions = result.transitions as Array<Record<string, unknown>>;
  const match = transitions.find((t) => {
    return (
      isObjectWith(t, "to") &&
      isObjectWith(t.to, "statusCategory") &&
      isObjectWith((t.to as Record<string, unknown>).statusCategory, "key") &&
      ((t.to as Record<string, unknown>).statusCategory as Record<string, unknown>).key ===
        categoryKey
    );
  });

  if (!match) {
    throw new Error(`TRANSITION_NOT_FOUND:${issueKey}:${categoryKey}`);
  }

  const toObj = match.to as Record<string, unknown>;
  const id = typeof match.id === "string" ? match.id : String(match.id);
  const toStatusId = typeof toObj.id === "string" ? toObj.id : String(toObj.id);

  return { id, toStatusId };
}

/** Atlassian accountId fast-path — covers both legacy and modern UUID formats. */
const ACCOUNT_ID_RE = /^[0-9a-f]{24}:|^[0-9]+:[0-9a-f-]{36}/i;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createJiraTransport(opts: CreateJiraTransportOptions): Transport {
  const { mcp, config } = opts;
  const cloudId = config.site.cloudId;
  const projectKey = config.project.key;

  return {
    // -------------------------------------------------------------------
    // 1. task.create → mcp__atlassian__createJiraIssue
    //
    // req.boardOrProjectId and req.listOrSectionId are intentionally
    // IGNORED — identity is fully determined by the factory-time config
    // (cloudId + projectKey). These fields exist only for Transport compat.
    // -------------------------------------------------------------------
    async taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>> {
      const issueTypeName = config.issueTypes["task"] ?? "Task";
      const description = req.clientToken
        ? `${req.description ?? ""}\n\n[ct:${req.clientToken}]`.trimStart()
        : (req.description ?? "");

      try {
        const resp = await mcp("createJiraIssue", {
          cloudId,
          projectKey,
          issueTypeName,
          summary: req.name,
          description,
        });

        if (!isObjectWith(resp, "key") || typeof resp.key !== "string") {
          return shapeError("task.create");
        }

        const url =
          isObjectWith(resp, "url") && typeof resp.url === "string" ? resp.url : undefined;

        return { ok: true, data: { id: resp.key, ...(url !== undefined ? { url } : {}) } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 2. task.move → getTransitionsForJiraIssue + transitionJiraIssue
    //
    // req.targetListOrSectionId carries the target status category key:
    // "new" | "indeterminate" | "done".
    // req.boardOrProjectId is intentionally IGNORED (see task.create note).
    // previousListOrSectionId is null — no pre-read getJiraIssue in Phase 3.
    // -------------------------------------------------------------------
    async taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>> {
      try {
        const { id, toStatusId } = await resolveTransition(
          mcp,
          cloudId,
          req.taskId,
          req.targetListOrSectionId,
        );
        await mcp("transitionJiraIssue", { cloudId, issueKey: req.taskId, transitionId: id });
        return {
          ok: true,
          data: { previousListOrSectionId: null, newListOrSectionId: toStatusId },
        };
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("TRANSITION_NOT_FOUND:")) {
          return {
            ok: false,
            code: "NOT_FOUND",
            details: { message: e.message, taskId: req.taskId },
          };
        }
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 3. checklist.check → createJiraIssue (Subtask) + transition
    //
    // Jira has no native checklist; items are modelled as Subtasks.
    // Request field semantics (Jira-specific):
    //   req.taskId      = parent issue key (e.g. "KAN-1")
    //   req.checklistId = ignored at transport level (no checklist object)
    //   req.itemId      = when complete: Subtask summary text
    //                     when incomplete: Subtask issue key (e.g. "KAN-2")
    //
    // Adapter / SKILL layer is responsible for passing the correct value
    // in req.itemId. Transport does not validate issue-key format.
    // -------------------------------------------------------------------
    async checklistCheck(
      req: ChecklistCheckRequest,
    ): Promise<TransportResult<ChecklistCheckResponse>> {
      try {
        if (req.targetState === "complete") {
          // Create Subtask then transition it to done
          const issueTypeName = config.issueTypes["subtask"] ?? "Subtask";
          const created = await mcp("createJiraIssue", {
            cloudId,
            projectKey,
            issueTypeName,
            summary: req.itemId,
            parent: req.taskId,
          });

          if (!isObjectWith(created, "key") || typeof created.key !== "string") {
            return shapeError("checklist.check");
          }

          const subtaskKey = created.key;
          const { id } = await resolveTransition(mcp, cloudId, subtaskKey, "done");
          await mcp("transitionJiraIssue", { cloudId, issueKey: subtaskKey, transitionId: id });

          return { ok: true, data: { previousState: "incomplete", newState: "complete" } };
        } else {
          // incomplete: req.itemId is the Subtask issue key to reopen
          const { id } = await resolveTransition(mcp, cloudId, req.itemId, "new");
          await mcp("transitionJiraIssue", { cloudId, issueKey: req.itemId, transitionId: id });

          return { ok: true, data: { previousState: "complete", newState: "incomplete" } };
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("TRANSITION_NOT_FOUND:")) {
          return {
            ok: false,
            code: "NOT_FOUND",
            details: { message: e.message, taskId: req.taskId },
          };
        }
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 4. task.close → shared transition engine (hardcoded "done" category)
    //
    // Same two-call sequence as taskMove. previousListOrSectionId is null.
    // -------------------------------------------------------------------
    async taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>> {
      try {
        const { id, toStatusId } = await resolveTransition(mcp, cloudId, req.taskId, "done");
        await mcp("transitionJiraIssue", { cloudId, issueKey: req.taskId, transitionId: id });
        return { ok: true, data: { closed: true, movedToListOrSectionId: toStatusId } };
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("TRANSITION_NOT_FOUND:")) {
          return {
            ok: false,
            code: "NOT_FOUND",
            details: { message: e.message, taskId: req.taskId },
          };
        }
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 5. task.due-date.set → editJiraIssue {duedate: YYYY-MM-DD}
    //
    // req.dueAt is ISO 8601; Jira's duedate field requires YYYY-MM-DD.
    // Subtask skip is error-driven (no pre-read getJiraIssue): if Jira
    // signals the field is not applicable, return NOT_APPLICABLE.
    //
    // Atlassian MCP error strings as of 2026-06-26 (matched substrings):
    //   "duedate" + "not applicable"
    //   "duedate" + "is not a valid field"
    //   "duedate" + "does not support"
    // -------------------------------------------------------------------
    async taskDueDateSet(
      req: TaskDueDateSetRequest,
    ): Promise<TransportResult<TaskDueDateSetResponse>> {
      if (typeof req.dueAt !== "string" || req.dueAt.length < 10) {
        return {
          ok: false,
          code: "INVALID_REQUEST",
          details: { message: "dueAt must be ISO 8601", verb: "taskDueDateSet" },
        };
      }

      const duedate = req.dueAt.slice(0, 10);

      try {
        await mcp("editJiraIssue", {
          cloudId,
          issueKey: req.taskId,
          fields: { duedate },
        });
        return { ok: true, data: { previousDueAt: null, newDueAt: duedate } };
      } catch (e) {
        if (e instanceof Error) {
          const msg = e.message.toLowerCase();
          if (
            msg.includes("duedate") &&
            (msg.includes("not applicable") ||
              msg.includes("is not a valid field") ||
              msg.includes("does not support"))
          ) {
            return {
              ok: false,
              code: "NOT_APPLICABLE",
              details: { reason: "subtask_no_duedate", taskId: req.taskId },
            };
          }
        }
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 6. task.assignee.add → lookupJiraAccountId + editJiraIssue
    //
    // req.userId is either:
    //   - an Atlassian accountId (matches ACCOUNT_ID_RE) → skip lookup
    //   - a display name / email → lookup via lookupJiraAccountId
    // -------------------------------------------------------------------
    async taskAssigneeAdd(
      req: TaskAssigneeAddRequest,
    ): Promise<TransportResult<TaskAssigneeAddResponse>> {
      try {
        let accountId: string;

        if (ACCOUNT_ID_RE.test(req.userId)) {
          // Fast-path: caller already passed an accountId
          accountId = req.userId;
        } else {
          const lookup = await mcp("lookupJiraAccountId", { query: req.userId });
          if (!isObjectWith(lookup, "accountId") || typeof lookup.accountId !== "string") {
            return shapeError("task.assignee.add");
          }
          accountId = lookup.accountId;
        }

        await mcp("editJiraIssue", {
          cloudId,
          issueKey: req.taskId,
          fields: { assignee: { accountId } },
        });

        return { ok: true, data: { added: true, currentAssigneeIds: [accountId] } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 7. task.comment.add → addCommentToJiraIssue
    //
    // markdown: true is LOAD-BEARING — Atlassian MCP renders body as ADF
    // when false (incompatible with markdown input from SKILL layer).
    // -------------------------------------------------------------------
    async taskCommentAdd(
      req: TaskCommentAddRequest,
    ): Promise<TransportResult<TaskCommentAddResponse>> {
      try {
        const resp = await mcp("addCommentToJiraIssue", {
          cloudId,
          issueKey: req.taskId,
          body: req.text,
          markdown: true,
        });

        if (
          !isObjectWith(resp, "id") ||
          typeof resp.id !== "string" ||
          !isObjectWith(resp, "created") ||
          typeof resp.created !== "string"
        ) {
          return shapeError("task.comment.add");
        }

        return { ok: true, data: { commentId: resp.id, postedAt: resp.created } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },
  };
}
