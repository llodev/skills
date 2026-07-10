import { describe, it, expect } from "vitest";
import { createTrelloTransport, type McpCaller } from "../src/transport-trello.js";

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

describe("createTrelloTransport — taskCreate", () => {
  it("success: dispatches create_card and returns id + url", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__trello__create_card", { id: "card1", url: "https://trello.com/c/abc" }]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "boardX",
      listOrSectionId: "listY",
      name: "Hello",
      description: "world",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__create_card");
    expect(calls[0].args).toEqual({ listId: "listY", name: "Hello", desc: "world" });
    expect(result).toEqual({ ok: true, data: { id: "card1", url: "https://trello.com/c/abc" } });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__create_card", new Error("boom")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "b",
      listOrSectionId: "l",
      name: "n",
    });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "boom" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__trello__create_card", new Error("Trello returned 404 not found")]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskCreate({
      boardOrProjectId: "b",
      listOrSectionId: "l",
      name: "n",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: clientToken embeds [ct:<token>] prefix in desc", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__trello__create_card", { id: "card1" }]]));
    const transport = createTrelloTransport({ mcp });
    await transport.taskCreate({
      boardOrProjectId: "b",
      listOrSectionId: "l",
      name: "n",
      description: "body",
      clientToken: "tok-1",
    });
    expect(calls[0].args.desc).toBe("[ct:tok-1] body");
  });
});

// ---------------------------------------------------------------------------
// 2. taskMove
// ---------------------------------------------------------------------------

describe("createTrelloTransport — taskMove", () => {
  it("success: dispatches move_card and returns null previous + new target", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__trello__move_card", { idList: "listZ" }]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskMove({ taskId: "card1", targetListOrSectionId: "listZ" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__move_card");
    expect(calls[0].args).toEqual({ cardId: "card1", idList: "listZ" });
    expect(result).toEqual({
      ok: true,
      data: { previousListOrSectionId: null, newListOrSectionId: "listZ" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__move_card", new Error("server crashed")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskMove({ taskId: "c", targetListOrSectionId: "l" });
    expect(result).toEqual({
      ok: false,
      code: "MCP_ERROR",
      details: { message: "server crashed" },
    });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__move_card", new Error("404 not found")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskMove({ taskId: "c", targetListOrSectionId: "l" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 3. checklistCheck
// ---------------------------------------------------------------------------

describe("createTrelloTransport — checklistCheck", () => {
  it("success: dispatches trello_update_check_item and infers previous state", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__trello__trello_update_check_item", { state: "complete" }]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.checklistCheck({
      taskId: "c",
      checklistId: "cl",
      itemId: "i",
      targetState: "complete",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__trello_update_check_item");
    expect(calls[0].args).toEqual({ cardId: "c", checkItemId: "i", state: "complete" });
    expect(result).toEqual({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__trello_update_check_item", new Error("bad")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.checklistCheck({
      taskId: "c",
      checklistId: "cl",
      itemId: "i",
      targetState: "complete",
    });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "bad" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__trello__trello_update_check_item", new Error("404 not found")]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.checklistCheck({
      taskId: "c",
      checklistId: "cl",
      itemId: "i",
      targetState: "incomplete",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 4. taskClose
// ---------------------------------------------------------------------------

describe("createTrelloTransport — taskClose", () => {
  it("success: dispatches update_card only when no closeListOrSectionId", async () => {
    const { mcp, calls } = makeMcp(
      new Map<string, unknown>([["mcp__trello__update_card", { id: "c", dueComplete: true }]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskClose({ taskId: "c" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__update_card");
    expect(calls[0].args).toEqual({ id: "c", dueComplete: true });
    expect(result).toEqual({ ok: true, data: { closed: true } });
    if (result.ok) {
      expect(Object.prototype.hasOwnProperty.call(result.data, "movedToListOrSectionId")).toBe(
        false,
      );
    }
  });

  it("MCP throws generic Error on update_card → MCP_ERROR (move not attempted)", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__trello__update_card", new Error("nope")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskClose({ taskId: "c", closeListOrSectionId: "done" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__update_card");
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "nope" } });
  });

  it("MCP throws 404 on update_card → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__update_card", new Error("404 not found")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskClose({ taskId: "c" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: dispatches BOTH update_card and move_card in order when closeListOrSectionId provided", async () => {
    const { mcp, calls } = makeMcp(
      new Map<string, unknown>([
        ["mcp__trello__update_card", { id: "c", dueComplete: true }],
        ["mcp__trello__move_card", { idList: "done" }],
      ]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskClose({ taskId: "c", closeListOrSectionId: "done" });
    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("mcp__trello__update_card");
    expect(calls[1].tool).toBe("mcp__trello__move_card");
    expect(calls[1].args).toEqual({ cardId: "c", idList: "done" });
    expect(result).toEqual({
      ok: true,
      data: { closed: true, movedToListOrSectionId: "done" },
    });
  });

  it("special: update_card succeeds but move_card fails → MCP_ERROR with phase:'move' details", async () => {
    const { mcp, calls } = makeMcp(
      new Map<string, unknown>([
        ["mcp__trello__update_card", { id: "c", dueComplete: true }],
        ["mcp__trello__move_card", new Error("network died")],
      ]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskClose({ taskId: "c", closeListOrSectionId: "done" });
    expect(calls).toHaveLength(2);
    expect(result).toEqual({
      ok: false,
      code: "MCP_ERROR",
      details: { phase: "move", message: "network died" },
    });
  });
});

// ---------------------------------------------------------------------------
// 5. taskDueDateSet
// ---------------------------------------------------------------------------

describe("createTrelloTransport — taskDueDateSet", () => {
  it("success: dispatches update_card with due and returns null previous", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__trello__update_card", { due: "2026-07-01T12:00:00Z" }]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskDueDateSet({
      taskId: "c",
      dueAt: "2026-07-01T12:00:00Z",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__update_card");
    expect(calls[0].args).toEqual({ id: "c", due: "2026-07-01T12:00:00Z" });
    expect(result).toEqual({
      ok: true,
      data: { previousDueAt: null, newDueAt: "2026-07-01T12:00:00Z" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__update_card", new Error("err")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskDueDateSet({ taskId: "c", dueAt: "2026-01-01T00:00:00Z" });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "err" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__update_card", new Error("card not found")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskDueDateSet({ taskId: "c", dueAt: "2026-01-01T00:00:00Z" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 6. taskAssigneeAdd
// ---------------------------------------------------------------------------

describe("createTrelloTransport — taskAssigneeAdd", () => {
  it("success: dispatches trello_add_member_to_card and extracts currentAssigneeIds", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__trello__trello_add_member_to_card", { idMembers: ["u1", "u2"] }]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskAssigneeAdd({ taskId: "c", userId: "u2" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__trello_add_member_to_card");
    expect(calls[0].args).toEqual({ cardId: "c", memberId: "u2" });
    expect(result).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["u1", "u2"] },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__trello__trello_add_member_to_card", new Error("err")]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskAssigneeAdd({ taskId: "c", userId: "u" });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "err" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__trello__trello_add_member_to_card", new Error("member not found")]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskAssigneeAdd({ taskId: "c", userId: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 7. taskCommentAdd
// ---------------------------------------------------------------------------

describe("createTrelloTransport — taskCommentAdd", () => {
  it("success: dispatches trello_add_comment and returns commentId + postedAt", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["mcp__trello__trello_add_comment", { id: "comm1", date: "2026-06-22T20:00:00Z" }]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskCommentAdd({ taskId: "c", text: "hello" });
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("mcp__trello__trello_add_comment");
    expect(calls[0].args).toEqual({ cardId: "c", text: "hello" });
    expect(result).toEqual({
      ok: true,
      data: { commentId: "comm1", postedAt: "2026-06-22T20:00:00Z" },
    });
  });

  it("MCP throws generic Error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["mcp__trello__trello_add_comment", new Error("err")]]));
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskCommentAdd({ taskId: "c", text: "hi" });
    expect(result).toEqual({ ok: false, code: "MCP_ERROR", details: { message: "err" } });
  });

  it("MCP throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([["mcp__trello__trello_add_comment", new Error("card not found")]]),
    );
    const transport = createTrelloTransport({ mcp });
    const result = await transport.taskCommentAdd({ taskId: "c", text: "hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("special: clientToken prefixes [ct:<token>] to text", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__trello__trello_add_comment", { id: "x" }]]));
    const transport = createTrelloTransport({ mcp });
    await transport.taskCommentAdd({ taskId: "c", text: "hi", clientToken: "tok-9" });
    expect(calls[0].args.text).toBe("[ct:tok-9] hi");
  });

  it("special: no clientToken → text has NO prefix", async () => {
    const { mcp, calls } = makeMcp(new Map([["mcp__trello__trello_add_comment", { id: "x" }]]));
    const transport = createTrelloTransport({ mcp });
    await transport.taskCommentAdd({ taskId: "c", text: "hi" });
    expect(calls[0].args.text).toBe("hi");
  });
});
