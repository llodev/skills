import { describe, it, expect } from "vitest";
import { createClickUpTransport, type ClickUpConfig } from "../src/transport-clickup.js";
import { classifyError } from "../src/errors.js";
import { expectWorkspaceOnEveryCall, makeMcp, mcpFixture, TOOL_KEYS } from "./helpers/mcp-stub.js";

const CONFIG: ClickUpConfig = {
  version: "1",
  workspace: { id: "9013000001", name: "Workspace" },
  lists: [
    {
      id: "1000400000000002",
      name: "sandbox-a",
      statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
    },
  ],
};

const LIST_ID = "1000400000000002";

function created(): Map<string, unknown> {
  return new Map([["clickup_create_task", mcpFixture("clickup_create_task.parent")]]);
}

function failing(resp: unknown): Map<string, unknown> {
  return new Map([["clickup_create_task", resp]]);
}

async function create(
  responses: Map<string, unknown>,
  req: Partial<Parameters<ReturnType<typeof createClickUpTransport>["taskCreate"]>[0]> = {},
) {
  const { mcp, calls } = makeMcp(responses);
  const transport = createClickUpTransport({ mcp, config: CONFIG });
  const result = await transport.taskCreate({
    boardOrProjectId: LIST_ID,
    listOrSectionId: "",
    name: "Ship the adapter",
    ...req,
  });
  return { result, calls, args: calls[0]?.args ?? {} };
}

// ---------------------------------------------------------------------------
// The stub is the regression net for `additionalProperties: false`.
// ---------------------------------------------------------------------------

describe("makeMcp stub", () => {
  it("loads the per-tool allow-lists from _tool-keys.json", () => {
    expect(TOOL_KEYS.clickup_create_task?.has("markdown_description")).toBe(true);
    expect(TOOL_KEYS.clickup_create_task?.has("description")).toBe(false);
  });

  it("throws on an unknown argument key", async () => {
    const { mcp } = makeMcp(created());
    await expect(
      mcp("clickup_create_task", { list_id: LIST_ID, name: "x", description: "y" }),
    ).rejects.toThrow(/unknown keys: description/);
  });

  it("throws on an unknown tool and on a tool without a response", async () => {
    const { mcp } = makeMcp(created());
    await expect(mcp("clickup_create_task_comment", {})).rejects.toThrow(/Unknown MCP tool/);
    await expect(mcp("clickup_get_task", { task_id: "t1" })).rejects.toThrow(/Unexpected MCP call/);
  });

  it("evaluates a function response per call and returns {error} as is", async () => {
    let n = 0;
    const { mcp } = makeMcp(
      new Map<string, unknown>([
        ["clickup_get_task", (args: Record<string, unknown>) => ({ id: args.task_id, n: ++n })],
        ["clickup_update_task", { error: "nope" }],
      ]),
    );
    await expect(mcp("clickup_get_task", { task_id: "a" })).resolves.toEqual({ id: "a", n: 1 });
    await expect(mcp("clickup_get_task", { task_id: "b" })).resolves.toEqual({ id: "b", n: 2 });
    await expect(mcp("clickup_update_task", { task_id: "a" })).resolves.toEqual({ error: "nope" });
  });
});

// ---------------------------------------------------------------------------
// task.create → clickup_create_task
// ---------------------------------------------------------------------------

describe("taskCreate — request mapping", () => {
  it("sends exactly create_task keys", async () => {
    const { result, calls } = await create(created(), {
      listOrSectionId: "in progress",
      description: "Body",
      clientToken: "tok1",
      labels: ["backend"],
      priority: "high",
      estimate: 3,
      dueDate: "2026-11-27",
    });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.tool).toBe("clickup_create_task");
    expect(Object.keys(calls[0]?.args ?? {}).sort()).toEqual([
      "due_date",
      "list_id",
      "markdown_description",
      "name",
      "priority",
      "status",
      "tags",
      "workspace_id",
    ]);
  });

  it("maps list/status/priority/tags/dueDate", async () => {
    const { args } = await create(created(), {
      listOrSectionId: "in progress",
      labels: ["backend", "api"],
      priority: "urgent",
      dueDate: "2026-11-27T15:30:00-03:00",
    });
    expect(args).toEqual({
      list_id: LIST_ID,
      name: "Ship the adapter",
      status: "in progress",
      tags: ["backend", "api"],
      priority: "urgent",
      due_date: "2026-11-27",
      workspace_id: "9013000001",
    });
  });

  it("maps priorities case-insensitively, medium to normal", async () => {
    for (const [input, expected] of [
      ["urgent", "urgent"],
      ["HIGH", "high"],
      ["Normal", "normal"],
      ["medium", "normal"],
      ["low", "low"],
    ] as const) {
      const { args } = await create(created(), { priority: input });
      expect(args.priority).toBe(expected);
    }
  });

  it("omits an unknown priority instead of sending it", async () => {
    for (const priority of ["critical", "p1", "constructor", ""]) {
      const { result, args } = await create(created(), { priority });
      expect(result.ok).toBe(true);
      expect(args).not.toHaveProperty("priority");
    }
  });

  it("listOrSectionId empty means no status key", async () => {
    const { args } = await create(created(), { listOrSectionId: "" });
    expect(args).not.toHaveProperty("status");
  });

  it("trims listOrSectionId before sending it as status; blank means no status key", async () => {
    const padded = await create(created(), { listOrSectionId: "  in progress  " });
    expect(padded.args.status).toBe("in progress");
    expectWorkspaceOnEveryCall(padded.calls, "9013000001");

    const blank = await create(created(), { listOrSectionId: "   " });
    expect(blank.args).not.toHaveProperty("status");
    expectWorkspaceOnEveryCall(blank.calls, "9013000001");
  });

  it("does not send a whitespace-only description without a clientToken", async () => {
    const { result, args, calls } = await create(created(), { description: "  \n\t " });
    expect(result.ok).toBe(true);
    expect(args).not.toHaveProperty("markdown_description");
    expectWorkspaceOnEveryCall(calls, "9013000001");
  });

  it("treats dueDate null like an absent dueDate", async () => {
    const { result, args, calls } = await create(created(), {
      dueDate: null as unknown as string,
    });
    expect(result.ok).toBe(true);
    expect(args).not.toHaveProperty("due_date");
    expectWorkspaceOnEveryCall(calls, "9013000001");
  });

  it("passes labels through untouched (ClickUp lowercases server-side)", async () => {
    const { args } = await create(created(), { labels: ["Backend", "EST:3", "needs review"] });
    expect(args.tags).toEqual(["Backend", "EST:3", "needs review"]);
  });

  it("sends the description as markdown_description", async () => {
    const { args } = await create(created(), { description: "## Goal\n\n- [ ] item" });
    expect(args.markdown_description).toBe("## Goal\n\n- [ ] item");
  });

  it("embeds [ct:token] footer", async () => {
    const withBody = await create(created(), { description: "Body", clientToken: "tok1" });
    expect(withBody.args.markdown_description).toBe("Body\n\n[ct:tok1]");

    const bare = await create(created(), { clientToken: "tok1" });
    expect(bare.args.markdown_description).toBe("[ct:tok1]");
  });

  it("appends the [ct:token] footer exactly once", async () => {
    const { args } = await create(created(), {
      description: "Body\n\n[ct:tok1]",
      clientToken: "tok1",
    });
    const text = String(args.markdown_description);
    expect(text.split("[ct:tok1]")).toHaveLength(2);
    expect(text).toBe("Body\n\n[ct:tok1]");
  });

  it("ignores estimate", async () => {
    const { result, args } = await create(created(), {
      estimate: { optimistic: 1, likely: 2, pessimistic: 5 },
    });
    expect(result.ok).toBe(true);
    expect(args).not.toHaveProperty("time_estimate");
  });

  it("always sends workspace_id", async () => {
    const { args } = await create(created());
    expect(args).toEqual({
      list_id: LIST_ID,
      name: "Ship the adapter",
      workspace_id: "9013000001",
    });
    expect(args.workspace_id).toMatch(/^\d+$/);
  });
});

describe("taskCreate — request validation", () => {
  it("INVALID_REQUEST when boardOrProjectId is empty", async () => {
    for (const boardOrProjectId of ["", "   "]) {
      const { result, calls } = await create(created(), { boardOrProjectId });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("INVALID_REQUEST");
      expect(calls).toHaveLength(0);
    }
  });

  it("INVALID_REQUEST when dueDate is not a YYYY-MM-DD prefix", async () => {
    for (const dueDate of ["27/11/2026", "2026-1-5", "tomorrow", ""]) {
      const { result, calls } = await create(created(), { dueDate });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_REQUEST");
        expect(JSON.stringify(result.details)).not.toContain(dueDate || "\u0000");
      }
      expect(calls).toHaveLength(0);
    }
  });

  it("INVALID_REQUEST when dueDate is not a calendar date (2026-02-30)", async () => {
    for (const dueDate of ["2026-02-30", "2026-02-29", "2026-13-01", "2026-04-31T10:00:00Z"]) {
      const { result, calls } = await create(created(), { dueDate });
      expect(result, dueDate).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.create", reason: "invalid_due_date" },
      });
      expect(calls).toHaveLength(0);
    }
    // A leap day is a real date.
    const { result, args } = await create(created(), { dueDate: "2028-02-29" });
    expect(result.ok).toBe(true);
    expect(args.due_date).toBe("2028-02-29");
  });
});

describe("taskCreate — response", () => {
  it("returns id and url", async () => {
    const { result } = await create(created());
    expect(result).toEqual({
      ok: true,
      data: { id: "t000000001", url: "https://app.clickup.com/t/t000000001" },
    });
  });

  it("falls back to the app.clickup.com URL when task_url is absent", async () => {
    const { result } = await create(
      failing({ success: true, task_id: "t000000007", custom_id: null }),
    );
    expect(result).toEqual({
      ok: true,
      data: { id: "t000000007", url: "https://app.clickup.com/t/t000000007" },
    });
  });

  it("MCP_ERROR shape error when the response has no task id", async () => {
    const { result } = await create(failing({ success: true }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MCP_ERROR");
      expect(result.details).toMatchObject({ verb: "task.create" });
    }
  });
});

describe("taskCreate — errors", () => {
  it("classifies 404/403/429/other", async () => {
    for (const [message, code] of [
      ["404 Not Found", "NOT_FOUND"],
      ["List not found", "NOT_FOUND"],
      ["401 Unauthorized", "AUTH_ERROR"],
      ["403 Forbidden", "AUTH_ERROR"],
      ["429 Too Many Requests", "RATE_LIMITED"],
      ["Rate limit exceeded", "RATE_LIMITED"],
      ["socket hang up", "MCP_ERROR"],
      // An id that merely contains 404/429 digits is not a status code.
      ["Task t000404290 is locked", "MCP_ERROR"],
      // Status rejection is not a missing task: the status verbs map it themselves.
      ["Failed to update task: Status does not exist", "MCP_ERROR"],
    ] as const) {
      const { result } = await create(failing(new Error(message)));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code, message).toBe(code);
        expect(result.details).toEqual({ message });
      }
    }
  });

  it("classifies ClickUp's auth wording (not authorized, token not found, OAUTH_) as AUTH_ERROR", async () => {
    for (const message of [
      "You are not authorized to access this task",
      "Oauth token not found",
      '{"err":"Oauth token not found","ECODE":"OAUTH_019"}',
      "OAUTH_027",
    ]) {
      expect(classifyError(new Error(message)), message).toEqual({
        code: "AUTH_ERROR",
        details: { message },
      });
    }
    const { result, calls } = await create(failing({ error: "Oauth token not found" }));
    expect(result.ok === false && result.code).toBe("AUTH_ERROR");
    expectWorkspaceOnEveryCall(calls, "9013000001");
  });

  it("a resolved {error} is classified like a thrown error", async () => {
    for (const [resp, code] of [
      [{ error: "Task not found" }, "NOT_FOUND"],
      [{ error: "403 Forbidden" }, "AUTH_ERROR"],
      [mcpFixture("clickup_update_task.status_error"), "MCP_ERROR"],
      [mcpFixture("clickup_add_task_to_list.plan_limit"), "MCP_ERROR"],
    ] as const) {
      const { result } = await create(failing(resp));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(code);
        expect(result.details).toEqual({ message: (resp as { error: string }).error });
      }
    }
  });

  it("a thrown non-Error ({error} object or string) is classified by its text", async () => {
    for (const [thrown, code, message] of [
      [{ error: "Task not found" }, "NOT_FOUND", "Task not found"],
      [{ message: "429 Too Many Requests" }, "RATE_LIMITED", "429 Too Many Requests"],
      ["401 Unauthorized", "AUTH_ERROR", "401 Unauthorized"],
      [42, "MCP_ERROR", "42"],
    ] as const) {
      const { result } = await create(
        failing(() => {
          throw thrown;
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(code);
        expect(result.details).toEqual({ message });
      }
    }
  });

  it("error details never include request args", async () => {
    const { result } = await create(failing(new Error("500 Internal Server Error")), {
      name: "secret-name-xyz",
      description: "secret-body-xyz",
      clientToken: "secret-token-xyz",
      labels: ["secret-label-xyz"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.details ?? {})).toEqual(["message"]);
      expect(JSON.stringify(result.details)).not.toMatch(/secret-|9013000001|1000400000000002/);
    }
  });
});
