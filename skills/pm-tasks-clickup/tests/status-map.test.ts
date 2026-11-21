import { describe, it, expect } from "vitest";
import { mapStatuses, type ClickUpStatus } from "../src/status-map.js";

/** The status set observed on a live list (spike U11), in API order. */
const OBSERVED: ClickUpStatus[] = [
  { status: "to do", type: "open", orderindex: 0 },
  { status: "planning", type: "custom", orderindex: 1 },
  { status: "in progress", type: "custom", orderindex: 2 },
  { status: "at risk", type: "custom", orderindex: 3 },
  { status: "update required", type: "custom", orderindex: 4 },
  { status: "on hold", type: "custom", orderindex: 5 },
  { status: "complete", type: "done", orderindex: 6 },
  { status: "cancelled", type: "closed", orderindex: 7 },
];

/** Raw API entries: `orderindex` may arrive as a numeric string and `type` may be unknown. */
function raw(entries: Array<Record<string, unknown>>): ClickUpStatus[] {
  return entries as unknown as ClickUpStatus[];
}

describe("mapStatuses", () => {
  it("maps the observed set: open, done, closed and custom candidates in order", () => {
    expect(mapStatuses(OBSERVED)).toEqual({
      open: "to do",
      done: "complete",
      closed: "cancelled",
      wipCandidates: ["planning", "in progress", "at risk", "update required", "on hold"],
    });
  });

  it("no done type falls back to the closed type, and closed is then not reported", () => {
    const result = mapStatuses([
      { status: "to do", type: "open", orderindex: 0 },
      { status: "doing", type: "custom", orderindex: 1 },
      { status: "Closed", type: "closed", orderindex: 2 },
    ]);
    expect(result).toEqual({ open: "to do", done: "Closed", wipCandidates: ["doing"] });
    expect(result).not.toHaveProperty("closed");
  });

  it("no custom statuses gives empty candidates", () => {
    expect(
      mapStatuses([
        { status: "to do", type: "open", orderindex: 0 },
        { status: "complete", type: "closed", orderindex: 1 },
      ]),
    ).toEqual({ open: "to do", done: "complete", wipCandidates: [] });
  });

  it("no open status is an error", () => {
    expect(
      mapStatuses([
        { status: "doing", type: "custom", orderindex: 0 },
        { status: "complete", type: "done", orderindex: 1 },
      ]),
    ).toEqual({ error: "no_open_status" });
    expect(mapStatuses([])).toEqual({ error: "no_open_status" });
  });

  it("neither a done nor a closed status is an error", () => {
    expect(
      mapStatuses([
        { status: "to do", type: "open", orderindex: 0 },
        { status: "doing", type: "custom", orderindex: 1 },
      ]),
    ).toEqual({ error: "no_done_status" });
  });

  it("sorts numerically, accepting numeric-string orderindex values", () => {
    const result = mapStatuses(
      raw([
        { status: "c", type: "custom", orderindex: "10" },
        { status: "to do", type: "open", orderindex: "0" },
        { status: "a", type: "custom", orderindex: 2 },
        { status: "b", type: "custom", orderindex: "9" },
        { status: "done", type: "done", orderindex: 11 },
      ]),
    );
    // Numeric order: "9" before "10" (a string sort would put "10" first).
    expect(result).toEqual({ open: "to do", done: "done", wipCandidates: ["a", "b", "c"] });
  });

  it("several open or done entries: the lowest orderindex wins", () => {
    expect(
      mapStatuses([
        { status: "done late", type: "done", orderindex: 9 },
        { status: "backlog", type: "open", orderindex: 3 },
        { status: "triage", type: "open", orderindex: 1 },
        { status: "done early", type: "done", orderindex: 7 },
        { status: "cancelled", type: "closed", orderindex: 10 },
      ]),
    ).toEqual({ open: "triage", done: "done early", closed: "cancelled", wipCandidates: [] });
  });

  it("missing orderindex sorts after the indexed ones and keeps input order among them", () => {
    expect(
      mapStatuses([
        { status: "y", type: "custom" },
        { status: "to do", type: "open" },
        { status: "x", type: "custom", orderindex: 4 },
        { status: "z", type: "custom" },
        { status: "complete", type: "done" },
      ]),
    ).toEqual({ open: "to do", done: "complete", wipCandidates: ["x", "y", "z"] });
  });

  it("ignores types outside open, custom, done and closed", () => {
    expect(
      mapStatuses(
        raw([
          { status: "to do", type: "open", orderindex: 0 },
          { status: "mystery", type: "unknown", orderindex: 1 },
          { status: "Open", type: "OPEN", orderindex: -1 },
          { status: "complete", type: "done", orderindex: 2 },
        ]),
      ),
    ).toEqual({ open: "to do", done: "complete", wipCandidates: [] });
  });

  it("returns localized names verbatim, including case", () => {
    expect(
      mapStatuses([
        { status: "A Fazer", type: "open", orderindex: 0 },
        { status: "em andamento", type: "custom", orderindex: 1 },
        { status: "Em Revisão", type: "custom", orderindex: 2 },
        { status: "concluído", type: "done", orderindex: 3 },
        { status: "Cancelado", type: "closed", orderindex: 4 },
      ]),
    ).toEqual({
      open: "A Fazer",
      done: "concluído",
      closed: "Cancelado",
      wipCandidates: ["em andamento", "Em Revisão"],
    });
  });

  it("skips entries without a usable name", () => {
    expect(
      mapStatuses(
        raw([
          { status: "", type: "open", orderindex: 0 },
          { type: "open", orderindex: 1 },
          { status: "to do", type: "open", orderindex: 2 },
          { status: "complete", type: "done", orderindex: 3 },
        ]),
      ),
    ).toEqual({ open: "to do", done: "complete", wipCandidates: [] });
  });

  it("does not mutate its input", () => {
    const input = [...OBSERVED].reverse();
    const before = JSON.stringify(input);
    mapStatuses(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
