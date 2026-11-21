import { describe, it, expect } from "vitest";
import { resolveStatus, statusKey } from "../src/status.js";
import type { ClickUpConfig } from "../src/transport-clickup.js";

const CONFIG: ClickUpConfig = {
  version: "1",
  workspace: { id: "9013000001", name: "Workspace" },
  lists: [
    {
      id: "1000400000000002",
      name: "sandbox-a",
      statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
    },
    {
      id: "1000400000000003",
      name: "sandbox-b",
      statuses: { open: "backlog", done: "shipped" },
    },
  ],
};

describe("resolveStatus", () => {
  it("resolves open/wip/done from the task list", () => {
    expect(resolveStatus(CONFIG, "1000400000000002", "open")).toEqual({
      ok: true,
      status: "to do",
    });
    expect(resolveStatus(CONFIG, "1000400000000002", "wip")).toEqual({
      ok: true,
      status: "in progress",
    });
    expect(resolveStatus(CONFIG, "1000400000000002", "done")).toEqual({
      ok: true,
      status: "complete",
    });
    // Pinned per list: the same role resolves to the other list's own name.
    expect(resolveStatus(CONFIG, "1000400000000003", "done")).toEqual({
      ok: true,
      status: "shipped",
    });
  });

  it("list_not_configured for an unknown list", () => {
    expect(resolveStatus(CONFIG, "1000400000000999", "open")).toEqual({
      ok: false,
      reason: "list_not_configured",
    });
    expect(resolveStatus(CONFIG, "", "open")).toEqual({
      ok: false,
      reason: "list_not_configured",
    });
  });

  it("role_not_configured when wip is absent", () => {
    expect(resolveStatus(CONFIG, "1000400000000003", "wip")).toEqual({
      ok: false,
      reason: "role_not_configured",
    });
  });

  it("role_not_configured when a hand-edited list has no statuses at all", () => {
    const lists = [{ id: "1000400000000004", name: "x" }] as unknown as ClickUpConfig["lists"];
    const config: ClickUpConfig = { ...CONFIG, lists };
    for (const role of ["open", "wip", "done", "closed"] as const) {
      expect(resolveStatus(config, "1000400000000004", role)).toEqual({
        ok: false,
        reason: "role_not_configured",
      });
    }
  });

  it("role_not_configured when the pinned name is empty", () => {
    const config: ClickUpConfig = {
      ...CONFIG,
      lists: [
        { id: "1000400000000004", name: "x", statuses: { open: "to do", wip: "", done: "" } },
      ],
    };
    expect(resolveStatus(config, "1000400000000004", "wip")).toEqual({
      ok: false,
      reason: "role_not_configured",
    });
    expect(resolveStatus(config, "1000400000000004", "done")).toEqual({
      ok: false,
      reason: "role_not_configured",
    });
  });
});

describe("statusKey", () => {
  it("is the one comparison key for status names: trimmed and lowercased", () => {
    expect(statusKey("  In Progress ")).toBe("in progress");
    expect(statusKey("COMPLETE")).toBe(statusKey("complete "));
    expect(statusKey("to do")).not.toBe(statusKey("todo"));
  });
});
