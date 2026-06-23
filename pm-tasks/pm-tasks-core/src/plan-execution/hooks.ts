import type { Runtime, TransportResult } from "../runtime/index.js";
import { appendAuditEntry } from "../audit.js";

/**
 * Discriminator for which verbs the hook ran (or skipped).
 */
export type HookVerb = "task.move" | "checklist.check" | "task.comment.add" | "task.close";

/**
 * Task reference for onTaskStart.
 * The adapter-native task id and optional target list/section id for work-in-progress state.
 */
export interface OnTaskStartTask {
  /** Adapter-native task id (Trello cardId; Asana task gid). */
  id: string;
  /**
   * Target list/section id for "work in progress" state.
   * If undefined, onTaskStart is a no-op AND emits a WARN audit entry
   * (when auditLogPath is also provided).
   */
  listsWipId?: string;
}

/**
 * Options for onTaskStart hook.
 * Moves the task to the configured work-in-progress list, or emits a WARN audit entry if listsWipId is absent.
 */
export interface OnTaskStartOptions {
  /** Adapter runtime exposing the taskMove verb. */
  adapter: Runtime;
  /** Task reference with id and optional wip list. */
  task: OnTaskStartTask;
  /**
   * Absolute path to the adapter's audit log file. When provided AND
   * listsWipId is missing, the hook appends one WARN entry recording
   * the no-op. Omit in tests that don't care about the WARN trail.
   */
  auditLogPath?: string;
  /**
   * Tool name written into the WARN audit entry's `tool` field
   * (e.g. "trello", "asana"). Required when auditLogPath is set.
   */
  tool?: string;
  /**
   * Session id written into the WARN audit entry's `session` field.
   * Required when auditLogPath is set.
   */
  session?: string;
}

/**
 * Task reference for onTaskComplete.
 * The adapter-native task id, target done list, and optional checklist to mark complete.
 */
export interface OnTaskCompleteTask {
  /** Adapter-native task id. */
  id: string;
  /** Target list/section id for the "done" state. REQUIRED. */
  listsDoneId: string;
  /**
   * Optional checklist + item to mark complete BEFORE moving the task.
   * Both fields must be present together (the hook checks both); if either
   * is missing, the checklist.check step is skipped (not run, not failed).
   */
  checklistId?: string;
  checklistItemId?: string;
}

/**
 * Options for onTaskComplete hook.
 * Runs the 4-verb sequence: optional checklist.check → task.move(done) →
 * task.comment.add (with commit SHA as clientToken) → task.close.
 */
export interface OnTaskCompleteOptions {
  /** Adapter runtime exposing all four verbs. */
  adapter: Runtime;
  /** Task reference with id, done list, and optional checklist. */
  task: OnTaskCompleteTask;
  /** Commit SHA — used as clientToken for the comment dedup marker. REQUIRED. */
  commitSha: string;
  /** Optional branch name woven into the comment body. */
  branch?: string;
}

/**
 * Result of a hook execution.
 * Tracks which verbs succeeded (performed), which were skipped (no-op or idempotent),
 * and whether the overall hook result was ok.
 */
export interface HookResult {
  /**
   * Overall success indicator.
   * - true: all attempted verbs returned ok:true OR ok:false with code "ALREADY_IN_STATE"
   * - false: at least one verb returned ok:false with a different code
   */
  ok: boolean;
  /** Verbs whose underlying call returned ok:true. */
  performed: HookVerb[];
  /**
   * Verbs short-circuited because their target state already held
   * (transport returned ok:false, code "ALREADY_IN_STATE"), OR because
   * inputs to that step were absent (e.g. checklist not configured),
   * OR the transport returned ok:false with a code other than ALREADY_IN_STATE
   * (those verbs also land here; check `ok` to distinguish).
   */
  skipped: HookVerb[];
}

/**
 * Wraps an adapter call to catch transport errors and convert them into a synthetic
 * TransportResult with ok:false code "MCP_ERROR", so the caller never receives a thrown exception.
 */
async function safeCall<T>(fn: () => Promise<TransportResult<T>>): Promise<TransportResult<T>> {
  try {
    return await fn();
  } catch (err) {
    return {
      ok: false,
      code: "MCP_ERROR" as const,
      details: { thrown: String(err) },
    } as TransportResult<T>;
  }
}

/**
 * Helper to classify a transport result into performed/skipped arrays.
 * Returns true if the result is ok overall (either ok:true or idempotent ok:false).
 * Mutates the performed and skipped arrays; the caller tracks overall ok state.
 */
function classifyResult(
  result: TransportResult<unknown>,
  verb: HookVerb,
  performed: HookVerb[],
  skipped: HookVerb[],
): boolean {
  if (result.ok) {
    performed.push(verb);
    return true;
  }
  if (result.code === "ALREADY_IN_STATE") {
    skipped.push(verb);
    return true;
  }
  skipped.push(verb);
  return false;
}

/**
 * Hook invoked when the agent starts working on a plan task.
 * Moves the task to the configured work-in-progress list.
 * If listsWipId is absent, emits a WARN audit entry (when auditLogPath is provided)
 * and returns no-op without calling taskMove.
 *
 * Never throws; transport errors are converted to { ok: false }.
 */
export async function onTaskStart(opts: OnTaskStartOptions): Promise<HookResult> {
  const { adapter, task, auditLogPath, tool, session } = opts;
  const performed: HookVerb[] = [];
  const skipped: HookVerb[] = [];

  // If listsWipId is absent, emit WARN and return no-op.
  if (!task.listsWipId) {
    if (auditLogPath && tool && session) {
      await appendAuditEntry(
        {
          ts: new Date().toISOString(),
          verb: "plan-execution.on-task-start",
          tool,
          ok: true,
          session,
          level: "warn",
          reason: "MISSING_WIP_LIST",
          id: task.id,
        },
        { logPath: auditLogPath },
      );
    }
    return { ok: true, performed, skipped: ["task.move"] };
  }

  // Call taskMove.
  const result = await safeCall(() =>
    adapter.taskMove({
      taskId: task.id,
      targetListOrSectionId: task.listsWipId!,
    }),
  );

  let ok = true;
  if (!classifyResult(result, "task.move", performed, skipped)) {
    ok = false;
  }

  return { ok, performed, skipped };
}

/**
 * Hook invoked when the agent completes a plan task.
 * Runs the 4-verb sequence (in order):
 * 1. optional checklist.check (if both checklistId and checklistItemId are present)
 * 2. task.move to the done list
 * 3. task.comment.add with commit SHA as clientToken (dedup marker)
 * 4. task.close
 *
 * Continues dispatching even after a verb fails (best-effort; the calling agent
 * reads ok/performed/skipped to decide). Never throws; all errors are converted
 * to { ok: false, performed, skipped }.
 */
export async function onTaskComplete(opts: OnTaskCompleteOptions): Promise<HookResult> {
  const { adapter, task, commitSha, branch } = opts;
  const performed: HookVerb[] = [];
  const skipped: HookVerb[] = [];
  let ok = true;

  // 1. optional checklist.check
  if (task.checklistId && task.checklistItemId) {
    const result = await safeCall(() =>
      adapter.checklistCheck({
        taskId: task.id,
        checklistId: task.checklistId!,
        itemId: task.checklistItemId!,
        targetState: "complete",
      }),
    );
    if (!classifyResult(result, "checklist.check", performed, skipped)) {
      ok = false;
    }
  } else {
    skipped.push("checklist.check");
  }

  // 2. task.move
  const moveResult = await safeCall(() =>
    adapter.taskMove({
      taskId: task.id,
      targetListOrSectionId: task.listsDoneId,
    }),
  );
  if (!classifyResult(moveResult, "task.move", performed, skipped)) {
    ok = false;
  }

  // 3. task.comment.add
  const text = branch ? `Completed at ${commitSha} on ${branch}` : `Completed at ${commitSha}`;
  const commentResult = await safeCall(() =>
    adapter.taskCommentAdd({
      taskId: task.id,
      text,
      clientToken: commitSha,
    }),
  );
  if (!classifyResult(commentResult, "task.comment.add", performed, skipped)) {
    ok = false;
  }

  // 4. task.close
  const closeResult = await safeCall(() => adapter.taskClose({ taskId: task.id }));
  if (!classifyResult(closeResult, "task.close", performed, skipped)) {
    ok = false;
  }

  return { ok, performed, skipped };
}
