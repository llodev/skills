import { afterEach, describe, it, expect } from "vitest";
import { createClickUpTransport, type ClickUpConfig } from "../src/transport-clickup.js";
import {
  expectWorkspaceOnEveryCall,
  makeMcp,
  mcpFixture,
  type CallRecord,
} from "./helpers/mcp-stub.js";

const WS = "9013000001";
const LIST_A = "1000400000000002"; // sandbox-a: every role pinned
const LIST_B = "1000400000000003"; // sandbox-b: no wip pinned

const CONFIG: ClickUpConfig = {
  version: "1",
  workspace: { id: WS, name: "Workspace" },
  lists: [
    {
      id: LIST_A,
      name: "sandbox-a",
      statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
    },
    { id: LIST_B, name: "sandbox-b", statuses: { open: "backlog", done: "shipped" } },
  ],
};

/** Only sandbox-a is configured: a task in sandbox-b is a hand-made task elsewhere. */
const CONFIG_A_ONLY: ClickUpConfig = { ...CONFIG, lists: [CONFIG.lists[0]!] };

const STATUS_ERROR = mcpFixture("clickup_update_task.status_error");
const UPDATED = mcpFixture("clickup_update_task");

/** A real `get_task` capture, optionally with fields overridden. */
function task(name: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(mcpFixture(name) as Record<string, unknown>), ...overrides };
}

/** A real `get_task` capture with one key removed: a partial read. */
function taskWithout(name: string, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(task(name)).filter(([k]) => k !== key));
}

const PARENT = "clickup_get_task.parent"; // t000000001, root, "to do", sandbox-a
const PARENT_WITH_SUBTASKS = "clickup_get_task.parent.reassigned"; // t000000001, root, 2 subtasks
const CHILD = "clickup_get_task.child"; // t000000002, parent t000000001, "to do", sandbox-a
const CHILD_DONE = "clickup_get_task.child.complete"; // t000000002, "complete"
const MOVED = "clickup_get_task.mover.moved"; // t000000004, root, "to do", sandbox-b
const REPARENTED = "clickup_get_task.orphan.reparented"; // t000000005, parent t000000001

const recorded: CallRecord[][] = [];

// Every call of every test in this file carries the workspace id.
afterEach(() => {
  for (const calls of recorded.splice(0)) expectWorkspaceOnEveryCall(calls, WS);
});

function setup(responses: Record<string, unknown>, config: ClickUpConfig = CONFIG) {
  const { mcp, calls } = makeMcp(new Map(Object.entries(responses)));
  recorded.push(calls);
  return { transport: createClickUpTransport({ mcp, config }), calls };
}

const getTask = (taskId: string) => ({
  tool: "clickup_get_task",
  args: { task_id: taskId, workspace_id: WS },
});
const updateStatus = (taskId: string, status: string) => ({
  tool: "clickup_update_task",
  args: { task_id: taskId, status, workspace_id: WS },
});

// ---------------------------------------------------------------------------
// task.move to a role: open | wip | done → the pinned status of the task's list
// ---------------------------------------------------------------------------

describe("taskMove — role targets", () => {
  it("move wip resolves the list's pinned status", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskMove({ taskId: "t000000001", targetListOrSectionId: "wip" });
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: "to do", newListOrSectionId: "in progress" },
    });
    // The real task is read first; only then the status is written.
    expect(calls).toEqual([getTask("t000000001"), updateStatus("t000000001", "in progress")]);
  });

  it("role words are case-insensitive and trimmed", async () => {
    for (const [target, status] of [
      [" WIP ", "in progress"],
      ["Done", "complete"],
    ] as const) {
      const { transport, calls } = setup({
        clickup_get_task: task(PARENT),
        clickup_update_task: UPDATED,
      });
      const result = await transport.taskMove({
        taskId: "t000000001",
        targetListOrSectionId: target,
      });
      expect(result.ok).toBe(true);
      expect(calls[1]).toEqual(updateStatus("t000000001", status));
    }
  });

  it("resolves the role from the task's own home list", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(MOVED, { status: "backlog" }),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskMove({
      taskId: "t000000004",
      targetListOrSectionId: "done",
    });
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: "backlog", newListOrSectionId: "shipped" },
    });
    expect(calls[1]).toEqual(updateStatus("t000000004", "shipped"));
  });

  it("move to the current status is ALREADY_IN_STATE", async () => {
    for (const [fixture, status, target] of [
      [PARENT, "to do", "open"],
      [PARENT, "  TO DO ", "open"], // status names compare case-insensitively, trimmed
      [CHILD_DONE, "complete", "done"],
    ] as const) {
      const { transport, calls } = setup({ clickup_get_task: task(fixture, { status }) });
      const result = await transport.taskMove({ taskId: "t1", targetListOrSectionId: target });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("ALREADY_IN_STATE");
      expect(calls.map((c) => c.tool)).toEqual(["clickup_get_task"]);
    }
  });

  it("a done task moved to open or wip is reopened", async () => {
    for (const [target, status] of [
      ["open", "to do"],
      ["wip", "in progress"],
    ] as const) {
      const { transport, calls } = setup({
        clickup_get_task: task(CHILD_DONE),
        clickup_update_task: UPDATED,
      });
      const result = await transport.taskMove({
        taskId: "t000000002",
        targetListOrSectionId: target,
      });
      expect(result).toEqual({
        ok: true,
        data: { previousListOrSectionId: "complete", newListOrSectionId: status },
      });
      expect(calls[1]).toEqual(updateStatus("t000000002", status));
    }
  });

  it("move to a pinned status the list rejects ({error:'Failed to update task: Status does not exist'}) is INVALID_REQUEST status_rejected", async () => {
    // A pinned status renamed or removed after init fails closed, resolved or thrown.
    for (const rejection of [
      STATUS_ERROR,
      new Error("Failed to update task: Status does not exist"),
    ]) {
      const { transport, calls } = setup({
        clickup_get_task: task(PARENT),
        clickup_update_task: rejection,
      });
      const result = await transport.taskMove({
        taskId: "t000000001",
        targetListOrSectionId: "wip",
      });
      expect(result).toEqual({
        ok: false,
        code: "INVALID_REQUEST",
        details: {
          verb: "task.move",
          reason: "status_rejected",
          status: "in progress",
          listId: LIST_A,
          message: expect.any(String),
        },
      });
      expect(calls).toHaveLength(2);
    }
  });

  it("other update_task errors go through classifyError, never swallowed", async () => {
    for (const [resp, code] of [
      [new Error("403 Forbidden"), "AUTH_ERROR"],
      [{ error: "Task not found" }, "NOT_FOUND"],
      [new Error("429 Too Many Requests"), "RATE_LIMITED"],
      [new Error("socket hang up"), "MCP_ERROR"],
    ] as const) {
      const { transport } = setup({ clickup_get_task: task(PARENT), clickup_update_task: resp });
      const result = await transport.taskMove({
        taskId: "t000000001",
        targetListOrSectionId: "wip",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(code);
        expect(Object.keys(result.details ?? {})).toEqual(["message"]);
      }
    }
  });

  it("list_not_configured for a hand-made task", async () => {
    const { transport, calls } = setup({ clickup_get_task: task(MOVED) }, CONFIG_A_ONLY);
    const result = await transport.taskMove({
      taskId: "t000000004",
      targetListOrSectionId: "wip",
    });
    expect(result).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      details: {
        verb: "task.move",
        reason: "list_not_configured",
        listId: LIST_B,
        message: expect.any(String),
      },
    });
    expect(calls).toEqual([getTask("t000000004")]);
  });

  it("role_not_configured when wip absent", async () => {
    const { transport, calls } = setup({ clickup_get_task: task(MOVED) });
    const result = await transport.taskMove({
      taskId: "t000000004",
      targetListOrSectionId: "wip",
    });
    expect(result).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      details: {
        verb: "task.move",
        reason: "role_not_configured",
        listId: LIST_B,
        role: "wip",
        message: expect.any(String),
      },
    });
    expect(calls).toEqual([getTask("t000000004")]);
  });

  it("a target that is neither a role nor a list id is INVALID_REQUEST with no call", async () => {
    for (const target of [
      "in progress",
      "12345",
      "",
      "  ",
      "todo",
      "list-900400000",
      "constructor",
      "__proto__",
    ]) {
      const { transport, calls } = setup({});
      const result = await transport.taskMove({ taskId: "t1", targetListOrSectionId: target });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_REQUEST");
        expect(result.details).toMatchObject({ verb: "task.move", reason: "invalid_target" });
        if (target.trim() !== "") expect(JSON.stringify(result.details)).not.toContain(target);
      }
      expect(calls).toHaveLength(0);
    }
  });

  it("a get_task failure is classified and nothing is written", async () => {
    const { transport, calls } = setup({ clickup_get_task: { error: "Task not found" } });
    const result = await transport.taskMove({ taskId: "t9", targetListOrSectionId: "wip" });
    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      details: { message: "Task not found" },
    });
    expect(calls).toEqual([getTask("t9")]);
  });

  it("a read that is not a task (a write envelope) is a shape error, never trusted", async () => {
    // An envelope defaults parentId to null and has no list or status.
    const { transport, calls } = setup({ clickup_get_task: UPDATED });
    const result = await transport.taskMove({
      taskId: "t000000002",
      targetListOrSectionId: "wip",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MCP_ERROR");
      expect(result.details).toMatchObject({ verb: "task.move" });
    }
    expect(calls).toHaveLength(1);
  });

  it("a subtask moves by role: already in the status is ALREADY_IN_STATE, not subtask_cannot_move", async () => {
    // The root-only rule applies to list moves; a subtask's status moves freely.
    const same = setup({ clickup_get_task: task(CHILD) });
    const noop = await same.transport.taskMove({
      taskId: "t000000002",
      targetListOrSectionId: "open",
    });
    expect(noop.ok === false && noop.code).toBe("ALREADY_IN_STATE");
    expect(same.calls).toEqual([getTask("t000000002")]);

    const wip = setup({ clickup_get_task: task(CHILD), clickup_update_task: UPDATED });
    const moved = await wip.transport.taskMove({
      taskId: "t000000002",
      targetListOrSectionId: "wip",
    });
    expect(moved).toEqual({
      ok: true,
      data: { previousListOrSectionId: "to do", newListOrSectionId: "in progress" },
    });
    expect(wip.calls[1]).toEqual(updateStatus("t000000002", "in progress"));
  });

  it("an empty or non-string taskId is INVALID_REQUEST with no call", async () => {
    for (const taskId of ["", "   ", undefined, 42]) {
      const { transport, calls } = setup({});
      const result = await transport.taskMove({
        taskId: taskId as string,
        targetListOrSectionId: "wip",
      });
      expect(result.ok === false && result.details).toMatchObject({
        verb: "task.move",
        reason: "id_required",
        field: "taskId",
      });
      expect(calls).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// task.move to a numeric list id → clickup_move_task (root tasks only)
// ---------------------------------------------------------------------------

describe("taskMove — list id targets", () => {
  it("move with a numeric list id calls move_task", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT),
      clickup_move_task: mcpFixture("clickup_move_task"),
    });
    const result = await transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: LIST_B,
    });
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: LIST_A, newListOrSectionId: LIST_B },
    });
    expect(calls).toEqual([
      getTask("t000000001"),
      {
        tool: "clickup_move_task",
        args: { task_id: "t000000001", list_id: LIST_B, workspace_id: WS },
      },
    ]);
  });

  it("reports new_list_id, falling back to the requested id", async () => {
    const moved = await (async () => {
      const { transport } = setup({
        clickup_get_task: task(PARENT),
        clickup_move_task: {
          success: true,
          task_id: "t000000001",
          new_list_id: "1000400000000077",
        },
      });
      return transport.taskMove({ taskId: "t000000001", targetListOrSectionId: LIST_B });
    })();
    expect(moved.ok && moved.data.newListOrSectionId).toBe("1000400000000077");

    const { transport } = setup({
      clickup_get_task: task(PARENT),
      clickup_move_task: { success: true, task_id: "t000000001", custom_id: null },
    });
    const fallback = await transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: LIST_B,
    });
    expect(fallback.ok && fallback.data.newListOrSectionId).toBe(LIST_B);
  });

  it("move of a subtask by list id is INVALID_REQUEST", async () => {
    for (const [fixture, id] of [
      [CHILD, "t000000002"],
      [REPARENTED, "t000000005"], // a root task reparented later is a subtask now
    ] as const) {
      const { transport, calls } = setup({ clickup_get_task: task(fixture) });
      const result = await transport.taskMove({ taskId: id, targetListOrSectionId: LIST_B });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_REQUEST");
        expect(result.details).toMatchObject({ verb: "task.move", reason: "subtask_cannot_move" });
      }
      expect(calls).toEqual([getTask(id)]);
    }
  });

  it("a root task with subtasks moves by list id", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT_WITH_SUBTASKS),
      clickup_move_task: mcpFixture("clickup_move_task"),
    });
    const result = await transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: LIST_B,
    });
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: LIST_A, newListOrSectionId: LIST_B },
    });
    expect(calls.map((c) => c.tool)).toEqual(["clickup_get_task", "clickup_move_task"]);
  });

  it("a read without a parent key, or with a non-id parent, is a shape error and nothing moves", async () => {
    // Absent `parent` would read as a root task and let a subtask reach move_task.
    for (const read of [
      taskWithout(CHILD, "parent"),
      task(CHILD, { parent: { id: "t000000001" } }),
    ]) {
      const { transport, calls } = setup({ clickup_get_task: read });
      const result = await transport.taskMove({
        taskId: "t000000002",
        targetListOrSectionId: LIST_B,
      });
      expect(result.ok === false && result.code).toBe("MCP_ERROR");
      expect(result.ok === false && result.details).toMatchObject({ verb: "task.move" });
      expect(calls).toEqual([getTask("t000000002")]);
    }
  });

  it("move to the list the task is already in is ALREADY_IN_STATE", async () => {
    const { transport, calls } = setup({ clickup_get_task: task(PARENT) });
    const result = await transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: LIST_A,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ALREADY_IN_STATE");
    expect(calls).toHaveLength(1);
  });

  it("move_task errors are classified", async () => {
    const { transport } = setup({
      clickup_get_task: task(PARENT),
      clickup_move_task: { error: "403 Forbidden" },
    });
    const result = await transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: LIST_B,
    });
    expect(result).toEqual({
      ok: false,
      code: "AUTH_ERROR",
      details: { message: "403 Forbidden" },
    });
  });
});

// ---------------------------------------------------------------------------
// task.close → the list's pinned `done` status
// ---------------------------------------------------------------------------

describe("taskClose", () => {
  it("close uses the done status and is a no-op when already done", async () => {
    const open = setup({ clickup_get_task: task(PARENT), clickup_update_task: UPDATED });
    const closed = await open.transport.taskClose({ taskId: "t000000001" });
    expect(closed).toEqual({ ok: true, data: { closed: true } });
    expect(open.calls).toEqual([getTask("t000000001"), updateStatus("t000000001", "complete")]);

    const done = setup({ clickup_get_task: task(CHILD_DONE, { status: "Complete " }) });
    const again = await done.transport.taskClose({ taskId: "t000000002" });
    expect(again).toEqual({ ok: true, data: { closed: true } });
    expect(done.calls).toEqual([getTask("t000000002")]);
  });

  it("a task at the pinned closed status counts as closed: no write, never turned into done", async () => {
    for (const status of ["cancelled", " Cancelled "]) {
      const { transport, calls } = setup({ clickup_get_task: task(PARENT, { status }) });
      const result = await transport.taskClose({ taskId: "t000000001" });
      expect(result).toEqual({ ok: true, data: { closed: true } });
      expect(calls).toEqual([getTask("t000000001")]);
    }
  });

  it("an empty or non-string taskId is INVALID_REQUEST with no call", async () => {
    for (const taskId of ["", "  ", null]) {
      const { transport, calls } = setup({});
      const result = await transport.taskClose({ taskId: taskId as string });
      expect(result.ok === false && result.details).toMatchObject({
        verb: "task.close",
        reason: "id_required",
        field: "taskId",
      });
      expect(calls).toHaveLength(0);
    }
  });

  it("a rejected done status is INVALID_REQUEST status_rejected; other errors are classified", async () => {
    const rejected = setup({ clickup_get_task: task(PARENT), clickup_update_task: STATUS_ERROR });
    const result = await rejected.transport.taskClose({ taskId: "t000000001" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_REQUEST");
      expect(result.details).toMatchObject({
        verb: "task.close",
        reason: "status_rejected",
        status: "complete",
        listId: LIST_A,
      });
    }

    const refused = setup({
      clickup_get_task: task(PARENT),
      clickup_update_task: new Error("Task has required custom fields"),
    });
    const other = await refused.transport.taskClose({ taskId: "t000000001" });
    expect(other).toEqual({
      ok: false,
      code: "MCP_ERROR",
      details: { message: "Task has required custom fields" },
    });
  });

  it("close of a task in an unconfigured list is list_not_configured", async () => {
    const { transport, calls } = setup({ clickup_get_task: task(MOVED) }, CONFIG_A_ONLY);
    const result = await transport.taskClose({ taskId: "t000000004" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_REQUEST");
      expect(result.details).toMatchObject({ reason: "list_not_configured", listId: LIST_B });
    }
    expect(calls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// checklist.check → a subtask's status (itemId = subtask, checklistId = parent)
// ---------------------------------------------------------------------------

describe("checklistCheck", () => {
  it("checklist.check completes and reopens a subtask", async () => {
    const todo = setup({ clickup_get_task: task(CHILD), clickup_update_task: UPDATED });
    const completed = await todo.transport.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "complete",
    });
    expect(completed).toEqual({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
    // The subtask (itemId) is read and written, never the parent.
    expect(todo.calls).toEqual([getTask("t000000002"), updateStatus("t000000002", "complete")]);

    const done = setup({ clickup_get_task: task(CHILD_DONE), clickup_update_task: UPDATED });
    const reopened = await done.transport.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "incomplete",
    });
    expect(reopened).toEqual({
      ok: true,
      data: { previousState: "complete", newState: "incomplete" },
    });
    expect(done.calls).toEqual([getTask("t000000002"), updateStatus("t000000002", "to do")]);
  });

  it("an item already in the target state is ALREADY_IN_STATE with no write", async () => {
    for (const [fixture, status, targetState] of [
      [CHILD_DONE, "complete", "complete"],
      [CHILD, "to do", "incomplete"],
      [CHILD, "in progress", "incomplete"], // not the done status → incomplete
    ] as const) {
      const { transport, calls } = setup({ clickup_get_task: task(fixture, { status }) });
      const result = await transport.checklistCheck({
        taskId: "t000000001",
        checklistId: "t000000001",
        itemId: "t000000002",
        targetState,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("ALREADY_IN_STATE");
      expect(calls).toEqual([getTask("t000000002")]);
    }
  });

  it("checklist.check rejects an item whose parent differs", async () => {
    for (const [fixture, checklistId] of [
      [CHILD, "t000000009"], // a subtask of another task
      [PARENT, "t000000009"], // a root task is no checklist item
    ] as const) {
      const { transport, calls } = setup({ clickup_get_task: task(fixture) });
      const result = await transport.checklistCheck({
        taskId: checklistId,
        checklistId,
        itemId: "t000000002",
        targetState: "complete",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_REQUEST");
        expect(result.details).toMatchObject({
          verb: "checklist.check",
          reason: "not_a_checklist_item",
        });
        expect(JSON.stringify(result.details)).not.toMatch(/t000000009|t000000002/);
      }
      expect(calls).toHaveLength(1);
    }
  });

  it("a rejected status, an unconfigured list and an invalid targetState fail closed", async () => {
    const rejected = setup({ clickup_get_task: task(CHILD), clickup_update_task: STATUS_ERROR });
    const r1 = await rejected.transport.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "complete",
    });
    expect(r1.ok === false && r1.details).toMatchObject({
      reason: "status_rejected",
      status: "complete",
      listId: LIST_A,
    });

    const elsewhere = setup(
      { clickup_get_task: task(CHILD, { list: { id: LIST_B, name: "sandbox-b" } }) },
      CONFIG_A_ONLY,
    );
    const r2 = await elsewhere.transport.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "complete",
    });
    expect(r2.ok === false && r2.details).toMatchObject({
      reason: "list_not_configured",
      listId: LIST_B,
    });
    expect(elsewhere.calls).toHaveLength(1);

    const invalid = setup({});
    const r3 = await invalid.transport.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "done" as "complete",
    });
    expect(r3.ok === false && r3.code).toBe("INVALID_REQUEST");
    expect(invalid.calls).toHaveLength(0);
  });

  it("a read whose status is missing or not a name is a shape error, never ALREADY_IN_STATE", async () => {
    // A missing status would read as "incomplete" and skip the reopen silently.
    for (const read of [
      taskWithout(CHILD_DONE, "status"),
      task(CHILD_DONE, { status: { status: "complete", type: "done" } }),
    ]) {
      const { transport, calls } = setup({ clickup_get_task: read });
      const result = await transport.checklistCheck({
        taskId: "t000000001",
        checklistId: "t000000001",
        itemId: "t000000002",
        targetState: "incomplete",
      });
      expect(result.ok === false && result.code).toBe("MCP_ERROR");
      expect(result.ok === false && result.details).toMatchObject({ verb: "checklist.check" });
      expect(calls).toEqual([getTask("t000000002")]);
    }
  });

  it("an empty or non-string itemId or checklistId is INVALID_REQUEST with no call", async () => {
    for (const [itemId, checklistId, field] of [
      ["", "t000000001", "itemId"],
      [undefined, "t000000001", "itemId"],
      ["t000000002", "  ", "checklistId"],
      ["t000000002", null, "checklistId"],
    ] as const) {
      const { transport, calls } = setup({});
      const result = await transport.checklistCheck({
        taskId: "t000000001",
        checklistId: checklistId as unknown as string,
        itemId: itemId as unknown as string,
        targetState: "complete",
      });
      expect(result.ok === false && result.details).toMatchObject({
        verb: "checklist.check",
        reason: "id_required",
        field,
      });
      expect(calls).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Localized status names: sent exactly as pinned, compared case-insensitively.
// ---------------------------------------------------------------------------

describe("localized statuses", () => {
  const PT_BR: ClickUpConfig = {
    ...CONFIG,
    lists: [
      {
        id: LIST_A,
        name: "sandbox-a",
        statuses: { open: "a fazer", wip: "em andamento", done: "concluído" },
      },
    ],
  };

  it("localized status names pass through verbatim", async () => {
    const move = setup(
      { clickup_get_task: task(PARENT, { status: "a fazer" }), clickup_update_task: UPDATED },
      PT_BR,
    );
    const moved = await move.transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: "wip",
    });
    expect(moved).toEqual({
      ok: true,
      data: { previousListOrSectionId: "a fazer", newListOrSectionId: "em andamento" },
    });
    expect(move.calls[1]).toEqual(updateStatus("t000000001", "em andamento"));

    const close = setup(
      { clickup_get_task: task(PARENT, { status: "em andamento" }), clickup_update_task: UPDATED },
      PT_BR,
    );
    const closed = await close.transport.taskClose({ taskId: "t000000001" });
    expect(closed).toEqual({ ok: true, data: { closed: true } });
    expect(close.calls[1]).toEqual(updateStatus("t000000001", "concluído"));

    const same = setup({ clickup_get_task: task(PARENT, { status: "A Fazer" }) }, PT_BR);
    const noop = await same.transport.taskMove({
      taskId: "t000000001",
      targetListOrSectionId: "open",
    });
    expect(noop.ok === false && noop.code).toBe("ALREADY_IN_STATE");

    const check = setup({ clickup_get_task: task(CHILD, { status: "Concluído" }) }, PT_BR);
    const checked = await check.transport.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "complete",
    });
    expect(checked.ok === false && checked.code).toBe("ALREADY_IN_STATE");
  });
});
