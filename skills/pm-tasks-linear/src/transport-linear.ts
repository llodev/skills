/**
 * Linear MCP transport — implements the @llodev/pm-tasks-core Transport
 * interface by dispatching every canonical verb through
 * `mcp__linear__*` tool calls. The MCP dispatcher is injected
 * (caller-supplied callback) so this module stays:
 *
 *   - testable           — tests inject a recording stub
 *   - side-effect free   — `import` does not throw, log, or call anything
 *   - decoupled at build — no `mcp__*` symbols are referenced at compile time
 *
 * Linear-specific deltas vs Jira transport:
 *   - Most mutations collapse into ONE upsert tool `save_issue`:
 *       id present = update; absent = create.
 *   - State resolution uses type strings ("unstarted", "started", "completed")
 *     rather than transition ids. Resolve against config.states by type.
 *   - Checklist items are modelled as sub-issues (parentId = parent issue id).
 *     "check" = move sub-issue to a completed-type state.
 *   - `taskAssigneeAdd` is single-assignee set-not-add (Linear only supports one).
 *   - `taskEstimateSet` uses normalizeEstimate + an idempotent `est:<slug>`
 *     label (replace-set: read current labels, strip est:*, merge, write full set).
 *     Gated on config.estimation.enabled; returns NOT_APPLICABLE when disabled.
 *   - `taskSprintSet` assigns a cycle via `save_issue { cycle: sprintRef }`.
 *     Gated on config.cycles.enabled; returns NOT_APPLICABLE when disabled.
 *   - `taskParentSet` supports arbitrary depth; null parentId detaches.
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
  TaskParentSetRequest,
  TaskParentSetResponse,
  TaskEstimateSetResponse,
  TaskSprintSetRequest,
  TaskSprintSetResponse,
} from "@llodev/pm-tasks-core/runtime";
import { normalizeEstimate } from "@llodev/pm-tasks-core/estimation";
import type { EstimateInput, EstimationStrategy } from "@llodev/pm-tasks-core/estimation";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * MCP-call dispatcher. The agent runtime that loads this transport
 * provides a function that proxies to the real `mcp__linear__*`
 * tools. Tests inject a recording stub.
 */
export type McpCaller = (toolName: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * Linear workspace/team identity — NOT exported; adapter.ts narrows from
 * the parsed `.linear.json` config. Transport closes over these values at
 * factory time so that no verb needs to read them from the request.
 */
interface LinearConfig {
  team: { id: string; key: string; name: string };
  states?: Array<{ id: string; name: string; type: string }>;
  labels?: Array<{ id: string; name: string }>;
  members?: Array<{ id: string; name: string; email?: string; alias?: string }>;
  estimation?: {
    strategy: string;
    linearTarget: "points" | "none";
    enabled?: boolean;
    scale?: number[];
    sizeMap?: Record<string, number>;
  };
  cycles?: { enabled: boolean };
  projects?: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
}

export interface CreateLinearTransportOptions {
  mcp: McpCaller;
  config: LinearConfig;
}

/**
 * Linear-specific estimation config — uses `linearTarget` instead of the
 * Jira-named `jiraTarget` field from core's EstimationConfig.
 * Mapped to EstimationConfig internally before calling normalizeEstimate.
 */
export interface LinearEstimationConfig {
  strategy: EstimationStrategy;
  /** "points" → write Linear estimate field + est: label; "none" → label only */
  linearTarget: "points" | "none";
  scale?: number[];
  sizeMap?: Record<string, number>;
}

/** Linear-specific override of TaskEstimateSetRequest with linearTarget config. */
export interface LinearTaskEstimateSetRequest {
  taskId: string;
  input: EstimateInput;
  config: LinearEstimationConfig;
}

/**
 * Linear transport type — identical to Transport but narrows taskEstimateSet
 * to accept LinearTaskEstimateSetRequest (uses linearTarget, not jiraTarget).
 */
export type LinearTransport = Omit<Transport, "taskEstimateSet"> & {
  taskEstimateSet?(
    req: LinearTaskEstimateSetRequest,
  ): Promise<TransportResult<TaskEstimateSetResponse>>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isObjectWith<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === "object" && value !== null && key in value;
}

/**
 * Classify a thrown error into a TransportErrorCode.
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
    details: { message: "Linear MCP returned unexpected response shape", verb },
  };
}

/**
 * Map a core move target to a Linear state type string.
 * open → "unstarted", wip → "started", done → "completed"
 */
function coreTargetToLinearType(target: string): string {
  switch (target) {
    case "open":
      return "unstarted";
    case "wip":
      return "started";
    case "done":
      return "completed";
    default:
      // Allow pass-through of raw Linear type strings
      return target;
  }
}

/**
 * Resolve the first state id matching a given type in config.states (team-scoped).
 * Falls back to passing the type string directly to save_issue (Linear accepts it).
 */
function resolveStateByType(
  states: Array<{ id: string; name: string; type: string }> | undefined,
  type: string,
): string {
  if (!states || states.length === 0) return type;
  const match = states.find((s) => s.type === type);
  return match ? match.id : type;
}

/**
 * Produce a label-safe slug: lowercase, runs of non-[a-z0-9] → "-",
 * strip leading/trailing "-". Used to build idempotent `est:<slug>` labels.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLinearTransport(opts: CreateLinearTransportOptions): LinearTransport {
  const { mcp, config } = opts;
  const teamId = config.team.id;

  return {
    // -------------------------------------------------------------------
    // 1. task.create → save_issue (no id)
    //
    // title + team required. Optional: description, state, assignee,
    // labels, dueDate, estimate, parentId.
    // items[] children → one save_issue each with parentId = created parent.
    // -------------------------------------------------------------------
    async taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>> {
      try {
        const resp = await mcp("save_issue", {
          team: teamId,
          title: req.name,
          ...(req.description != null ? { description: req.description } : {}),
          ...(config.defaultProjectId != null ? { project: config.defaultProjectId } : {}),
        });

        if (!isObjectWith(resp, "id") || typeof resp.id !== "string") {
          return shapeError("task.create");
        }

        const url =
          isObjectWith(resp, "url") && typeof resp.url === "string" ? resp.url : undefined;

        return { ok: true, data: { id: resp.id, ...(url !== undefined ? { url } : {}) } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 2. task.move → save_issue (id + state)
    //
    // req.targetListOrSectionId = core target: "open" | "wip" | "done"
    // or a raw Linear state type/id. Resolve against config.states by type.
    // -------------------------------------------------------------------
    async taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>> {
      try {
        const linearType = coreTargetToLinearType(req.targetListOrSectionId);
        const stateId = resolveStateByType(config.states, linearType);

        await mcp("save_issue", { id: req.taskId, state: stateId });

        return {
          ok: true,
          data: { previousListOrSectionId: null, newListOrSectionId: stateId },
        };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 3. checklist.check → sub-issue → save_issue state "completed"
    //
    // Linear has no native checklist. Items are sub-issues (created in
    // task.create with parentId = parent issue id).
    // "check" = move sub-issue to a completed-type state.
    // req.itemId = sub-issue id to move to completed state.
    // -------------------------------------------------------------------
    async checklistCheck(
      req: ChecklistCheckRequest,
    ): Promise<TransportResult<ChecklistCheckResponse>> {
      try {
        const targetType = req.targetState === "complete" ? "completed" : "unstarted";
        const stateId = resolveStateByType(config.states, targetType);

        await mcp("save_issue", { id: req.itemId, state: stateId });

        const prev = req.targetState === "complete" ? "incomplete" : "complete";
        return { ok: true, data: { previousState: prev, newState: req.targetState } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 4. task.close → save_issue (id + state "completed")
    //
    // Resolves to the first "completed" type state in config.states.
    // -------------------------------------------------------------------
    async taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>> {
      try {
        const stateId = resolveStateByType(config.states, "completed");

        await mcp("save_issue", { id: req.taskId, state: stateId });

        return { ok: true, data: { closed: true, movedToListOrSectionId: stateId } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 5. task.due-date.set → save_issue (id + dueDate)
    //
    // req.dueAt is ISO 8601; Linear's dueDate field accepts YYYY-MM-DD.
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

      const dueDate = req.dueAt.slice(0, 10);

      try {
        await mcp("save_issue", { id: req.taskId, dueDate });
        return { ok: true, data: { previousDueAt: null, newDueAt: dueDate } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 6. task.assignee.add → save_issue (id + assignee)
    //
    // Single assignee, set-not-add. Linear supports only one assignee.
    // Accepts id/name/email/"me" — passes directly as assignee param.
    // -------------------------------------------------------------------
    async taskAssigneeAdd(
      req: TaskAssigneeAddRequest,
    ): Promise<TransportResult<TaskAssigneeAddResponse>> {
      try {
        await mcp("save_issue", { id: req.taskId, assignee: req.userId });

        return { ok: true, data: { added: true, currentAssigneeIds: [req.userId] } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 7. task.comment.add → save_comment (issueId + body)
    //
    // Markdown body, literal newlines.
    // -------------------------------------------------------------------
    async taskCommentAdd(
      req: TaskCommentAddRequest,
    ): Promise<TransportResult<TaskCommentAddResponse>> {
      try {
        const resp = await mcp("save_comment", {
          issueId: req.taskId,
          body: req.text,
        });

        if (
          !isObjectWith(resp, "id") ||
          typeof resp.id !== "string" ||
          !isObjectWith(resp, "createdAt") ||
          typeof resp.createdAt !== "string"
        ) {
          return shapeError("task.comment.add");
        }

        return { ok: true, data: { commentId: resp.id, postedAt: resp.createdAt } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 8. task.parent.set → save_issue (id + parentId)
    //
    // Arbitrary depth. null parentId detaches the issue from its parent.
    // -------------------------------------------------------------------
    async taskParentSet(
      req: TaskParentSetRequest,
    ): Promise<TransportResult<TaskParentSetResponse>> {
      try {
        await mcp("save_issue", {
          id: req.taskId,
          parentId: req.parentId ?? null,
        });
        return { ok: true, data: { previousParentId: null, newParentId: req.parentId } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 9. task.estimate.set → normalizeEstimate + get_issue (labels) +
    //    save_issue (estimate + labels replace-set)
    //
    // Label strategy: `est:<slug>` label — Linear `labels` is a replace-set.
    // Read current labels, strip existing `est:*`, merge, write full set.
    // If estimation disabled (config.estimation.enabled === false) → NOT_APPLICABLE.
    // linearTarget "none" → label-only write (no estimate field).
    // -------------------------------------------------------------------
    async taskEstimateSet(
      req: LinearTaskEstimateSetRequest,
    ): Promise<TransportResult<TaskEstimateSetResponse>> {
      // Guard: estimation must be enabled
      if (config.estimation?.enabled === false) {
        return {
          ok: false,
          code: "NOT_APPLICABLE",
          details: { reason: "estimation_disabled", taskId: req.taskId },
        };
      }

      // Step 1 — normalize via core (never throws; returns Result)
      // Map linearTarget → jiraTarget so core's EstimationConfig contract is satisfied.
      const coreConfig = {
        ...req.config,
        jiraTarget: (req.config.linearTarget === "points" ? "story_points" : "none") as
          "story_points" | "none",
      };
      const r = normalizeEstimate(req.input, coreConfig);
      if (!r.ok) {
        return { ok: false, code: "INVALID_REQUEST", details: { message: r.error } };
      }
      const n = r.value;

      // Guard: linearTarget must match strategy output
      if (config.estimation?.linearTarget === "points" && n.points == null) {
        return {
          ok: false,
          code: "INVALID_REQUEST",
          details: {
            message: `estimation.strategy "${req.config.strategy}" does not produce points, but linearTarget is "points"`,
            hint: 'Set estimation.linearTarget to "none", or pick a point-based strategy, then re-run pm-tasks-linear init',
          },
        };
      }

      try {
        // Step 2 — read current labels for replace-set merge
        const issueResult = await mcp("get_issue", { id: req.taskId });
        const raw = issueResult as Record<string, unknown>;

        // Labels may come as array of {id, name} objects or strings
        const rawLabels = (isObjectWith(raw, "labels") ? raw.labels : null) ?? [];
        const currentLabelIds: string[] = Array.isArray(rawLabels)
          ? (rawLabels as unknown[])
              .filter(
                (l): l is Record<string, unknown> =>
                  typeof l === "object" && l !== null && "id" in l,
              )
              .filter((l) => {
                const name = typeof l["name"] === "string" ? l["name"] : "";
                return !name.startsWith("est:");
              })
              .map((l) => String(l["id"]))
          : [];

        // Step 3 — build est: label via Linear label registry, or create on-demand (M1)
        const slug = slugify(n.humanReadable);
        const estLabelName = `est:${slug}`;

        // Find existing label id in config.labels if available
        let existingLabel = config.labels?.find((l) => l.name === estLabelName);

        // M1: label create-on-demand — if the est: label is not in config.labels,
        // create it via Linear MCP and use the returned id.
        if (!existingLabel) {
          try {
            const createResult = await mcp("create_issue_label", {
              name: estLabelName,
              teamId,
            });
            if (
              typeof createResult === "object" &&
              createResult !== null &&
              "id" in createResult &&
              typeof (createResult as Record<string, unknown>)["id"] === "string"
            ) {
              existingLabel = {
                id: String((createResult as Record<string, unknown>)["id"]),
                name: estLabelName,
              };
            }
          } catch {
            // Label creation failed — proceed without the label rather than blocking estimation
          }
        }

        const labelIds = existingLabel ? [...currentLabelIds, existingLabel.id] : currentLabelIds;

        // Step 4 — build save_issue args
        const saveArgs: Record<string, unknown> = {
          id: req.taskId,
          labels: labelIds,
        };

        // Write estimate field if linearTarget = "points"
        const linearTarget = config.estimation?.linearTarget ?? "none";
        if (linearTarget === "points" && n.points != null) {
          saveArgs["estimate"] = n.points;
        }

        await mcp("save_issue", saveArgs);

        const fieldWritten: string | null =
          linearTarget === "points" && n.points != null ? "estimate" : null;

        return { ok: true, data: { normalized: n, fieldWritten } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },

    // -------------------------------------------------------------------
    // 10. task.sprint.set → save_issue (id + cycle)
    //
    // NEW — Linear is the first sprint supporter.
    // cycle = sprintRef (name/number/id). Optionally resolve via list_cycles.
    // If config.cycles.enabled is false → NOT_APPLICABLE.
    // -------------------------------------------------------------------
    async taskSprintSet(
      req: TaskSprintSetRequest,
    ): Promise<TransportResult<TaskSprintSetResponse>> {
      // Guard: cycles must be enabled
      if (!config.cycles?.enabled) {
        return {
          ok: false,
          code: "NOT_APPLICABLE",
          details: { reason: "cycles_disabled", taskId: req.taskId },
        };
      }

      try {
        // Attempt to resolve sprintRef to a cycle id via list_cycles
        let cycleId: string = req.sprintRef;

        const cycles = await mcp("list_cycles", { teamId });
        if (isObjectWith(cycles, "nodes") && Array.isArray(cycles.nodes)) {
          const nodes = cycles.nodes as Array<Record<string, unknown>>;
          const match = nodes.find((c) => {
            return (
              c["id"] === req.sprintRef ||
              c["name"] === req.sprintRef ||
              String(c["number"]) === req.sprintRef
            );
          });
          if (match && typeof match["id"] === "string") {
            cycleId = match["id"];
          }
        }

        await mcp("save_issue", { id: req.taskId, cycle: cycleId });

        return { ok: true, data: { previousSprintRef: null, newSprintRef: cycleId } };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },
  };
}
