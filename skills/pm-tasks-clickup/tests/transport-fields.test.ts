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

const CONFIG: ClickUpConfig = {
  version: "1",
  workspace: { id: WS, name: "Workspace" },
  lists: [
    {
      id: LIST_A,
      name: "sandbox-a",
      statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
    },
  ],
};

const UPDATED = mcpFixture("clickup_update_task"); // {success, task_id, custom_id, task_url}
const USER = mcpFixture("clickup_get_user") as Record<string, unknown>; // utc_offset "-03:00"
const COMMENTS = mcpFixture("clickup_get_task_comments"); // one comment, "[ct:spike0002] spike comment\n"
const COMMENT_CREATED = mcpFixture("clickup_create_comment"); // {success, comment_id: "1000400000000901"}

/** A real `get_task` capture, optionally with fields overridden. */
function task(name: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(mcpFixture(name) as Record<string, unknown>), ...overrides };
}

/** A real `get_task` capture with one key removed: a partial read. */
function taskWithout(name: string, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(task(name)).filter(([k]) => k !== key));
}

// t000000001, root, assignee 100000001, due 1795762800000 (2026-11-27T07:00Z: 04:00 at -03:00)
const PARENT = "clickup_get_task.parent";
// t000000002, parent t000000001, no assignee, no due date
const CHILD = "clickup_get_task.child";
// t000000003, parent t000000001, due 1796108400000 (2026-12-01T07:00Z: 04:00 at -03:00)
const CHILD_DATES = "clickup_get_task.child2.dates";
// t000000005, reparented under t000000001
const REPARENTED = "clickup_get_task.orphan.reparented";

const recorded: CallRecord[][] = [];

// Every call of every test in this file carries the workspace id.
afterEach(() => {
  for (const calls of recorded.splice(0)) expectWorkspaceOnEveryCall(calls, WS);
});

function setup(responses: Record<string, unknown>) {
  const { mcp, calls } = makeMcp(new Map(Object.entries(responses)));
  recorded.push(calls);
  return { transport: createClickUpTransport({ mcp, config: CONFIG }), calls };
}

const tools = (calls: CallRecord[]) => calls.map((c) => c.tool);
const getTask = (taskId: string) => ({
  tool: "clickup_get_task",
  args: { task_id: taskId, workspace_id: WS },
});
const GET_USER = { tool: "clickup_get_user", args: { workspace_id: WS } };
const update = (args: Record<string, unknown>) => ({
  tool: "clickup_update_task",
  args: { ...args, workspace_id: WS },
});

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const STORED = "2026-11-27T07:00:00.000Z"; // PARENT's due date as an ISO instant

// ---------------------------------------------------------------------------
// task.due-date.set → clickup_update_task {due_date: YYYY-MM-DD}
// ---------------------------------------------------------------------------

describe("taskDueDateSet", () => {
  it("due date writes YYYY-MM-DD and skips when the local date is unchanged (offset from get_user, cached once)", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT),
      clickup_get_user: USER,
      clickup_update_task: UPDATED,
    });

    // Stored 04:00 local on 2026-11-27: the same local date is a no-op.
    const same = await transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" });
    expect(same).toEqual({ ok: true, data: { previousDueAt: STORED, newDueAt: "2026-11-27" } });
    expect(calls).toEqual([getTask("t000000001"), GET_USER]);

    // Another date is written as its YYYY-MM-DD prefix, and newDueAt reports that
    // date (what ClickUp stores), not the time of day; get_user is not read again.
    const moved = await transport.taskDueDateSet({
      taskId: "t000000001",
      dueAt: "2026-11-28T15:30:00-03:00",
    });
    expect(moved).toEqual({
      ok: true,
      data: { previousDueAt: STORED, newDueAt: "2026-11-28" },
    });
    expect(calls.slice(2)).toEqual([
      getTask("t000000001"),
      update({ task_id: "t000000001", due_date: "2026-11-28" }),
    ]);
    expect(tools(calls).filter((t) => t === "clickup_get_user")).toHaveLength(1);
  });

  it("compares the LOCAL date at a positive offset, never the UTC date", async () => {
    // 2026-11-27T19:00Z is 04:00 on 2026-11-28 at +09:00; 2026-11-27T22:30Z is 04:00 on
    // 2026-11-28 at +05:30. The UTC date (2026-11-27) is not the stored local date.
    for (const [offset, instant] of [
      ["+09:00", "2026-11-27T19:00:00.000Z"],
      ["+05:30", "2026-11-27T22:30:00.000Z"],
    ] as const) {
      for (const [dueAt, writes] of [
        ["2026-11-28", false],
        ["2026-11-27", true],
      ] as const) {
        const { transport, calls } = setup({
          clickup_get_task: task(PARENT, { due_date: String(Date.parse(instant)) }),
          clickup_get_user: { ...USER, utc_offset: offset },
          clickup_update_task: UPDATED,
        });
        const result = await transport.taskDueDateSet({ taskId: "t000000001", dueAt });
        expect(result).toEqual({ ok: true, data: { previousDueAt: instant, newDueAt: dueAt } });
        expect(tools(calls).includes("clickup_update_task"), `${offset} ${dueAt}`).toBe(writes);
      }
    }
  });

  it("compares the LOCAL date at a negative offset, never the UTC date", async () => {
    // 2026-11-28T01:00Z is 22:00 on 2026-11-27 at the fixture's -03:00.
    const instant = "2026-11-28T01:00:00.000Z";
    for (const [dueAt, writes] of [
      ["2026-11-27", false],
      ["2026-11-28", true],
    ] as const) {
      const { transport, calls } = setup({
        clickup_get_task: task(PARENT, { due_date: String(Date.parse(instant)) }),
        clickup_get_user: USER,
        clickup_update_task: UPDATED,
      });
      const result = await transport.taskDueDateSet({ taskId: "t000000001", dueAt });
      expect(result).toEqual({ ok: true, data: { previousDueAt: instant, newDueAt: dueAt } });
      expect(tools(calls).includes("clickup_update_task"), dueAt).toBe(writes);
    }
  });

  it("due date writes anyway when get_user fails (only a success is cached, so it is retried)", async () => {
    let userCalls = 0;
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT),
      clickup_get_user: () => {
        userCalls += 1;
        return userCalls === 1 ? new Error("500 Internal Server Error") : USER;
      },
      clickup_update_task: UPDATED,
    });

    const first = await transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" });
    expect(first).toEqual({ ok: true, data: { previousDueAt: STORED, newDueAt: "2026-11-27" } });
    expect(calls).toEqual([
      getTask("t000000001"),
      GET_USER,
      update({ task_id: "t000000001", due_date: "2026-11-27" }),
    ]);

    // The failure was not cached: the offset is read again and now the date matches.
    const second = await transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" });
    expect(second).toEqual(first);
    expect(calls.slice(3)).toEqual([getTask("t000000001"), GET_USER]);
  });

  it("parallel calls share one in-flight get_user read; a failed read is not cached and is retried", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT),
      clickup_get_user: USER,
      clickup_update_task: UPDATED,
    });
    const both = await Promise.all([
      transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" }),
      transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" }),
    ]);
    for (const result of both) {
      expect(result).toEqual({ ok: true, data: { previousDueAt: STORED, newDueAt: "2026-11-27" } });
    }
    expect(tools(calls).filter((t) => t === "clickup_get_user")).toHaveLength(1);
    expect(tools(calls)).not.toContain("clickup_update_task");

    let userCalls = 0;
    const failing = setup({
      clickup_get_task: task(PARENT),
      clickup_get_user: () => {
        userCalls += 1;
        return userCalls === 1 ? new Error("500 Internal Server Error") : USER;
      },
      clickup_update_task: UPDATED,
    });
    await Promise.all([
      failing.transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" }),
      failing.transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" }),
    ]);
    // One shared failed read: both calls write anyway.
    expect(userCalls).toBe(1);
    expect(tools(failing.calls).filter((t) => t === "clickup_update_task")).toHaveLength(2);

    // The failure was cleared: the next call reads the offset again and skips the write.
    const before = failing.calls.length;
    await failing.transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" });
    expect(userCalls).toBe(2);
    expect(failing.calls.slice(before)).toEqual([getTask("t000000001"), GET_USER]);
  });

  it("a resolved error, a missing or an unparsable utc_offset also writes anyway", async () => {
    for (const user of [
      { error: "Something went wrong" },
      { ...USER, utc_offset: undefined },
      { ...USER, utc_offset: "GMT-3" },
      { ...USER, utc_offset: "+25:00" },
    ]) {
      const { transport, calls } = setup({
        clickup_get_task: task(PARENT),
        clickup_get_user: user,
        clickup_update_task: UPDATED,
      });
      const result = await transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" });
      expect(result).toEqual({ ok: true, data: { previousDueAt: STORED, newDueAt: "2026-11-27" } });
      expect(calls[2]).toEqual(update({ task_id: "t000000001", due_date: "2026-11-27" }));
    }
  });

  it("due date round trip uses fixture shape (U7)", async () => {
    // U7: a date-only value is stored at 04:00 local of the account timezone.
    expect((mcpFixture(PARENT) as { due_date: string }).due_date).toBe("1795762800000");
    expect((mcpFixture(CHILD_DATES) as { due_date: string }).due_date).toBe("1796108400000");
    expect(USER.utc_offset).toBe("-03:00");

    const { transport, calls } = setup({
      clickup_get_task: task(CHILD_DATES),
      clickup_get_user: USER,
      clickup_update_task: UPDATED, // the write envelope, not a task
    });
    const same = await transport.taskDueDateSet({ taskId: "t000000003", dueAt: "2026-12-01" });
    expect(same).toEqual({
      ok: true,
      data: { previousDueAt: "2026-12-01T07:00:00.000Z", newDueAt: "2026-12-01" },
    });
    const moved = await transport.taskDueDateSet({ taskId: "t000000003", dueAt: "2026-12-02" });
    expect(moved).toEqual({
      ok: true,
      data: { previousDueAt: "2026-12-01T07:00:00.000Z", newDueAt: "2026-12-02" },
    });
    expect(calls).toEqual([
      getTask("t000000003"),
      GET_USER,
      getTask("t000000003"),
      update({ task_id: "t000000003", due_date: "2026-12-02" }),
    ]);
  });

  it("a task without a due date is written without reading the account offset", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(CHILD),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskDueDateSet({ taskId: "t000000002", dueAt: "2026-12-01" });
    expect(result).toEqual({ ok: true, data: { previousDueAt: null, newDueAt: "2026-12-01" } });
    expect(calls).toEqual([
      getTask("t000000002"),
      update({ task_id: "t000000002", due_date: "2026-12-01" }),
    ]);
  });

  it("an invalid dueAt is INVALID_REQUEST with no call", async () => {
    for (const dueAt of ["", "none", "27/11/2026", "2026-1-05", null, 20261127]) {
      const { transport, calls } = setup({});
      const result = await transport.taskDueDateSet({
        taskId: "t000000001",
        dueAt: dueAt as unknown as string,
      });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.due-date.set", reason: "invalid_due_date" },
      });
      expect(calls).toEqual([]);
    }
  });

  it("a date that is not on the calendar (2026-02-30) is INVALID_REQUEST with no call", async () => {
    for (const dueAt of ["2026-02-30", "2026-02-29", "2026-13-01", "2026-04-31T10:00:00Z"]) {
      const { transport, calls } = setup({});
      const result = await transport.taskDueDateSet({ taskId: "t000000001", dueAt });
      expect(result, dueAt).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.due-date.set", reason: "invalid_due_date" },
      });
      expect(calls).toEqual([]);
    }

    // A leap day is a real date.
    const { transport, calls } = setup({
      clickup_get_task: task(CHILD),
      clickup_update_task: UPDATED,
    });
    expect(
      await transport.taskDueDateSet({ taskId: "t000000002", dueAt: "2028-02-29" }),
    ).toMatchObject({ ok: true, data: { newDueAt: "2028-02-29" } });
    expect(calls[1]).toEqual(update({ task_id: "t000000002", due_date: "2028-02-29" }));
  });

  it("an empty or non-string taskId is INVALID_REQUEST with no call", async () => {
    for (const taskId of ["", "  ", undefined]) {
      const { transport, calls } = setup({});
      const result = await transport.taskDueDateSet({
        taskId: taskId as unknown as string,
        dueAt: "2026-11-27",
      });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { reason: "id_required", field: "taskId" },
      });
      expect(calls).toEqual([]);
    }
  });

  it("a read without a due_date key, or with an unreadable one, is a shape error and nothing is written", async () => {
    for (const read of [taskWithout(PARENT, "due_date"), task(PARENT, { due_date: "" })]) {
      const { transport, calls } = setup({ clickup_get_task: read });
      const result = await transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-27" });
      expect(result).toMatchObject({
        ok: false,
        code: "MCP_ERROR",
        details: { verb: "task.due-date.set" },
      });
      expect(calls).toEqual([getTask("t000000001")]);
    }
  });

  it("read and write failures are classified, never swallowed", async () => {
    const notFound = setup({ clickup_get_task: { error: "Task not found" } });
    const read = await notFound.transport.taskDueDateSet({
      taskId: "t000000001",
      dueAt: "2026-11-30",
    });
    expect(read).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(notFound.calls).toEqual([getTask("t000000001")]);

    const limited = setup({
      clickup_get_task: task(CHILD),
      clickup_update_task: new Error("429 Too Many Requests"),
    });
    const write = await limited.transport.taskDueDateSet({
      taskId: "t000000002",
      dueAt: "2026-11-30",
    });
    expect(write).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });
});

// ---------------------------------------------------------------------------
// task.assignee.add → clickup_update_task {assignees: union}
// ---------------------------------------------------------------------------

describe("taskAssigneeAdd", () => {
  it("assignee already present is a no-op", async () => {
    const { transport, calls } = setup({ clickup_get_task: task(PARENT) });
    const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "100000001" });
    expect(result).toEqual({
      ok: true,
      data: { added: false, currentAssigneeIds: ["100000001"] },
    });
    expect(calls).toEqual([getTask("t000000001")]);
  });

  it('assignee "me" resolves then is idempotent', async () => {
    const { transport, calls } = setup({
      clickup_resolve_assignees: { userIds: ["100000001"] },
      clickup_get_task: task(PARENT),
    });
    const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "me" });
    expect(result).toEqual({
      ok: true,
      data: { added: false, currentAssigneeIds: ["100000001"] },
    });
    expect(calls).toEqual([
      { tool: "clickup_resolve_assignees", args: { assignees: ["me"], workspace_id: WS } },
      getTask("t000000001"),
    ]);
  });

  it("assignee write sends the union of current and new ids", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "100000002" });
    expect(result).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["100000001", "100000002"] },
    });
    expect(calls).toEqual([
      getTask("t000000001"),
      update({ task_id: "t000000001", assignees: ["100000001", "100000002"] }),
    ]);
  });

  it("the union never drops an existing assignee", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT, {
        assignees: [
          { id: 100000001, username: "Person 1" },
          { id: 100000003, username: "Person 3" },
        ],
      }),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "100000002" });
    expect(result).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["100000001", "100000003", "100000002"] },
    });
    expect(calls[1]).toEqual(
      update({ task_id: "t000000001", assignees: ["100000001", "100000003", "100000002"] }),
    );
  });

  it('"me", an email and a numeric id yield the same write, whether the account is a person or an agent', async () => {
    // Person 100000001 or agent 100000002: the resolver maps "me" and the email to it.
    for (const accountId of ["100000001", "100000002"]) {
      const writes: unknown[] = [];
      for (const userId of ["me", "account@example.com", accountId]) {
        const { transport, calls } = setup({
          clickup_resolve_assignees: { userIds: [accountId] },
          clickup_get_task: task(CHILD), // no assignee yet
          clickup_update_task: UPDATED,
        });
        const result = await transport.taskAssigneeAdd({ taskId: "t000000002", userId });
        expect(result).toEqual({
          ok: true,
          data: { added: true, currentAssigneeIds: [accountId] },
        });
        expect(tools(calls).includes("clickup_resolve_assignees"), userId).toBe(
          userId !== accountId,
        );
        writes.push(calls.find((c) => c.tool === "clickup_update_task"));
      }
      expect(writes[0]).toEqual(update({ task_id: "t000000002", assignees: [accountId] }));
      expect(writes[1]).toEqual(writes[0]);
      expect(writes[2]).toEqual(writes[0]);
    }
  });

  it("resolver ids returned as numbers are normalized to strings", async () => {
    const { transport, calls } = setup({
      clickup_resolve_assignees: { userIds: [100000002] },
      clickup_get_task: task(PARENT),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "me" });
    expect(result).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["100000001", "100000002"] },
    });
    expect(calls[2]).toEqual(
      update({ task_id: "t000000001", assignees: ["100000001", "100000002"] }),
    );
  });

  it("an unresolved userId is INVALID_REQUEST assignee_unresolved, with no read, no write and no echo", async () => {
    for (const resp of [
      { userIds: [null], message: "bob@example.com matches several users" }, // ambiguous
      { userIds: [] },
      { userIds: [""] },
      { userIds: ["bob"] },
      { userIds: ["100000001", "100000002"] }, // one input, two answers
      { userIds: null },
      {},
      { error: "User not found: bob@example.com" },
      new Error("Could not resolve bob@example.com"),
    ]) {
      const { transport, calls } = setup({ clickup_resolve_assignees: resp });
      const result = await transport.taskAssigneeAdd({
        taskId: "t000000001",
        userId: "bob@example.com",
      });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.assignee.add", reason: "assignee_unresolved" },
      });
      expect(JSON.stringify(result)).not.toContain("bob");
      expect(tools(calls)).toEqual(["clickup_resolve_assignees"]);
    }
  });

  it("a resolver auth or rate-limit failure stays classified, not assignee_unresolved", async () => {
    for (const [resp, code] of [
      [new Error("429 Too Many Requests"), "RATE_LIMITED"],
      [{ error: "Oauth token not found" }, "AUTH_ERROR"],
    ] as const) {
      const { transport, calls } = setup({ clickup_resolve_assignees: resp });
      const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "me" });
      expect(result).toMatchObject({ ok: false, code });
      expect(tools(calls)).toEqual(["clickup_resolve_assignees"]);
    }
  });

  it("a read without an assignees array is a shape error, never 'no assignees'", async () => {
    for (const read of [taskWithout(PARENT, "assignees"), task(PARENT, { assignees: null })]) {
      const { transport, calls } = setup({ clickup_get_task: read });
      const result = await transport.taskAssigneeAdd({
        taskId: "t000000001",
        userId: "100000002",
      });
      expect(result).toMatchObject({
        ok: false,
        code: "MCP_ERROR",
        details: { verb: "task.assignee.add" },
      });
      expect(calls).toEqual([getTask("t000000001")]);
    }
  });

  it("a read with an assignee lacking an id is a shape error: the union never drops anyone", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(PARENT, {
        assignees: [{ id: 100000001 }, { username: "Person 3" }],
      }),
    });
    const result = await transport.taskAssigneeAdd({ taskId: "t000000001", userId: "100000002" });
    expect(result).toMatchObject({ ok: false, code: "MCP_ERROR" });
    expect(calls).toEqual([getTask("t000000001")]);
  });

  it("a failed write is classified and returns ok:false without claiming the add", async () => {
    for (const [resp, code] of [
      [{ error: "Task not found" }, "NOT_FOUND"],
      [new Error("403 Forbidden"), "AUTH_ERROR"],
      [{ error: "Something went wrong" }, "MCP_ERROR"],
    ] as const) {
      const { transport } = setup({
        clickup_get_task: task(PARENT),
        clickup_update_task: resp,
      });
      const result = await transport.taskAssigneeAdd({
        taskId: "t000000001",
        userId: "100000002",
      });
      expect(result.ok).toBe(false);
      expect(result).toMatchObject({ code });
      expect(result).not.toHaveProperty("data");
    }
  });

  it("an empty or non-string taskId or userId is INVALID_REQUEST with no call", async () => {
    for (const [taskId, userId, field] of [
      ["", "100000002", "taskId"],
      ["t000000001", "  ", "userId"],
      ["t000000001", 100000002, "userId"],
      ["t000000001", undefined, "userId"],
    ] as const) {
      const { transport, calls } = setup({});
      const result = await transport.taskAssigneeAdd({
        taskId,
        userId: userId as unknown as string,
      });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { reason: "id_required", field },
      });
      expect(calls).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// task.comment.add → clickup_create_comment
// ---------------------------------------------------------------------------

describe("taskCommentAdd", () => {
  it("comment embeds the token and posts once", async () => {
    const { transport, calls } = setup({
      clickup_get_task_comments: COMMENTS, // holds [ct:spike0002] only
      clickup_create_comment: COMMENT_CREATED,
    });
    const result = await transport.taskCommentAdd({
      taskId: "t000000001",
      text: "Deployed to staging",
      clientToken: "run-7",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.commentId).toBe("1000400000000901");
    expect(result.data.postedAt).toMatch(ISO_INSTANT);
    expect(calls).toEqual([
      { tool: "clickup_get_task_comments", args: { task_id: "t000000001", workspace_id: WS } },
      {
        tool: "clickup_create_comment",
        args: {
          entity_type: "task",
          entity_id: "t000000001",
          comment_text: "[ct:run-7] Deployed to staging",
          workspace_id: WS,
        },
      },
    ]);
  });

  it("comment with an existing token is not reposted", async () => {
    const { transport, calls } = setup({ clickup_get_task_comments: COMMENTS });
    const result = await transport.taskCommentAdd({
      taskId: "t000000001",
      text: "spike comment",
      clientToken: "spike0002",
    });
    expect(result).toEqual({
      ok: true,
      data: { commentId: "1000400000000901", postedAt: new Date(1795196140180).toISOString() },
    });
    expect(tools(calls)).toEqual(["clickup_get_task_comments"]);
  });

  it("a token that only prefixes another marker is not a match", async () => {
    const { transport, calls } = setup({
      clickup_get_task_comments: COMMENTS,
      clickup_create_comment: COMMENT_CREATED,
    });
    const result = await transport.taskCommentAdd({
      taskId: "t000000001",
      text: "x",
      clientToken: "spike000",
    });
    expect(result.ok).toBe(true);
    expect(tools(calls)).toEqual(["clickup_get_task_comments", "clickup_create_comment"]);
  });

  it("a second call with the same token in the same transport finds the first comment", async () => {
    const posted: unknown[] = [];
    const { transport, calls } = setup({
      clickup_get_task_comments: () => ({ comments: [...posted], count: posted.length }),
      clickup_create_comment: (args: Record<string, unknown>) => {
        // ClickUp stores the text verbatim with a trailing newline.
        posted.push({
          id: "1000400000000902",
          comment_text: `${String(args.comment_text)}\n`,
          date: "1795196140180",
        });
        return { success: true, comment_id: "1000400000000902" };
      },
    });
    const req = { taskId: "t000000001", text: "Deployed", clientToken: "run-8" };
    const first = await transport.taskCommentAdd(req);
    const second = await transport.taskCommentAdd(req);
    expect(first).toMatchObject({ ok: true, data: { commentId: "1000400000000902" } });
    expect(second).toEqual({
      ok: true,
      data: { commentId: "1000400000000902", postedAt: new Date(1795196140180).toISOString() },
    });
    expect(tools(calls)).toEqual([
      "clickup_get_task_comments",
      "clickup_create_comment",
      "clickup_get_task_comments",
    ]);
  });

  it("comment uses clickup_create_comment not the deprecated tool", async () => {
    const { transport, calls } = setup({ clickup_create_comment: COMMENT_CREATED });
    const result = await transport.taskCommentAdd({ taskId: "t000000001", text: "No token" });
    expect(result).toMatchObject({ ok: true, data: { commentId: "1000400000000901" } });
    // Without a clientToken there is no scan, and the text is sent unchanged.
    expect(calls).toEqual([
      {
        tool: "clickup_create_comment",
        args: {
          entity_type: "task",
          entity_id: "t000000001",
          comment_text: "No token",
          workspace_id: WS,
        },
      },
    ]);
    expect(tools(calls)).not.toContain("clickup_create_task_comment");
  });

  it("empty, whitespace-only or non-string text is INVALID_REQUEST with no call", async () => {
    for (const text of ["", "  \n\t", undefined, 42]) {
      const { transport, calls } = setup({});
      const result = await transport.taskCommentAdd({
        taskId: "t000000001",
        text: text as unknown as string,
        clientToken: "run-9",
      });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.comment.add", reason: "text_required" },
      });
      expect(calls).toEqual([]);
    }
  });

  it("text over 40000 characters, marker included, is INVALID_REQUEST with no call", async () => {
    const atLimit = setup({ clickup_create_comment: COMMENT_CREATED });
    const ok = await atLimit.transport.taskCommentAdd({
      taskId: "t000000001",
      text: "a".repeat(40000),
    });
    expect(ok.ok).toBe(true);

    for (const [text, clientToken] of [
      ["a".repeat(40001), undefined],
      ["a".repeat(39990), "run-10"], // "[ct:run-10] " pushes it past the limit
    ] as const) {
      const { transport, calls } = setup({});
      const result = await transport.taskCommentAdd({ taskId: "t000000001", text, clientToken });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.comment.add", reason: "text_too_long" },
      });
      expect(JSON.stringify(result)).not.toContain("aaaa");
      expect(calls).toEqual([]);
    }
  });

  it("an empty or non-string taskId is INVALID_REQUEST with no call", async () => {
    const { transport, calls } = setup({});
    const result = await transport.taskCommentAdd({ taskId: " ", text: "hi" });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { reason: "id_required", field: "taskId" },
    });
    expect(calls).toEqual([]);
  });

  it("a failed or unreadable scan posts nothing", async () => {
    for (const [resp, code] of [
      [{ error: "Task not found" }, "NOT_FOUND"],
      [{ count: 0 }, "MCP_ERROR"], // no comments array
      [{ comments: [{ comment_text: "[ct:run-11] x\n", date: "1795196140180" }] }, "MCP_ERROR"], // match without id
    ] as const) {
      const { transport, calls } = setup({ clickup_get_task_comments: resp });
      const result = await transport.taskCommentAdd({
        taskId: "t000000001",
        text: "x",
        clientToken: "run-11",
      });
      expect(result).toMatchObject({ ok: false, code });
      expect(tools(calls)).toEqual(["clickup_get_task_comments"]);
    }
  });

  it("a create error is classified; an envelope without comment_id is a shape error; a numeric id is a string", async () => {
    const failed = setup({ clickup_create_comment: new Error("429 rate limit") });
    expect(
      await failed.transport.taskCommentAdd({ taskId: "t000000001", text: "x" }),
    ).toMatchObject({ ok: false, code: "RATE_LIMITED" });

    const odd = setup({ clickup_create_comment: { success: true } });
    expect(await odd.transport.taskCommentAdd({ taskId: "t000000001", text: "x" })).toMatchObject({
      ok: false,
      code: "MCP_ERROR",
      details: { verb: "task.comment.add" },
    });

    const numeric = setup({
      clickup_create_comment: { success: true, comment_id: 1000400000000903 },
    });
    expect(
      await numeric.transport.taskCommentAdd({ taskId: "t000000001", text: "x" }),
    ).toMatchObject({ ok: true, data: { commentId: "1000400000000903" } });
  });
});

// ---------------------------------------------------------------------------
// task.parent.set → clickup_update_task {parent}
// ---------------------------------------------------------------------------

describe("taskParentSet", () => {
  it("parent.set sends parent and returns previous", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(REPARENTED),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskParentSet!({ taskId: "t000000005", parentId: "t000000003" });
    expect(result).toEqual({
      ok: true,
      data: { previousParentId: "t000000001", newParentId: "t000000003" },
    });
    expect(calls).toEqual([
      getTask("t000000005"),
      update({ task_id: "t000000005", parent: "t000000003" }),
    ]);
  });

  it("a root task reports a null previous parent", async () => {
    const { transport } = setup({
      clickup_get_task: task(PARENT),
      clickup_update_task: UPDATED,
    });
    const result = await transport.taskParentSet!({ taskId: "t000000001", parentId: "t000000009" });
    expect(result).toEqual({
      ok: true,
      data: { previousParentId: null, newParentId: "t000000009" },
    });
  });

  it("parent.set with null is NOT_APPLICABLE", async () => {
    for (const parentId of [null, undefined, "", "   ", 42]) {
      const { transport, calls } = setup({});
      const result = await transport.taskParentSet!({
        taskId: "t000000005",
        parentId: parentId as unknown as string,
      });
      expect(result).toMatchObject({
        ok: false,
        code: "NOT_APPLICABLE",
        details: { verb: "task.parent.set", reason: "detach_unsupported" },
      });
      expect(calls).toEqual([]);
    }
  });

  it("the current parent is a no-op that returns the same ids", async () => {
    const { transport, calls } = setup({ clickup_get_task: task(REPARENTED) });
    const result = await transport.taskParentSet!({ taskId: "t000000005", parentId: "t000000001" });
    expect(result).toEqual({
      ok: true,
      data: { previousParentId: "t000000001", newParentId: "t000000001" },
    });
    expect(calls).toEqual([getTask("t000000005")]);
  });

  it("a task cannot be its own parent: INVALID_REQUEST with no call", async () => {
    const { transport, calls } = setup({});
    const result = await transport.taskParentSet!({ taskId: "t000000005", parentId: "t000000005" });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { verb: "task.parent.set", reason: "self_parent" },
    });
    expect(calls).toEqual([]);
  });

  it("parentId is trimmed once: the self-parent check, the no-op comparison and the write use the trimmed id", async () => {
    const self = setup({});
    expect(
      await self.transport.taskParentSet!({ taskId: "t000000005", parentId: " t000000005 " }),
    ).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { verb: "task.parent.set", reason: "self_parent" },
    });
    expect(self.calls).toEqual([]);

    const same = setup({ clickup_get_task: task(REPARENTED) });
    expect(
      await same.transport.taskParentSet!({ taskId: "t000000005", parentId: " t000000001\n" }),
    ).toEqual({ ok: true, data: { previousParentId: "t000000001", newParentId: "t000000001" } });
    expect(same.calls).toEqual([getTask("t000000005")]);

    const moved = setup({ clickup_get_task: task(REPARENTED), clickup_update_task: UPDATED });
    expect(
      await moved.transport.taskParentSet!({ taskId: "t000000005", parentId: "  t000000003 " }),
    ).toEqual({ ok: true, data: { previousParentId: "t000000001", newParentId: "t000000003" } });
    expect(moved.calls).toEqual([
      getTask("t000000005"),
      update({ task_id: "t000000005", parent: "t000000003" }),
    ]);
  });

  it("an empty or non-string taskId is INVALID_REQUEST with no call", async () => {
    const { transport, calls } = setup({});
    const result = await transport.taskParentSet!({ taskId: "", parentId: "t000000001" });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { reason: "id_required", field: "taskId" },
    });
    expect(calls).toEqual([]);
  });

  it("a partial read is a shape error and a failed write is classified", async () => {
    const partial = setup({ clickup_get_task: taskWithout(REPARENTED, "parent") });
    expect(
      await partial.transport.taskParentSet!({ taskId: "t000000005", parentId: "t000000003" }),
    ).toMatchObject({ ok: false, code: "MCP_ERROR", details: { verb: "task.parent.set" } });
    expect(partial.calls).toEqual([getTask("t000000005")]);

    const failed = setup({
      clickup_get_task: task(REPARENTED),
      clickup_update_task: { error: "Parent task not found" },
    });
    expect(
      await failed.transport.taskParentSet!({ taskId: "t000000005", parentId: "t000000003" }),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// Every required core verb is implemented
// ---------------------------------------------------------------------------

describe("verb coverage", () => {
  it("no required core verb returns UNSUPPORTED_VERB on a happy path, and taskParentSet is defined", async () => {
    const reads: Record<string, unknown> = {
      t000000001: task(PARENT),
      t000000002: task(CHILD),
    };
    const { transport } = setup({
      clickup_create_task: mcpFixture("clickup_create_task.parent"),
      clickup_get_task: (args: Record<string, unknown>) => reads[String(args.task_id)],
      clickup_update_task: UPDATED,
      clickup_get_user: USER,
      clickup_create_comment: COMMENT_CREATED,
    });
    const results = {
      taskCreate: await transport.taskCreate({
        boardOrProjectId: LIST_A,
        listOrSectionId: "",
        name: "Ship it",
      }),
      taskMove: await transport.taskMove({ taskId: "t000000001", targetListOrSectionId: "wip" }),
      checklistCheck: await transport.checklistCheck({
        taskId: "t000000001",
        checklistId: "t000000001",
        itemId: "t000000002",
        targetState: "complete",
      }),
      taskClose: await transport.taskClose({ taskId: "t000000001" }),
      taskDueDateSet: await transport.taskDueDateSet({ taskId: "t000000001", dueAt: "2026-11-30" }),
      taskAssigneeAdd: await transport.taskAssigneeAdd({
        taskId: "t000000001",
        userId: "100000002",
      }),
      taskCommentAdd: await transport.taskCommentAdd({ taskId: "t000000001", text: "Done" }),
    };
    for (const [verb, result] of Object.entries(results)) {
      expect(result.ok ? "ok" : result.code, verb).not.toBe("UNSUPPORTED_VERB");
      expect(result.ok, verb).toBe(true);
    }

    expect(typeof transport.taskParentSet).toBe("function");
    const parent = await transport.taskParentSet!({ taskId: "t000000002", parentId: "t000000003" });
    expect(parent).toMatchObject({ ok: true });
  });
});
