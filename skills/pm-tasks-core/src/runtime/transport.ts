/**
 * Transport interface for @llodev/pm-tasks-core runtime.
 *
 * Pure type definitions — no implementation, no MCP imports.
 * Each adapter (pm-tasks-trello, pm-tasks-asana) provides an MCP-bound
 * implementation in Phase 3. Verb handlers (Phase 2) consume this interface
 * through dependency injection in the runtime factory (Phase 1.3).
 *
 * Canonical verb names (dotted form used in audit log entries) are documented
 * alongside each method below.
 */

import type { EstimateInput, EstimationConfig, NormalizedEstimate } from "../estimation.js";

// ---------------------------------------------------------------------------
// Result envelope
// ---------------------------------------------------------------------------

export type TransportErrorCode =
  | "NOT_FOUND" // target card/task/checklist-item does not exist
  | "ALREADY_IN_STATE" // idempotency short-circuit (e.g. task already in target list)
  | "RATE_LIMITED" // MCP returned 429; details may include retryAfterSeconds
  | "AUTH_ERROR" // missing/invalid token
  | "MCP_ERROR" // generic MCP failure; details should carry message
  | "INVALID_REQUEST" // shape-level validation failure
  | "UNSUPPORTED_VERB" // transport does not implement this verb (factory guard short-circuit)
  | "NOT_APPLICABLE"; // operation not applicable in this context (reserved for Phase 3)

export type TransportResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: TransportErrorCode; details?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// 1. taskCreate  (canonical: task.create)
// ---------------------------------------------------------------------------

export interface TaskCreateRequest {
  boardOrProjectId: string; // Trello: idBoard; Asana: project gid
  listOrSectionId: string; // Trello: idList; Asana: section gid
  name: string; // card/task title
  description?: string; // optional body
  clientToken?: string; // for [ct:<token>] idempotency marker
}

export interface TaskCreateResponse {
  id: string; // adapter-native id (Trello cardId; Asana task gid)
  url?: string; // public URL when adapter provides
}

// ---------------------------------------------------------------------------
// 2. taskMove  (canonical: task.move)
// ---------------------------------------------------------------------------

export interface TaskMoveRequest {
  taskId: string;
  targetListOrSectionId: string;
}

export interface TaskMoveResponse {
  previousListOrSectionId: string | null; // null when adapter cannot determine
  newListOrSectionId: string;
}

// ---------------------------------------------------------------------------
// 3. checklistCheck  (canonical: checklist.check)
// ---------------------------------------------------------------------------

export interface ChecklistCheckRequest {
  taskId: string;
  checklistId: string;
  itemId: string;
  targetState: "complete" | "incomplete";
}

export interface ChecklistCheckResponse {
  previousState: "complete" | "incomplete";
  newState: "complete" | "incomplete";
}

// ---------------------------------------------------------------------------
// 4. taskClose  (canonical: task.close)
// ---------------------------------------------------------------------------

export interface TaskCloseRequest {
  taskId: string;
  closeListOrSectionId?: string; // Trello only; Asana ignores
}

export interface TaskCloseResponse {
  closed: boolean; // always true on success
  movedToListOrSectionId?: string; // Trello sets this when moved; Asana omits
}

// ---------------------------------------------------------------------------
// 5. taskDueDateSet  (canonical: task.due-date.set)
// ---------------------------------------------------------------------------

export interface TaskDueDateSetRequest {
  taskId: string;
  dueAt: string; // ISO 8601 with timezone
}

export interface TaskDueDateSetResponse {
  previousDueAt: string | null;
  newDueAt: string;
}

// ---------------------------------------------------------------------------
// 6. taskAssigneeAdd  (canonical: task.assignee.add)
// ---------------------------------------------------------------------------

export interface TaskAssigneeAddRequest {
  taskId: string;
  userId: string; // adapter-native (Trello memberId; Asana user gid)
}

export interface TaskAssigneeAddResponse {
  added: boolean; // false if was already present
  currentAssigneeIds: string[];
}

// ---------------------------------------------------------------------------
// 7. taskCommentAdd  (canonical: task.comment.add)
// ---------------------------------------------------------------------------

export interface TaskCommentAddRequest {
  taskId: string;
  text: string;
  clientToken?: string; // for [ct:<token>] dedup prefix
}

export interface TaskCommentAddResponse {
  commentId: string;
  postedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// 8. taskParentSet  (canonical: task.parent.set)
// ---------------------------------------------------------------------------

// F3  task.parent.set
export interface TaskParentSetRequest {
  taskId: string;
  parentId: string;
}
export interface TaskParentSetResponse {
  previousParentId: string | null;
  newParentId: string;
}

// ---------------------------------------------------------------------------
// 9. taskEstimateSet  (canonical: task.estimate.set)
// ---------------------------------------------------------------------------

// F7  task.estimate.set
export interface TaskEstimateSetRequest {
  taskId: string;
  input: EstimateInput;
  config: EstimationConfig;
}
export interface TaskEstimateSetResponse {
  normalized: NormalizedEstimate;
  fieldWritten: string | null; // Jira fieldId written, or null when jiraTarget="none"
}

// ---------------------------------------------------------------------------
// Transport interface
// ---------------------------------------------------------------------------

export interface Transport {
  /** task.create — create a new card/task in the given board+list/project+section */
  taskCreate(req: TaskCreateRequest): Promise<TransportResult<TaskCreateResponse>>;

  /** task.move — move an existing task to a different list/section */
  taskMove(req: TaskMoveRequest): Promise<TransportResult<TaskMoveResponse>>;

  /** checklist.check — set a checklist item to complete or incomplete */
  checklistCheck(req: ChecklistCheckRequest): Promise<TransportResult<ChecklistCheckResponse>>;

  /** task.close — archive/complete a task */
  taskClose(req: TaskCloseRequest): Promise<TransportResult<TaskCloseResponse>>;

  /** task.due-date.set — set or replace the due date on a task */
  taskDueDateSet(req: TaskDueDateSetRequest): Promise<TransportResult<TaskDueDateSetResponse>>;

  /** task.assignee.add — add a member/assignee to a task */
  taskAssigneeAdd(req: TaskAssigneeAddRequest): Promise<TransportResult<TaskAssigneeAddResponse>>;

  /** task.comment.add — post a comment on a task */
  taskCommentAdd(req: TaskCommentAddRequest): Promise<TransportResult<TaskCommentAddResponse>>;

  /** task.parent.set — set or update the parent task/epic (adapter-optional; Jira only in Phase 4) */
  taskParentSet?(req: TaskParentSetRequest): Promise<TransportResult<TaskParentSetResponse>>;

  /** task.estimate.set — write a normalised story-point/time estimate (adapter-optional; Jira only in Phase 4) */
  taskEstimateSet?(req: TaskEstimateSetRequest): Promise<TransportResult<TaskEstimateSetResponse>>;

  /** task.sprint.set — assign a task to a sprint/cycle (adapter-optional; Linear is the first supporter) */
  taskSprintSet?(req: TaskSprintSetRequest): Promise<TransportResult<TaskSprintSetResponse>>;
}

// ---------------------------------------------------------------------------
// 10. taskSprintSet  (canonical: task.sprint.set)
// ---------------------------------------------------------------------------

// F10  task.sprint.set
export interface TaskSprintSetRequest {
  taskId: string;
  sprintRef: string; // cycle name/number/id — opaque to core; adapter resolves it
}
export interface TaskSprintSetResponse {
  previousSprintRef: string | null;
  newSprintRef: string;
}

// ---------------------------------------------------------------------------
// Auxiliary snapshot types (for Phase 2 idempotency checks)
// Exported here so Phase 2 verb handlers can reference them without
// redefining. getTask / listComments read helpers are deferred to Phase 2.
// ---------------------------------------------------------------------------

export interface TaskSnapshot {
  id: string;
  name: string;
  listOrSectionId: string | null;
  dueAt: string | null;
  assigneeIds: string[];
  closed: boolean;
}

export interface CommentSnapshot {
  id: string;
  text: string;
  postedAt: string;
}
