import { describe, it, expect } from "vitest";
import { callTool, taskUrl, unwrapTask } from "../src/envelope.js";
import { makeMcp, mcpFixture } from "./helpers/mcp-stub.js";

describe("unwrapTask", () => {
  it("unwrapTask reads a bare task", () => {
    expect(unwrapTask(mcpFixture("clickup_get_task.parent"))).toEqual({
      id: "t000000001",
      url: "https://app.clickup.com/t/t000000001",
      status: "to do",
      listId: "1000400000000002",
      parentId: null,
      assigneeIds: ["100000001"],
      tagNames: ["est:2h"],
      // 1795762800000 ms: a date-only due date stored at 04:00 local (UTC-3).
      dueDate: "2026-11-27T07:00:00.000Z",
      subtaskCount: 0,
      spaceId: "901310000001",
      timeEstimateMs: 7200000,
    });
  });

  it("reads the time estimate in ms (number or numeric string) and null when unset", () => {
    const raw = mcpFixture("clickup_get_task.child") as Record<string, unknown>;
    expect(unwrapTask(raw)?.timeEstimateMs).toBe(1800000);
    expect(unwrapTask({ ...raw, time_estimate: "5400000" })?.timeEstimateMs).toBe(5400000);
    for (const time_estimate of [null, undefined, "", "soon"]) {
      expect(unwrapTask({ ...raw, time_estimate })?.timeEstimateMs).toBeNull();
    }
    expect(unwrapTask({ ...raw, space: null })).not.toHaveProperty("spaceId");
  });

  it("reads the parent id and empty collections of a child task", () => {
    const view = unwrapTask(mcpFixture("clickup_get_task.child"));
    expect(view).toMatchObject({
      id: "t000000002",
      parentId: "t000000001",
      assigneeIds: [],
      tagNames: [],
      dueDate: null,
      subtaskCount: 0,
    });
  });

  it("counts subtasks[] when subtasks_count is absent (include: subtasks)", () => {
    const raw = mcpFixture("clickup_get_task.parent.subtasks") as Record<string, unknown>;
    expect(raw).not.toHaveProperty("subtasks_count");
    expect(unwrapTask(raw)?.subtaskCount).toBe(2);
  });

  it("unwrapTask reads a write envelope (task_id/task_url)", () => {
    expect(unwrapTask(mcpFixture("clickup_create_task.parent"))).toEqual({
      id: "t000000001",
      url: "https://app.clickup.com/t/t000000001",
      parentId: null,
      assigneeIds: [],
      tagNames: [],
      dueDate: null,
      subtaskCount: 0,
      timeEstimateMs: null,
    });
  });

  it("reads an envelope without task_url (move_task)", () => {
    const view = unwrapTask(mcpFixture("clickup_move_task"));
    expect(view?.id).toBe("t000000004");
    expect(view).not.toHaveProperty("url");
  });

  it("unwrapTask returns null without an id", () => {
    for (const resp of [
      null,
      undefined,
      "t000000001",
      42,
      [],
      {},
      { success: true },
      { id: "" },
      { task_id: 5 },
      mcpFixture("clickup_update_task.status_error"),
    ]) {
      expect(unwrapTask(resp)).toBeNull();
    }
  });
});

describe("taskUrl", () => {
  it("builds the ClickUp task URL from an id", () => {
    expect(taskUrl("t000000009")).toBe("https://app.clickup.com/t/t000000009");
  });
});

describe("callTool", () => {
  it("returns a successful response unchanged", async () => {
    const envelope = mcpFixture("clickup_update_task");
    const { mcp, calls } = makeMcp(new Map([["clickup_update_task", envelope]]));
    await expect(callTool(mcp, "clickup_update_task", { task_id: "t000000002" })).resolves.toBe(
      envelope,
    );
    expect(calls).toEqual([{ tool: "clickup_update_task", args: { task_id: "t000000002" } }]);
  });

  it("throws the server text of a resolved {error}", async () => {
    const { mcp } = makeMcp(
      new Map([["clickup_update_task", mcpFixture("clickup_update_task.status_error")]]),
    );
    await expect(callTool(mcp, "clickup_update_task", { task_id: "t000000002" })).rejects.toThrow(
      "Failed to update task: Status does not exist",
    );
  });

  it("throws on an envelope with success: false", async () => {
    const { mcp } = makeMcp(new Map([["clickup_update_task", { success: false }]]));
    await expect(callTool(mcp, "clickup_update_task", { task_id: "t000000002" })).rejects.toThrow();
  });

  it("propagates a thrown error", async () => {
    const { mcp } = makeMcp(new Map([["clickup_get_task", new Error("boom")]]));
    await expect(callTool(mcp, "clickup_get_task", { task_id: "t000000002" })).rejects.toThrow(
      "boom",
    );
  });
});
