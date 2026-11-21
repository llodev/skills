/**
 * Map a list's ClickUp statuses to the roles `init` pins per list. ClickUp
 * gives every status a `type`; names are user-defined and often localized, so
 * the mapping uses the type and the order only, and returns names verbatim.
 */

import { finiteNumber } from "./envelope.js";

export type ClickUpStatusType = "open" | "custom" | "done" | "closed";

export interface ClickUpStatus {
  status: string;
  type: ClickUpStatusType;
  orderindex?: number;
}

export type StatusMapping =
  | { open: string; done: string; closed?: string; wipCandidates: string[] }
  | { error: "no_open_status" | "no_done_status" };

/**
 * - `open`: the `open`-type status with the lowest `orderindex`.
 * - `done`: the lowest `done`-type status, else the lowest `closed`-type one.
 * - `closed`: the lowest `closed`-type status, only when it is not the `done` one.
 * - `wipCandidates`: every `custom`-type status, by `orderindex` (the user picks `wip`).
 *
 * `orderindex` sorts numerically (a numeric string counts); an entry without
 * one sorts last, and ties keep input order. Entries with another type or no
 * name are ignored.
 */
export function mapStatuses(statuses: ClickUpStatus[]): StatusMapping {
  const sorted = statuses
    .map((s, i) => ({ s, i, key: finiteNumber(s.orderindex) ?? Infinity }))
    .filter(({ s }) => typeof s.status === "string" && s.status !== "")
    .sort((a, b) => (a.key === b.key ? a.i - b.i : a.key < b.key ? -1 : 1))
    .map(({ s }) => s);
  const first = (type: ClickUpStatusType): string | undefined =>
    sorted.find((s) => s.type === type)?.status;

  const open = first("open");
  if (open === undefined) return { error: "no_open_status" };
  const closed = first("closed");
  const done = first("done") ?? closed;
  if (done === undefined) return { error: "no_done_status" };

  return {
    open,
    done,
    ...(closed !== undefined && closed !== done ? { closed } : {}),
    wipCandidates: sorted.filter((s) => s.type === "custom").map((s) => s.status),
  };
}
