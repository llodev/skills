/**
 * Status names are pinned per list at init (`config.lists[].statuses`) and
 * resolved by role, never guessed by name at runtime.
 */

import type { ClickUpConfig } from "./transport-clickup.js";

export type StatusRole = "open" | "wip" | "done";

/** The key status names compare by (trimmed, lowercased): the verbs and the doctor share it. */
export function statusKey(name: string): string {
  return name.trim().toLowerCase();
}

/** `closed` is never a move target; `task.close` reads it to leave a closed task alone. */
export function resolveStatus(
  config: ClickUpConfig,
  listId: string,
  role: StatusRole | "closed",
):
  | { ok: true; status: string }
  | { ok: false; reason: "list_not_configured" | "role_not_configured" } {
  const list = config.lists.find((l) => l.id === listId);
  if (!list) return { ok: false, reason: "list_not_configured" };
  // A hand-edited config may lack `statuses`: fail closed like an unpinned role.
  const status = list.statuses?.[role];
  if (typeof status !== "string" || status === "") {
    return { ok: false, reason: "role_not_configured" };
  }
  return { ok: true, status };
}
