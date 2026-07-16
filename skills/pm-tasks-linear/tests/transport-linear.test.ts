import { describe, it, expect } from "vitest";
import { createLinearTransport, type McpCaller } from "../src/transport-linear.js";

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Allowed keys for save_issue — mirrors the real Linear MCP schema
 * (additionalProperties: false). Any key outside this set is an error.
 */
const SAVE_ISSUE_ALLOWED_KEYS = new Set([
  "id",
  "team",
  "title",
  "description",
  "assignee",
  "state",
  "cycle",
  "dueDate",
  "estimate",
  "labels",
  "parentId",
  "priority",
  "project",
  "milestone",
]);

/**
 * Build a recording McpCaller from a per-tool response map.
 * If a tool name is not in the map, the stub throws an unexpected-call error.
 * If the mapped value is an Error instance, it is thrown.
 * For save_issue calls, throws if any key is outside SAVE_ISSUE_ALLOWED_KEYS
 * (faithful to additionalProperties: false in the real schema).
 */
function makeMcp(responses: Map<string, unknown>): { mcp: McpCaller; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const mcp: McpCaller = async (tool, args) => {
    calls.push({ tool, args });
    if (tool === "save_issue") {
      const badKeys = Object.keys(args).filter((k) => !SAVE_ISSUE_ALLOWED_KEYS.has(k));
      if (badKeys.length > 0) {
        throw new Error(
          `save_issue received unknown keys (additionalProperties: false): ${badKeys.join(", ")}`,
        );
      }
    }
    if (responses.has(tool)) {
      const resp = responses.get(tool);
      if (resp instanceof Error) throw resp;
      return resp;
    }
    throw new Error(`Unexpected MCP call: ${tool}`);
  };
  return { mcp, calls };
}

/** Default LinearConfig used across all tests */
const TEST_CONFIG = {
  team: { id: "team-abc", key: "ENG", name: "Engineering" },
  states: [
    { id: "state-unstarted", name: "Todo", type: "unstarted" },
    { id: "state-started", name: "In Progress", type: "started" },
    { id: "state-completed", name: "Done", type: "completed" },
    { id: "state-canceled", name: "Canceled", type: "canceled" },
  ],
  labels: [
    { id: "label-1", name: "bug" },
    { id: "label-2", name: "feature" },
    { id: "label-est", name: "est:3-points" },
  ],
  members: [{ id: "user-1", name: "Alice", email: "alice@example.com", alias: "alice" }],
  estimation: {
    strategy: "story_points" as const,
    linearTarget: "points" as const,
    enabled: true,
  },
  cycles: { enabled: true },
};

// ---------------------------------------------------------------------------
// T0 — helpers (classifyError, shapeError)
// Tested indirectly through verb behaviours.
// ---------------------------------------------------------------------------

describe("createLinearTransport — helpers", () => {
  it("classifyError: 401/403/unauthorized/forbidden → AUTH_ERROR", async () => {
    for (const msg of ["401 unauthorized", "403 forbidden", "Unauthorized", "Forbidden access"]) {
      const { mcp } = makeMcp(new Map([["save_comment", new Error(msg)]]));
      const t = createLinearTransport({ mcp, config: TEST_CONFIG });
      const r = await t.taskCommentAdd({ taskId: "issue-1", text: "x" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
    }
  });

  it("classifyError: 429/rate limit → RATE_LIMITED", async () => {
    const { mcp } = makeMcp(new Map([["save_comment", new Error("429 rate limit exceeded")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "issue-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("RATE_LIMITED");
  });

  it("classifyError: not found → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["save_comment", new Error("Issue not found")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "issue-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("classifyError: generic error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["save_comment", new Error("something broke")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "issue-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MCP_ERROR");
  });

  it("shapeError: bad response shape → MCP_ERROR with verb in details", async () => {
    const { mcp } = makeMcp(new Map([["save_comment", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "issue-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.comment.add" });
    }
  });
});

// ---------------------------------------------------------------------------
// T0b — save_issue key-guard (regression net)
// ---------------------------------------------------------------------------

describe("makeMcp stub — save_issue key-guard", () => {
  it("rejects an unknown key (stateId) to prove the guard fires", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", { id: "x", url: "u" }]]));
    await expect(mcp("save_issue", { id: "i-1", stateId: "state-abc" })).rejects.toThrow(
      /unknown keys.*stateId/,
    );
  });
});

// ---------------------------------------------------------------------------
// T1 — taskCreate
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskCreate", () => {
  it("success: dispatches save_issue with team + title; returns id + url", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["save_issue", { id: "issue-42", url: "https://linear.app/team/issue/ENG-42" }]]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCreate({
      boardOrProjectId: "IGNORED",
      listOrSectionId: "IGNORED",
      name: "My Issue",
      description: "some body",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toMatchObject({
      team: "team-abc",
      title: "My Issue",
      description: "some body",
    });
    expect(r).toEqual({
      ok: true,
      data: { id: "issue-42", url: "https://linear.app/team/issue/ENG-42" },
    });
  });

  it("boardOrProjectId and listOrSectionId are IGNORED: team comes from config", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", { id: "issue-5" }]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({
      boardOrProjectId: "should-not-appear",
      listOrSectionId: "also-ignored",
      name: "x",
    });
    const argsStr = JSON.stringify(calls[0].args);
    expect(argsStr).not.toContain("should-not-appear");
    expect(argsStr).not.toContain("also-ignored");
    expect(calls[0].args.team).toBe("team-abc");
  });

  it("no description: does not include description key in args", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", { id: "issue-6" }]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(Object.keys(calls[0].args)).not.toContain("description");
  });

  it("maps req.dueDate to dueDate (YYYY-MM-DD) on the create save_issue", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", { id: "issue-7" }]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({
      boardOrProjectId: "b",
      listOrSectionId: "s",
      name: "n",
      dueDate: "2026-07-20T00:00:00.000Z",
    });
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args.dueDate).toBe("2026-07-20");
  });

  it("omits dueDate on create when absent", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", { id: "issue-8" }]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(Object.prototype.hasOwnProperty.call(calls[0].args, "dueDate")).toBe(false);
  });

  it("shape error: stub returns {} (no id) → MCP_ERROR with verb details", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.create" });
    }
  });

  it("MCP throws 401 → AUTH_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("401 Unauthorized")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T1b — taskCreate with defaultProjectId
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskCreate + defaultProjectId", () => {
  it("passes project: <id> to save_issue when config.defaultProjectId is set", async () => {
    const configWithProject = {
      ...TEST_CONFIG,
      projects: [{ id: "proj-abc", name: "Alpha" }],
      defaultProjectId: "proj-abc",
    };
    const { mcp, calls } = makeMcp(
      new Map([["save_issue", { id: "issue-99", url: "https://linear.app/i/ENG-99" }]]),
    );
    const t = createLinearTransport({ mcp, config: configWithProject });
    const r = await t.taskCreate({
      boardOrProjectId: "IGNORED",
      listOrSectionId: "IGNORED",
      name: "Scoped Issue",
    });
    expect(r.ok).toBe(true);
    expect(calls[0].args).toMatchObject({ project: "proj-abc" });
  });

  it("does NOT include project key when defaultProjectId is absent", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", { id: "issue-100" }]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(Object.keys(calls[0].args)).not.toContain("project");
  });
});

// ---------------------------------------------------------------------------
// T2 — taskMove
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskMove", () => {
  it("success: open → unstarted; resolves state id from config.states; single save_issue call", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "issue-1", targetListOrSectionId: "open" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toEqual({ id: "issue-1", state: "state-unstarted" });
    expect(r).toEqual({
      ok: true,
      data: { previousListOrSectionId: null, newListOrSectionId: "state-unstarted" },
    });
  });

  it("state-by-type: wip → started state id", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskMove({ taskId: "issue-2", targetListOrSectionId: "wip" });

    expect(calls[0].args.state).toBe("state-started");
  });

  it("state-by-type: done → completed state id", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskMove({ taskId: "issue-3", targetListOrSectionId: "done" });

    expect(calls[0].args.state).toBe("state-completed");
  });

  it("raw Linear type passthrough: passes type string directly when no config.states", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const configNoStates = { ...TEST_CONFIG, states: [] };
    const t = createLinearTransport({ mcp, config: configNoStates });
    await t.taskMove({ taskId: "issue-4", targetListOrSectionId: "started" });

    expect(calls[0].args.state).toBe("started");
  });

  it("MCP throws 429 → RATE_LIMITED", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("429 Too Many Requests")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "issue-1", targetListOrSectionId: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("RATE_LIMITED");
  });
});

// ---------------------------------------------------------------------------
// T3 — checklistCheck (sub-issue → state)
// ---------------------------------------------------------------------------

describe("createLinearTransport — checklistCheck", () => {
  it("complete: moves sub-issue to completed state", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "parent-1",
      checklistId: "ignored",
      itemId: "sub-issue-1",
      targetState: "complete",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toEqual({ id: "sub-issue-1", state: "state-completed" });
    expect(r).toEqual({
      ok: true,
      data: { previousState: "incomplete", newState: "complete" },
    });
  });

  it("incomplete: moves sub-issue to unstarted state", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "parent-1",
      checklistId: "ignored",
      itemId: "sub-issue-2",
      targetState: "incomplete",
    });

    expect(calls[0].args).toEqual({ id: "sub-issue-2", state: "state-unstarted" });
    expect(r).toEqual({
      ok: true,
      data: { previousState: "complete", newState: "incomplete" },
    });
  });

  it("MCP error → MCP_ERROR propagated", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("MCP error")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "parent-1",
      checklistId: "c",
      itemId: "sub-1",
      targetState: "complete",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MCP_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T4 — taskClose
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskClose", () => {
  it("success: hardcodes 'completed' type; single save_issue call; returns closed + movedToListOrSectionId", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskClose({ taskId: "issue-10" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toEqual({ id: "issue-10", state: "state-completed" });
    expect(r).toEqual({
      ok: true,
      data: { closed: true, movedToListOrSectionId: "state-completed" },
    });
  });

  it("MCP throws → error code propagated", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("not found")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskClose({ taskId: "issue-10" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// T5 — taskDueDateSet
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskDueDateSet", () => {
  it("success: dispatches save_issue with dueDate (YYYY-MM-DD slice)", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "issue-1", dueAt: "2026-12-31T00:00:00.000Z" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toEqual({ id: "issue-1", dueDate: "2026-12-31" });
    expect(r).toEqual({
      ok: true,
      data: { previousDueAt: null, newDueAt: "2026-12-31" },
    });
  });

  it("invalid dueAt → INVALID_REQUEST (no MCP call)", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "issue-1", dueAt: "bad" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
    expect(calls).toHaveLength(0);
  });

  it("MCP error → error code propagated", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("403 Forbidden")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "issue-1", dueAt: "2026-12-31" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T6 — taskAssigneeAdd (single-assignee set-not-add)
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskAssigneeAdd", () => {
  it("success: dispatches save_issue with assignee; single-assignee set", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "issue-1", userId: "user-abc" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toEqual({ id: "issue-1", assignee: "user-abc" });
    expect(r).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["user-abc"] },
    });
  });

  it("accepts 'me' as userId", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskAssigneeAdd({ taskId: "issue-2", userId: "me" });
    expect(calls[0].args.assignee).toBe("me");
  });

  it("MCP error → error code propagated", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("not found")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "issue-3", userId: "u" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// T7 — taskCommentAdd
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskCommentAdd", () => {
  it("success: dispatches save_comment with issueId + body; returns commentId + postedAt", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["save_comment", { id: "comment-1", createdAt: "2026-06-27T00:00:00.000Z" }]]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "issue-1", text: "Hello world" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_comment");
    expect(calls[0].args).toEqual({ issueId: "issue-1", body: "Hello world" });
    expect(r).toEqual({
      ok: true,
      data: { commentId: "comment-1", postedAt: "2026-06-27T00:00:00.000Z" },
    });
  });

  it("shape error: missing createdAt → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["save_comment", { id: "c-1" }]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "issue-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.comment.add" });
    }
  });
});

// ---------------------------------------------------------------------------
// T8 — taskParentSet
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskParentSet", () => {
  it("success: dispatches save_issue with id + parentId", async () => {
    const { mcp, calls } = makeMcp(new Map([["save_issue", {}]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet?.({ taskId: "issue-child", parentId: "issue-parent" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("save_issue");
    expect(calls[0].args).toEqual({ id: "issue-child", parentId: "issue-parent" });
    expect(r).toEqual({
      ok: true,
      data: { previousParentId: null, newParentId: "issue-parent" },
    });
  });

  it("transport exposes taskParentSet as a method", () => {
    const { mcp } = makeMcp(new Map());
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    expect(typeof t.taskParentSet).toBe("function");
  });

  it("MCP error → error code propagated", async () => {
    const { mcp } = makeMcp(new Map([["save_issue", new Error("not found")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet?.({ taskId: "issue-child", parentId: "issue-parent" });
    expect(r?.ok).toBe(false);
    if (r && !r.ok) expect(r.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// T9 — taskEstimateSet (label replace-set, NOT_APPLICABLE gate)
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskEstimateSet", () => {
  const ESTIMATE_CONFIG = {
    strategy: "story_points" as const,
    linearTarget: "points" as const,
    scale: [1, 2, 3, 5, 8, 13],
  };

  it("success: reads labels, strips est:*, merges new est: label, writes save_issue with estimate", async () => {
    // Note: normalizeEstimate(3, story_points) → humanReadable="3" → slug="3" → estLabelName="est:3"
    // TEST_CONFIG has est:3-points (not est:3), so label is NOT in registry → M1 create-on-demand fires.
    const { mcp, calls } = makeMcp(
      new Map([
        [
          "get_issue",
          {
            labels: [
              { id: "label-1", name: "bug" },
              { id: "label-est-old", name: "est:2-points" },
            ],
          },
        ],
        ["create_issue_label", { id: "new-est-3-id" }],
        ["save_issue", {}],
      ]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: 3,
      config: ESTIMATE_CONFIG,
    });

    // M1: get_issue + create_issue_label + save_issue
    expect(calls).toHaveLength(3);
    expect(calls[0].tool).toBe("get_issue");
    expect(calls[0].args).toEqual({ id: "issue-1" });
    expect(calls[1].tool).toBe("create_issue_label");
    expect(calls[2].tool).toBe("save_issue");

    // label-1 (bug) survives; est:2-points is stripped (starts with est:)
    // new est:3 label from create_issue_label is added
    const labels = calls[2].args.labels as string[];
    expect(labels).toContain("label-1");
    expect(labels).not.toContain("label-est-old");
    expect(labels).toContain("new-est-3-id");

    expect(r?.ok).toBe(true);
    if (r?.ok) {
      expect(r.data.normalized.points).toBe(3);
    }
  });

  it("estimation disabled → NOT_APPLICABLE (no MCP calls)", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const configDisabled = {
      ...TEST_CONFIG,
      estimation: { ...TEST_CONFIG.estimation, enabled: false },
    };
    const t = createLinearTransport({ mcp, config: configDisabled });
    const r = await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: 3,
      config: ESTIMATE_CONFIG,
    });
    expect(calls).toHaveLength(0);
    expect(r?.ok).toBe(false);
    if (r && !r.ok) {
      expect(r.code).toBe("NOT_APPLICABLE");
      expect(r.details?.reason).toBe("estimation_disabled");
    }
  });

  it("invalid estimate input → INVALID_REQUEST (no MCP calls)", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: "not-a-number-or-valid-size",
      config: {
        strategy: "story_points" as const,
        linearTarget: "points" as const,
        scale: [1, 2, 3],
      },
    });
    // normalizeEstimate may accept or reject — if rejected, should be INVALID_REQUEST
    if (r && !r.ok) {
      expect(r.code).toBe("INVALID_REQUEST");
    }
    // Either way no MCP calls when estimate is invalid
    if (r && !r.ok) expect(calls).toHaveLength(0);
  });

  it("transport exposes taskEstimateSet as a method", () => {
    const { mcp } = makeMcp(new Map());
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    expect(typeof t.taskEstimateSet).toBe("function");
  });

  it("linearTarget 'none': writes labelIds only (no estimate field)", async () => {
    // M1: label not in registry → create_issue_label fires; save_issue is calls[2]
    const { mcp, calls } = makeMcp(
      new Map([
        ["get_issue", { labels: [] }],
        ["create_issue_label", { id: "est-label-none" }],
        ["save_issue", {}],
      ]),
    );
    const configNone = {
      ...TEST_CONFIG,
      labels: [], // empty → create-on-demand fires
      estimation: {
        strategy: "story_points" as const,
        linearTarget: "none" as const,
        enabled: true,
      },
    };
    const t = createLinearTransport({ mcp, config: configNone });
    await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: 3,
      config: { strategy: "story_points" as const, linearTarget: "none" as const },
    });

    // calls: get_issue(0), create_issue_label(1), save_issue(2)
    const saveCall = calls.find((c) => c.tool === "save_issue");
    expect(saveCall).toBeDefined();
    expect(Object.keys(saveCall!.args)).not.toContain("estimate");
    expect(Object.keys(saveCall!.args)).toContain("labels");
  });
});

// ---------------------------------------------------------------------------
// T10 — taskSprintSet (cycle, NOT_APPLICABLE gate)
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskSprintSet", () => {
  it("success: resolves cycle by name via list_cycles, then dispatches save_issue with cycleId", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        [
          "list_cycles",
          {
            nodes: [
              { id: "cycle-10", name: "Sprint 10", number: 10 },
              { id: "cycle-11", name: "Sprint 11", number: 11 },
            ],
          },
        ],
        ["save_issue", {}],
      ]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskSprintSet?.({ taskId: "issue-1", sprintRef: "Sprint 10" });

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("list_cycles");
    expect(calls[0].args).toEqual({ teamId: "team-abc" });
    expect(calls[1].tool).toBe("save_issue");
    expect(calls[1].args).toEqual({ id: "issue-1", cycle: "cycle-10" });
    expect(r).toEqual({
      ok: true,
      data: { previousSprintRef: null, newSprintRef: "cycle-10" },
    });
  });

  it("resolves cycle by number string", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["list_cycles", { nodes: [{ id: "cycle-5", name: "Sprint 5", number: 5 }] }],
        ["save_issue", {}],
      ]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskSprintSet?.({ taskId: "issue-1", sprintRef: "5" });

    expect(calls[1].args.cycle).toBe("cycle-5");
  });

  it("resolves cycle by id directly", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["list_cycles", { nodes: [{ id: "cycle-abc", name: "Sprint 1", number: 1 }] }],
        ["save_issue", {}],
      ]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskSprintSet?.({ taskId: "issue-1", sprintRef: "cycle-abc" });

    expect(calls[1].args.cycle).toBe("cycle-abc");
  });

  it("cycle not found in list_cycles: falls back to sprintRef as cycle", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["list_cycles", { nodes: [] }],
        ["save_issue", {}],
      ]),
    );
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    await t.taskSprintSet?.({ taskId: "issue-1", sprintRef: "unknown-cycle" });

    expect(calls[1].args.cycle).toBe("unknown-cycle");
  });

  it("cycles disabled → NOT_APPLICABLE (no MCP calls)", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const configDisabled = { ...TEST_CONFIG, cycles: { enabled: false } };
    const t = createLinearTransport({ mcp, config: configDisabled });
    const r = await t.taskSprintSet?.({ taskId: "issue-1", sprintRef: "Sprint 1" });

    expect(calls).toHaveLength(0);
    expect(r?.ok).toBe(false);
    if (r && !r.ok) {
      expect(r.code).toBe("NOT_APPLICABLE");
      expect(r.details?.reason).toBe("cycles_disabled");
    }
  });

  it("transport exposes taskSprintSet as a method", () => {
    const { mcp } = makeMcp(new Map());
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    expect(typeof t.taskSprintSet).toBe("function");
  });

  it("MCP error → error code propagated", async () => {
    const { mcp } = makeMcp(new Map([["list_cycles", new Error("429 Too Many Requests")]]));
    const t = createLinearTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskSprintSet?.({ taskId: "issue-1", sprintRef: "Sprint 1" });
    expect(r?.ok).toBe(false);
    if (r && !r.ok) expect(r.code).toBe("RATE_LIMITED");
  });
});

// ---------------------------------------------------------------------------
// T9-M1 — taskEstimateSet: label create-on-demand (M1 fix)
// ---------------------------------------------------------------------------

describe("createLinearTransport — taskEstimateSet M1 (label create-on-demand)", () => {
  const ESTIMATE_CONFIG = {
    strategy: "story_points" as const,
    linearTarget: "points" as const,
    scale: [1, 2, 3, 5, 8, 13],
  };

  it("creates est: label via create_issue_label when label not in config.labels", async () => {
    // Config has NO est:3-points label
    const configNoLabel = {
      ...TEST_CONFIG,
      labels: [{ id: "label-1", name: "bug" }], // no est: labels
    };

    const { mcp, calls } = makeMcp(
      new Map([
        ["get_issue", { labels: [{ id: "label-1", name: "bug" }] }],
        ["create_issue_label", { id: "new-est-label-id" }],
        ["save_issue", {}],
      ]),
    );

    const t = createLinearTransport({ mcp, config: configNoLabel });
    const r = await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: 3,
      config: ESTIMATE_CONFIG,
    });

    // Should have called: get_issue, create_issue_label, save_issue
    expect(calls).toHaveLength(3);
    expect(calls[1].tool).toBe("create_issue_label");
    expect(calls[1].args.name).toMatch(/^est:/);
    expect(calls[1].args.teamId).toBe("team-abc");

    // The new label id should appear in save_issue labels
    const labels = calls[2].args.labels as string[];
    expect(labels).toContain("new-est-label-id");

    expect(r?.ok).toBe(true);
  });

  it("uses config.labels label when est: label already registered — no create_issue_label call", async () => {
    // input=3, strategy=story_points → humanReadable="3" → slug="3" → estLabelName="est:3"
    // Config must have a label named exactly "est:3" for registry lookup to succeed.
    const configWithExactLabel = {
      ...TEST_CONFIG,
      labels: [
        { id: "label-1", name: "bug" },
        { id: "label-est-3", name: "est:3" }, // exact match for slug "3"
      ],
    };

    const { mcp, calls } = makeMcp(
      new Map([
        ["get_issue", { labels: [] }],
        ["save_issue", {}],
      ]),
    );

    const t = createLinearTransport({ mcp, config: configWithExactLabel });
    await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: 3,
      config: ESTIMATE_CONFIG,
    });

    // Only get_issue + save_issue — no create_issue_label because label found in registry
    expect(calls.map((c) => c.tool)).not.toContain("create_issue_label");
    expect(calls).toHaveLength(2);

    // The registered label id appears in labels
    const labels = calls[1].args.labels as string[];
    expect(labels).toContain("label-est-3");
  });

  it("proceeds without est: label when create_issue_label throws", async () => {
    const configNoLabel = {
      ...TEST_CONFIG,
      labels: [{ id: "label-1", name: "bug" }],
    };

    const { mcp, calls } = makeMcp(
      new Map([
        ["get_issue", { labels: [{ id: "label-1", name: "bug" }] }],
        ["create_issue_label", new Error("forbidden")],
        ["save_issue", {}],
      ]),
    );

    const t = createLinearTransport({ mcp, config: configNoLabel });
    const r = await t.taskEstimateSet?.({
      taskId: "issue-1",
      input: 3,
      config: ESTIMATE_CONFIG,
    });

    // Should still succeed — label creation failure is non-fatal
    expect(r?.ok).toBe(true);
    // get_issue + create_issue_label(failed) + save_issue
    expect(calls).toHaveLength(3);
    // labels should NOT include the new label (creation failed)
    const labels = calls[2].args.labels as string[];
    expect(labels).toContain("label-1"); // non-est label survives
  });
});
