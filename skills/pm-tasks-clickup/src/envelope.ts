/**
 * Response shapes of the ClickUp MCP. Writes return an envelope
 * `{success, task_id, custom_id, task_url}`; `clickup_get_task` returns a bare,
 * flat task; failures are `{"error": "<text>"}`, either thrown or resolved.
 */

import type { McpCaller } from "./transport-clickup.js";

/** The task fields the verbs read, normalized from either response shape. */
export interface ClickUpTaskView {
  id: string;
  url?: string;
  status?: string;
  listId?: string;
  parentId: string | null;
  assigneeIds: string[];
  tagNames: string[];
  /** ISO instant of the stored epoch-millisecond due date, or null. */
  dueDate: string | null;
  subtaskCount: number;
  /** `space.id`; absent on a write envelope. */
  spaceId?: string;
  /** The native `time_estimate` in milliseconds, or null when unset or unreadable. */
  timeEstimateMs: number | null;
}

type Obj = Record<string, unknown>;

export function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** A non-empty string id, or a finite number id stringified (user ids are numbers). */
export function idString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return nonEmptyString(value);
}

/** A finite number given as a number or a numeric string (ClickUp sends both); else null. */
export function finiteNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** ISO instant of an epoch-millisecond string or number; null when absent or unreadable. */
export function epochToIso(value: unknown): string | null {
  const ms = finiteNumber(value);
  return ms === null ? null : new Date(ms).toISOString();
}

/** `https://app.clickup.com/t/<id>`: the task URL shape ClickUp returns (no workspace segment). */
export function taskUrl(id: string): string {
  return `https://app.clickup.com/t/${id}`;
}

/** Normalize a bare task or a write envelope; null when neither carries an id. */
export function unwrapTask(resp: unknown): ClickUpTaskView | null {
  if (!isObj(resp)) return null;
  const id = nonEmptyString(resp.id) ?? nonEmptyString(resp.task_id);
  if (id === undefined) return null;

  const url = nonEmptyString(resp.url) ?? nonEmptyString(resp.task_url);
  const status = nonEmptyString(resp.status);
  const listId = isObj(resp.list) ? idString(resp.list.id) : undefined;
  const assigneeIds = Array.isArray(resp.assignees)
    ? resp.assignees.flatMap((a) => {
        const aid = isObj(a) ? idString(a.id) : undefined;
        return aid === undefined ? [] : [aid];
      })
    : [];
  const tagNames = Array.isArray(resp.tags)
    ? resp.tags.flatMap((t) => {
        const name = isObj(t) ? nonEmptyString(t.name) : undefined;
        return name === undefined ? [] : [name];
      })
    : [];
  let subtaskCount = 0;
  if (typeof resp.subtasks_count === "number") subtaskCount = resp.subtasks_count;
  else if (Array.isArray(resp.subtasks)) subtaskCount = resp.subtasks.length;
  const spaceId = isObj(resp.space) ? idString(resp.space.id) : undefined;

  return {
    id,
    ...(url !== undefined ? { url } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(listId !== undefined ? { listId } : {}),
    parentId: nonEmptyString(resp.parent) ?? null,
    assigneeIds,
    tagNames,
    dueDate: epochToIso(resp.due_date),
    subtaskCount,
    ...(spaceId !== undefined ? { spaceId } : {}),
    timeEstimateMs: finiteNumber(resp.time_estimate),
  };
}

/**
 * Call a ClickUp MCP tool and turn a resolved failure (`{error}` without
 * `success: true`, or `success: false`) into a thrown error, so every verb
 * handles a resolved and a thrown failure the same way.
 */
export async function callTool(mcp: McpCaller, tool: string, args: Obj): Promise<unknown> {
  const resp = await mcp(tool, args);
  if (isObj(resp)) {
    if ("error" in resp && resp.success !== true) {
      const err = resp.error;
      throw new Error(typeof err === "string" ? err : JSON.stringify(err));
    }
    if (resp.success === false) throw new Error(`${tool} reported success: false`);
  }
  return resp;
}
