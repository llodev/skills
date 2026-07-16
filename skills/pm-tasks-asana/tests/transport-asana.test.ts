import { describe, it, expect } from "vitest";
import { createAsanaTransport, type McpCaller } from "../src/transport-asana.js";

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

function makeMcp(responses: Map<string, unknown>): { mcp: McpCaller; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const mcp: McpCaller = async (tool, args) => {
    calls.push({ tool, args });
    if (responses.has(tool)) {
      const resp = responses.get(tool);
      if (resp instanceof Error) throw resp;
      return resp;
    }
    throw new Error(`Unexpected MCP call: ${tool}`);
  };
  return { mcp, calls };
}

// ---------------------------------------------------------------------------
// 1. taskCreate
// ---------------------------------------------------------------------------

describe("createAsanaTransport — taskCreate", () => {
  it("success: dispatches create_tasks and returns gid + permalink_url", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        [
          "mcp__claude_ai_Asana__create_tasks",
          { tasks: [{ gid: "task1", permalink_url: "https://app.asana.com/0/p/task1" }] },
        ],
      ]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "projX",
      listOrSectionId: "secY",
      name: "Hello",
      description: "world",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__create_tasks");
    expect(calls[0].args).toEqual({
      tasks: [
        {
          name: "Hello",
          notes: "world",
          memberships: [{ project: "projX", section: "secY" }],
        },
      ],
    });
    expect(result).toEqual({
      ok: true,
      data: { id: "task1", url: "https://app.asana.com/0/p/task1" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__claude_ai_Asana__create_tasks", new Error("boom")]]));
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "p",
      listOrSectionId: "s",
      name: "n",
    });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "boom" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__create_tasks", new Error("Asana returned 404 not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "p",
      listOrSectionId: "s",
      name: "n",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: clientToken embeds [ct:<token>] prefix in notes", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__create_tasks", { tasks: [{ gid: "task1" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    await transport.taskCreate({
      boardOrProjectId: "p",
      listOrSectionId: "s",
      name: "n",
      description: "body",
      clientToken: "tok-1",
    });
    const sent = calls[0].args.tasks as Array<Record<string, unknown>>;
    expect(sent[0].notes).toBe("[ct:tok-1] body");
  });

  it("special: no description AND no clientToken → notes key is absent", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__create_tasks", { tasks: [{ gid: "task1" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    await transport.taskCreate({
      boardOrProjectId: "p",
      listOrSectionId: "s",
      name: "n",
    });
    const sent = calls[0].args.tasks as Array<Record<string, unknown>>;
    expect(Object.prototype.hasOwnProperty.call(sent[0], "notes")).toBe(false);
  });

  it("maps req.dueDate to due_on (YYYY-MM-DD) on the create_tasks payload", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__create_tasks", { tasks: [{ gid: "task1" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    await transport.taskCreate({
      boardOrProjectId: "p",
      listOrSectionId: "s",
      name: "n",
      dueDate: "2026-07-20T00:00:00.000Z",
    });
    const sent = calls[0].args.tasks as Array<Record<string, unknown>>;
    expect(sent[0].due_on).toBe("2026-07-20");
  });

  it("omits due_on when dueDate is absent", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__create_tasks", { tasks: [{ gid: "task1" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    await transport.taskCreate({ boardOrProjectId: "p", listOrSectionId: "s", name: "n" });
    const sent = calls[0].args.tasks as Array<Record<string, unknown>>;
    expect(Object.prototype.hasOwnProperty.call(sent[0], "due_on")).toBe(false);
  });

  it("short-circuits to INVALID_REQUEST (no MCP call) when dueDate is malformed", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__create_tasks", { tasks: [{ gid: "task1" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "p",
      listOrSectionId: "s",
      name: "n",
      dueDate: "not-a-date",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_REQUEST");
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. taskMove
// ---------------------------------------------------------------------------

describe("createAsanaTransport — taskMove", () => {
  it("success: dispatches update_tasks with memberships and returns null previous + new target", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "task1" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskMove({ taskId: "task1", targetListOrSectionId: "secZ" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(calls[0].args).toEqual({
      updates: [{ task: "task1", memberships: [{ project: "", section: "secZ" }] }],
    });
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: null, newListOrSectionId: "secZ" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", new Error("server crashed")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskMove({ taskId: "t", targetListOrSectionId: "s" });
    expect(result).toEqual({
      ok: false,
      code: "MCP_ERROR",
      details: { message: "server crashed" },
    });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", new Error("404 not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskMove({ taskId: "t", targetListOrSectionId: "s" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 3. checklistCheck
// ---------------------------------------------------------------------------

describe("createAsanaTransport — checklistCheck", () => {
  it("success: dispatches update_tasks on subtask gid and infers previous state", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "sub1", completed: true }] }],
      ]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.checklistCheck({
      taskId: "parent1",
      checklistId: "ignored",
      itemId: "sub1",
      targetState: "complete",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(calls[0].args).toEqual({
      updates: [{ task: "sub1", completed: true }],
    });
    expect(result).toEqual({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", new Error("bad")]]));
    const transport = createAsanaTransport({ mcp });
    const result = await transport.checklistCheck({
      taskId: "p",
      checklistId: "cl",
      itemId: "sub",
      targetState: "complete",
    });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "bad" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", new Error("404 not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.checklistCheck({
      taskId: "p",
      checklistId: "cl",
      itemId: "sub",
      targetState: "incomplete",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 4. taskClose
// ---------------------------------------------------------------------------

describe("createAsanaTransport — taskClose", () => {
  it("success: dispatches update_tasks with completed:true and returns closed:true (no movedToListOrSectionId)", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "t", completed: true }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskClose({ taskId: "t" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(calls[0].args).toEqual({
      updates: [{ task: "t", completed: true }],
    });
    expect(result).toEqual({ ok: true, data: { closed: true } });
    if (result.ok) {
      expect(Object.prototype.hasOwnProperty.call(result.data, "movedToListOrSectionId")).toBe(
        false,
      );
    }
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", new Error("nope")]]));
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskClose({ taskId: "t" });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "nope" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", new Error("404 not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskClose({ taskId: "t" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: closeListOrSectionId is IGNORED — single update_tasks call, no section change in args, no movedToListOrSectionId key", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "t", completed: true }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskClose({ taskId: "t", closeListOrSectionId: "doneSec" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(calls[0].args).toEqual({
      updates: [{ task: "t", completed: true }],
    });
    const argsStr = JSON.stringify(calls[0].args);
    expect(argsStr.includes("doneSec")).toBe(false);
    expect(argsStr.includes("memberships")).toBe(false);
    expect(result).toEqual({ ok: true, data: { closed: true } });
    if (result.ok) {
      expect(Object.prototype.hasOwnProperty.call(result.data, "movedToListOrSectionId")).toBe(
        false,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 5. taskDueDateSet
// ---------------------------------------------------------------------------

describe("createAsanaTransport — taskDueDateSet", () => {
  it("success: converts ISO to YYYY-MM-DD for due_on and returns original ISO as newDueAt", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "t", due_on: "2026-06-22" }] }],
      ]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskDueDateSet({
      taskId: "t",
      dueAt: "2026-06-22T15:30:00.000Z",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(calls[0].args).toEqual({
      updates: [{ task: "t", due_on: "2026-06-22" }],
    });
    expect(result).toEqual({
      ok: true,
      data: { previousDueAt: null, newDueAt: "2026-06-22T15:30:00.000Z" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", new Error("err")]]));
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskDueDateSet({
      taskId: "t",
      dueAt: "2026-01-01T00:00:00Z",
    });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "err" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", new Error("task not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskDueDateSet({
      taskId: "t",
      dueAt: "2026-01-01T00:00:00Z",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: full ISO with milliseconds and Z suffix is sliced to YYYY-MM-DD; data.newDueAt is the original ISO string", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "t" }] }]]),
    );
    const transport = createAsanaTransport({ mcp });
    const iso = "2026-12-31T23:59:59.999Z";
    const result = await transport.taskDueDateSet({ taskId: "t", dueAt: iso });
    expect(calls).toHaveLength(1);
    const sent = calls[0].args.updates as Array<Record<string, unknown>>;
    expect(sent[0].due_on).toBe("2026-12-31");
    expect(result).toEqual({
      ok: true,
      data: { previousDueAt: null, newDueAt: iso },
    });
  });

  it("special: malformed dueAt short-circuits to INVALID_REQUEST without calling MCP", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskDueDateSet({ taskId: "t", dueAt: "not-a-date" });
    expect(calls).toHaveLength(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_REQUEST");
      expect(result.details).toMatchObject({ verb: "taskDueDateSet" });
    }

    const result2 = await transport.taskDueDateSet({ taskId: "t", dueAt: "" });
    expect(calls).toHaveLength(0);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.code).toBe("INVALID_REQUEST");
      expect(result2.details).toMatchObject({ verb: "taskDueDateSet" });
    }
  });
});

// ---------------------------------------------------------------------------
// 6. taskAssigneeAdd
// ---------------------------------------------------------------------------

describe("createAsanaTransport — taskAssigneeAdd", () => {
  it("success: dispatches update_tasks with assignee and returns [userId] as currentAssigneeIds", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["mcp__claude_ai_Asana__update_tasks", { tasks: [{ gid: "t", assignee: { gid: "u1" } }] }],
      ]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskAssigneeAdd({ taskId: "t", userId: "u1" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(calls[0].args).toEqual({
      updates: [{ task: "t", assignee: "u1" }],
    });
    expect(result).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["u1"] },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", new Error("err")]]));
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskAssigneeAdd({ taskId: "t", userId: "u" });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "err" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__update_tasks", new Error("user not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskAssigneeAdd({ taskId: "t", userId: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 7. taskCommentAdd
// ---------------------------------------------------------------------------

describe("createAsanaTransport — taskCommentAdd", () => {
  it("success: dispatches add_comment and returns commentId + postedAt from created_at", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        [
          "mcp__claude_ai_Asana__add_comment",
          { gid: "story1", created_at: "2026-06-22T20:00:00Z" },
        ],
      ]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCommentAdd({ taskId: "t", text: "hello" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__claude_ai_Asana__add_comment");
    expect(calls[0].args).toEqual({ task: "t", text: "hello" });
    expect(result).toEqual({
      ok: true,
      data: { commentId: "story1", postedAt: "2026-06-22T20:00:00Z" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__claude_ai_Asana__add_comment", new Error("err")]]));
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCommentAdd({ taskId: "t", text: "hi" });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "err" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__claude_ai_Asana__add_comment", new Error("task not found")]]),
    );
    const transport = createAsanaTransport({ mcp });
    const result = await transport.taskCommentAdd({ taskId: "t", text: "hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: clientToken prefixes [ct:<token>] to text", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__claude_ai_Asana__add_comment", { gid: "x" }]]));
    const transport = createAsanaTransport({ mcp });
    await transport.taskCommentAdd({ taskId: "t", text: "hi", clientToken: "tok-9" });
    expect(calls[0].args.text).toBe("[ct:tok-9] hi");
  });

  it("special: no clientToken → text has NO prefix", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__claude_ai_Asana__add_comment", { gid: "x" }]]));
    const transport = createAsanaTransport({ mcp });
    await transport.taskCommentAdd({ taskId: "t", text: "hi" });
    expect(calls[0].args.text).toBe("hi");
  });
});
