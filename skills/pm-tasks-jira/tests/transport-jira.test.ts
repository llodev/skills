import { describe, it, expect } from "vitest";
import { createJiraTransport, type McpCaller } from "../src/transport-jira.js";

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Allowed keys for createJiraIssue — mirrors the real Atlassian MCP schema
 * (additionalProperties: false). Any key outside this set is an error.
 * Covers both call sites: task.create (cloudId, projectKey, issueTypeName,
 * summary, description, duedate) and checklist.check subtask-create (parent).
 */
const CREATE_JIRA_ISSUE_ALLOWED_KEYS = new Set([
  "cloudId",
  "projectKey",
  "issueTypeName",
  "summary",
  "description",
  "parent",
  "duedate",
]);

/**
 * Build a recording McpCaller from a per-tool response map.
 * If a tool name is not in the map, the stub throws an unexpected-call error.
 * If the mapped value is an Error instance, it is thrown.
 * For createJiraIssue calls, throws if any key is outside
 * CREATE_JIRA_ISSUE_ALLOWED_KEYS (faithful to additionalProperties: false
 * in the real schema).
 */
function makeMcp(responses: Map<string, unknown>): { mcp: McpCaller; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const mcp: McpCaller = async (tool, args) => {
    calls.push({ tool, args });
    if (tool === "createJiraIssue") {
      const badKeys = Object.keys(args).filter((k) => !CREATE_JIRA_ISSUE_ALLOWED_KEYS.has(k));
      if (badKeys.length > 0) {
        throw new Error(
          `createJiraIssue received unknown keys (additionalProperties: false): ${badKeys.join(", ")}`,
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

/** Default JiraConfig used across all tests */
const TEST_CONFIG = {
  site: { cloudId: "cloud-abc" },
  project: { key: "KAN" },
  issueTypes: {
    task: { id: "10003", name: "Task" },
    subtask: { id: "10002", name: "Subtask" },
  },
};

/** A minimal valid transition response for category "done" */
function makeTransitions(categoryKey: string, id = "21", statusId = "10002") {
  return {
    transitions: [
      {
        id,
        name: "Done",
        to: { id: statusId, statusCategory: { key: categoryKey } },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// T0 — helpers (classifyError, shapeError, resolveTransition)
// Tested indirectly through verb behaviours.
// ---------------------------------------------------------------------------

describe("createJiraTransport — helpers", () => {
  it("classifyError: 401/403/unauthorized/forbidden → AUTH_ERROR", async () => {
    for (const msg of ["401 unauthorized", "403 forbidden", "Unauthorized", "Forbidden access"]) {
      const { mcp } = makeMcp(new Map([["addCommentToJiraIssue", new Error(msg)]]));
      const t = createJiraTransport({ mcp, config: TEST_CONFIG });
      const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
    }
  });

  it("classifyError: 429/rate limit → RATE_LIMITED", async () => {
    const { mcp } = makeMcp(
      new Map([["addCommentToJiraIssue", new Error("429 rate limit exceeded")]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("RATE_LIMITED");
  });

  it("classifyError: 404/not found → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["addCommentToJiraIssue", new Error("Issue not found")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("classifyError: generic error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["addCommentToJiraIssue", new Error("something broke")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MCP_ERROR");
  });

  it("shapeError: bad response shape → MCP_ERROR with verb in details", async () => {
    const { mcp } = makeMcp(new Map([["addCommentToJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.comment.add" });
    }
  });

  it("resolveTransition: empty transitions array → NOT_FOUND via taskMove", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", { transitions: [] }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "KAN-1", targetListOrSectionId: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("NOT_FOUND");
      expect((r.details ?? {}).taskId).toBe("KAN-1");
    }
  });

  it("resolveTransition: malformed response (no transitions key) → MCP_ERROR via taskMove", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "KAN-1", targetListOrSectionId: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MCP_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T1 — taskCreate
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskCreate", () => {
  it("success: dispatches createJiraIssue and returns key + url", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["createJiraIssue", { key: "KAN-1", url: "https://example.atlassian.net/browse/KAN-1" }],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCreate({
      boardOrProjectId: "IGNORED",
      listOrSectionId: "IGNORED",
      name: "My Issue",
      description: "some body",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("createJiraIssue");
    expect(calls[0].args).toEqual({
      cloudId: "cloud-abc",
      projectKey: "KAN",
      issueTypeName: "Task",
      summary: "My Issue",
      description: "some body",
    });
    expect(r).toEqual({
      ok: true,
      data: { id: "KAN-1", url: "https://example.atlassian.net/browse/KAN-1" },
    });
  });

  it("boardOrProjectId and listOrSectionId are IGNORED: cloudId+projectKey come from config", async () => {
    const { mcp, calls } = makeMcp(new Map([["createJiraIssue", { key: "KAN-5" }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({
      boardOrProjectId: "should-not-appear",
      listOrSectionId: "also-ignored",
      name: "x",
    });
    const argsStr = JSON.stringify(calls[0].args);
    expect(argsStr).not.toContain("should-not-appear");
    expect(argsStr).not.toContain("also-ignored");
    expect(calls[0].args.cloudId).toBe("cloud-abc");
    expect(calls[0].args.projectKey).toBe("KAN");
  });

  it("clientToken: appends [ct:<token>] to description", async () => {
    const { mcp, calls } = makeMcp(new Map([["createJiraIssue", { key: "KAN-2" }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({
      boardOrProjectId: "b",
      listOrSectionId: "s",
      name: "n",
      description: "body text",
      clientToken: "abc123",
    });
    expect(calls[0].args.description).toContain("[ct:abc123]");
  });

  it("shape error: stub returns {} (no key) → MCP_ERROR with verb details", async () => {
    const { mcp } = makeMcp(new Map([["createJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.create" });
    }
  });

  it("maps req.dueDate to the Jira due field (YYYY-MM-DD) on createJiraIssue", async () => {
    const { mcp, calls } = makeMcp(new Map([["createJiraIssue", { key: "KAN-9" }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({
      boardOrProjectId: "b",
      listOrSectionId: "s",
      name: "n",
      dueDate: "2026-07-20T00:00:00.000Z",
    });
    expect(calls[0].tool).toBe("createJiraIssue");
    expect(calls[0].args.duedate).toBe("2026-07-20");
  });

  it("omits the due field when dueDate is absent", async () => {
    const { mcp, calls } = makeMcp(new Map([["createJiraIssue", { key: "KAN-9" }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(Object.prototype.hasOwnProperty.call(calls[0].args, "duedate")).toBe(false);
  });

  it("MCP throws 401 → AUTH_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["createJiraIssue", new Error("401 Unauthorized")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCreate({ boardOrProjectId: "b", listOrSectionId: "s", name: "n" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T2 — taskMove
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskMove", () => {
  it("success: two calls in order (getTransitions → transitionIssue); returns null prev + toStatusId", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getTransitionsForJiraIssue", makeTransitions("done", "31", "10003")],
        ["transitionJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "KAN-1", targetListOrSectionId: "done" });

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("getTransitionsForJiraIssue");
    expect(calls[0].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-1" });
    expect(calls[1].tool).toBe("transitionJiraIssue");
    expect(calls[1].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-1", transitionId: "31" });

    expect(r).toEqual({
      ok: true,
      data: { previousListOrSectionId: null, newListOrSectionId: "10003" },
    });
  });

  it("transition not found (no match for category) → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", { transitions: [] }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "KAN-2", targetListOrSectionId: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("NOT_FOUND");
      expect((r.details ?? {}).taskId).toBe("KAN-2");
    }
  });

  it("shape error on getTransitions response ({}) → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "KAN-1", targetListOrSectionId: "indeterminate" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MCP_ERROR");
  });

  it("MCP throws 429 → RATE_LIMITED", async () => {
    const { mcp } = makeMcp(
      new Map([["getTransitionsForJiraIssue", new Error("429 Too Many Requests")]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskMove({ taskId: "KAN-1", targetListOrSectionId: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("RATE_LIMITED");
  });
});

// ---------------------------------------------------------------------------
// T2 — taskClose
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskClose", () => {
  it("success: hardcodes 'done' category; two calls in order; returns closed + movedToListOrSectionId", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getTransitionsForJiraIssue", makeTransitions("done", "41", "10004")],
        ["transitionJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskClose({ taskId: "KAN-3" });

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("getTransitionsForJiraIssue");
    expect(calls[0].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-3" });
    expect(calls[1].tool).toBe("transitionJiraIssue");
    expect(calls[1].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-3", transitionId: "41" });

    expect(r).toEqual({ ok: true, data: { closed: true, movedToListOrSectionId: "10004" } });
  });

  it("transition not found → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", { transitions: [] }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskClose({ taskId: "KAN-1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("MCP throws generic error → MCP_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", new Error("something bad")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskClose({ taskId: "KAN-1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MCP_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T3 — checklistCheck
// ---------------------------------------------------------------------------

describe("createJiraTransport — checklistCheck (complete path)", () => {
  it("success: 3 calls in order (createJiraIssue → getTransitions → transitionIssue); returns complete", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["createJiraIssue", { key: "KAN-2" }],
        ["getTransitionsForJiraIssue", makeTransitions("done", "21", "10002")],
        ["transitionJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "KAN-1",
      checklistId: "ignored",
      itemId: "Write unit tests",
      targetState: "complete",
    });

    expect(calls).toHaveLength(3);
    expect(calls[0].tool).toBe("createJiraIssue");
    expect(calls[0].args).toEqual({
      cloudId: "cloud-abc",
      projectKey: "KAN",
      issueTypeName: "Subtask",
      summary: "Write unit tests",
      parent: "KAN-1",
    });
    expect(calls[1].tool).toBe("getTransitionsForJiraIssue");
    expect(calls[1].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-2" });
    expect(calls[2].tool).toBe("transitionJiraIssue");
    expect(calls[2].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-2", transitionId: "21" });

    expect(r).toEqual({ ok: true, data: { previousState: "incomplete", newState: "complete" } });
  });

  it("createJiraIssue shape error (no key) → MCP_ERROR with verb", async () => {
    const { mcp } = makeMcp(new Map([["createJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "KAN-1",
      checklistId: "ignored",
      itemId: "task text",
      targetState: "complete",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "checklist.check" });
    }
  });

  it("TRANSITION_NOT_FOUND after subtask created → NOT_FOUND", async () => {
    const { mcp } = makeMcp(
      new Map([
        ["createJiraIssue", { key: "KAN-2" }],
        ["getTransitionsForJiraIssue", { transitions: [] }],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "KAN-1",
      checklistId: "ignored",
      itemId: "task",
      targetState: "complete",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("MCP throws 429 on createJiraIssue → RATE_LIMITED", async () => {
    const { mcp } = makeMcp(new Map([["createJiraIssue", new Error("429 rate limit")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "KAN-1",
      checklistId: "ignored",
      itemId: "task",
      targetState: "complete",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("RATE_LIMITED");
  });
});

describe("createJiraTransport — checklistCheck (incomplete path)", () => {
  it("success: 2 calls in order (getTransitions → transitionIssue) on req.itemId; returns incomplete", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getTransitionsForJiraIssue", makeTransitions("new", "11", "10000")],
        ["transitionJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "KAN-1",
      checklistId: "ignored",
      itemId: "KAN-2",
      targetState: "incomplete",
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("getTransitionsForJiraIssue");
    expect(calls[0].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-2" });
    expect(calls[1].tool).toBe("transitionJiraIssue");
    expect(calls[1].args).toEqual({ cloudId: "cloud-abc", issueKey: "KAN-2", transitionId: "11" });

    expect(r).toEqual({ ok: true, data: { previousState: "complete", newState: "incomplete" } });
  });

  it("TRANSITION_NOT_FOUND on incomplete path → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["getTransitionsForJiraIssue", { transitions: [] }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.checklistCheck({
      taskId: "KAN-1",
      checklistId: "ignored",
      itemId: "KAN-2",
      targetState: "incomplete",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// T4 — taskDueDateSet
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskDueDateSet", () => {
  it("success: slices ISO to YYYY-MM-DD for duedate field", async () => {
    const { mcp, calls } = makeMcp(new Map([["editJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-1", dueAt: "2026-07-01T00:00:00Z" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("editJiraIssue");
    expect(calls[0].args).toEqual({
      cloudId: "cloud-abc",
      issueKey: "KAN-1",
      fields: { duedate: "2026-07-01" },
    });
    expect(r).toEqual({ ok: true, data: { previousDueAt: null, newDueAt: "2026-07-01" } });
  });

  it("ISO with milliseconds and timezone: still slices to YYYY-MM-DD", async () => {
    const { mcp, calls } = makeMcp(new Map([["editJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskDueDateSet({ taskId: "KAN-1", dueAt: "2026-12-31T23:59:59.999Z" });
    const fields = calls[0].args.fields as Record<string, unknown>;
    expect(fields.duedate).toBe("2026-12-31");
  });

  it("subtask skip: Atlassian error 'duedate ... not applicable' → NOT_APPLICABLE", async () => {
    const { mcp } = makeMcp(
      new Map([
        ["editJiraIssue", new Error("Field 'duedate' is not applicable for this issue type")],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-2", dueAt: "2026-07-01T00:00:00Z" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("NOT_APPLICABLE");
      expect(r.details).toMatchObject({ reason: "subtask_no_duedate", taskId: "KAN-2" });
    }
  });

  it("subtask skip: 'duedate is not a valid field' → NOT_APPLICABLE", async () => {
    const { mcp } = makeMcp(
      new Map([["editJiraIssue", new Error("duedate is not a valid field on this issue")]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-3", dueAt: "2026-07-01" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_APPLICABLE");
  });

  it("subtask skip: 'does not support duedate' → NOT_APPLICABLE", async () => {
    const { mcp } = makeMcp(
      new Map([["editJiraIssue", new Error("Issue type does not support duedate")]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-3", dueAt: "2026-07-01" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_APPLICABLE");
  });

  it("invalid dueAt (too short) → INVALID_REQUEST before MCP call", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-1", dueAt: "bad" });
    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_REQUEST");
      expect(r.details).toMatchObject({ verb: "taskDueDateSet" });
    }
  });

  it("empty dueAt → INVALID_REQUEST before MCP call", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-1", dueAt: "" });
    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
  });

  it("MCP throws 401 → AUTH_ERROR (not NOT_APPLICABLE)", async () => {
    const { mcp } = makeMcp(new Map([["editJiraIssue", new Error("401 Unauthorized")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskDueDateSet({ taskId: "KAN-1", dueAt: "2026-07-01T00:00:00Z" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T5 — taskAssigneeAdd
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskAssigneeAdd", () => {
  it("by display name: two calls (lookupJiraAccountId → editJiraIssue); asserts editJiraIssue fields", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["lookupJiraAccountId", { accountId: "712020:aabbccdd-1234-5678-abcd-ef0123456789" }],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "KAN-1", userId: "John Doe" });

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("lookupJiraAccountId");
    expect(calls[0].args).toEqual({ query: "John Doe" });
    expect(calls[1].tool).toBe("editJiraIssue");
    expect(calls[1].args).toEqual({
      cloudId: "cloud-abc",
      issueKey: "KAN-1",
      fields: { assignee: { accountId: "712020:aabbccdd-1234-5678-abcd-ef0123456789" } },
    });
    expect(r).toEqual({
      ok: true,
      data: { added: true, currentAssigneeIds: ["712020:aabbccdd-1234-5678-abcd-ef0123456789"] },
    });
  });

  it("by accountId (modern UUID format): ONE call only (editJiraIssue), lookup skipped", async () => {
    const accountId = "712020:aabbccdd-1234-5678-abcd-ef0123456789";
    const { mcp, calls } = makeMcp(new Map([["editJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "KAN-1", userId: accountId });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("editJiraIssue");
    const lookupCalls = calls.filter((c) => c.tool === "lookupJiraAccountId");
    expect(lookupCalls).toHaveLength(0);
    expect(r).toEqual({ ok: true, data: { added: true, currentAssigneeIds: [accountId] } });
  });

  it("by accountId (legacy 24-hex format): ONE call only (editJiraIssue)", async () => {
    const accountId = "5b10a2844ab1d1541d4d5e1e:legacy";
    const { mcp, calls } = makeMcp(new Map([["editJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskAssigneeAdd({ taskId: "KAN-1", userId: accountId });
    expect(calls.filter((c) => c.tool === "lookupJiraAccountId")).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });

  it("by accountId (bare 24-char alphanumeric, no colon): ONE call only (editJiraIssue), lookup skipped", async () => {
    const accountId = "557058a1b2c3d4e5f6a7b8c9"; // 24 alphanumeric chars, no colon
    const { mcp, calls } = makeMcp(new Map([["editJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "KAN-1", userId: accountId });
    expect(calls.filter((c) => c.tool === "lookupJiraAccountId")).toHaveLength(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("editJiraIssue");
    expect(r).toEqual({ ok: true, data: { added: true, currentAssigneeIds: [accountId] } });
  });

  it("lookup shape error (no accountId in result) → MCP_ERROR with verb", async () => {
    const { mcp } = makeMcp(new Map([["lookupJiraAccountId", { userId: "wrong-key" }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "KAN-1", userId: "Jane Doe" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.assignee.add" });
    }
  });

  it("lookupJiraAccountId throws 404 → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["lookupJiraAccountId", new Error("User not found 404")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskAssigneeAdd({ taskId: "KAN-1", userId: "nobody" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// T6 — taskCommentAdd
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskCommentAdd", () => {
  it("success: dispatches addCommentToJiraIssue with markdown:true; returns commentId + postedAt", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["addCommentToJiraIssue", { id: "comment-1", created: "2026-06-27T18:00:00.000Z" }],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "## Hello\n\nWorld" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("addCommentToJiraIssue");
    expect(calls[0].args).toEqual({
      cloudId: "cloud-abc",
      issueKey: "KAN-1",
      body: "## Hello\n\nWorld",
      markdown: true,
    });
    expect(r).toEqual({
      ok: true,
      data: { commentId: "comment-1", postedAt: "2026-06-27T18:00:00.000Z" },
    });
  });

  it("markdown:true is always passed regardless of content", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["addCommentToJiraIssue", { id: "c2", created: "2026-06-27T00:00:00Z" }]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskCommentAdd({ taskId: "KAN-1", text: "" });
    expect(calls[0].args.markdown).toBe(true);
  });

  it("shape error: no id in result → MCP_ERROR with verb", async () => {
    const { mcp } = makeMcp(
      new Map([["addCommentToJiraIssue", { created: "2026-06-27T00:00:00Z" }]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.comment.add" });
    }
  });

  it("shape error: no created in result → MCP_ERROR with verb", async () => {
    const { mcp } = makeMcp(new Map([["addCommentToJiraIssue", { id: "c3" }]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("MCP_ERROR");
      expect(r.details).toMatchObject({ verb: "task.comment.add" });
    }
  });

  it("MCP throws 401 → AUTH_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["addCommentToJiraIssue", new Error("401 Unauthorized")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "hi" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });

  it("empty body is allowed at transport level (no pre-validation)", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["addCommentToJiraIssue", { id: "c4", created: "2026-06-27T00:00:00Z" }]]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskCommentAdd({ taskId: "KAN-1", text: "" });
    expect(calls).toHaveLength(1);
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T7 — taskParentSet
// ---------------------------------------------------------------------------

describe("createJiraTransport — taskParentSet", () => {
  it("success: dispatches editJiraIssue with fields.parent.key; returns ok + newParentId + null previousParentId", async () => {
    const { mcp, calls } = makeMcp(new Map([["editJiraIssue", {}]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet!({ taskId: "KAN-5", parentId: "KAN-7" });

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("editJiraIssue");
    expect(calls[0].args).toEqual({
      cloudId: "cloud-abc",
      issueKey: "KAN-5",
      fields: { parent: { key: "KAN-7" } },
    });
    expect(r).toEqual({
      ok: true,
      data: { previousParentId: null, newParentId: "KAN-7" },
    });
  });

  it("invalid parentId 'not-a-key' → INVALID_REQUEST before MCP call", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet!({ taskId: "KAN-5", parentId: "not-a-key" });

    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_REQUEST");
      expect(r.details).toMatchObject({ hint: "parentId must be a Jira issue key, e.g. KAN-12" });
    }
  });

  it("invalid parentId (lowercase) → INVALID_REQUEST before MCP call", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet!({ taskId: "KAN-5", parentId: "kan-7" });
    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
  });

  it("MCP throws 404 'not found' → NOT_FOUND", async () => {
    const { mcp } = makeMcp(new Map([["editJiraIssue", new Error("Issue not found 404")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet!({ taskId: "KAN-5", parentId: "KAN-7" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("MCP throws 401 → AUTH_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["editJiraIssue", new Error("401 Unauthorized")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskParentSet!({ taskId: "KAN-5", parentId: "KAN-7" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });
});

// ---------------------------------------------------------------------------
// T8 — taskEstimateSet
// ---------------------------------------------------------------------------

/** Minimal getJiraIssue response with given labels */
function makeIssueLabels(labels: string[] = []) {
  return { fields: { labels } };
}

const FIELD_ID = "customfield_10016";

describe("createJiraTransport — taskEstimateSet", () => {
  // ── Happy-path: story_points strategies ─────────────────────────────────

  it("fibonacci 5 → story_points field write + est:5 label; 2 calls in order (getJiraIssue → editJiraIssue)", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels([])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("getJiraIssue");
    expect(calls[0].args).toMatchObject({ cloudId: "cloud-abc", issueKey: "KAN-1" });
    expect(calls[1].tool).toBe("editJiraIssue");
    expect(calls[1].args).toMatchObject({
      cloudId: "cloud-abc",
      issueKey: "KAN-1",
      fields: { [FIELD_ID]: 5, labels: ["est:5"] },
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fieldWritten).toBe(FIELD_ID);
      expect(r.data.normalized.points).toBe(5);
      expect(r.data.normalized.jiraTarget).toBe("story_points");
    }
  });

  it("three_point {o:2, m:5, p:8} → PERT=5 written to field; label est:o-2-m-5-p-8", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels([])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: { optimistic: 2, likely: 5, pessimistic: 8 },
      config: { strategy: "three_point", jiraTarget: "story_points", fieldId: FIELD_ID },
    });

    // PERT = (2 + 4*5 + 8) / 6 = 30/6 = 5
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.normalized.points).toBe(5);
      expect(r.data.fieldWritten).toBe(FIELD_ID);
    }
    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    expect(editCall?.args).toMatchObject({
      fields: { [FIELD_ID]: 5, labels: ["est:o-2-m-5-p-8"] },
    });
  });

  it("t_shirt 'M' + sizeMap{M:3} → field write 3 + label est:m", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels([])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: "M",
      config: {
        strategy: "t_shirt",
        jiraTarget: "story_points",
        fieldId: FIELD_ID,
        sizeMap: { M: 3 },
      },
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.normalized.points).toBe(3);
      expect(r.data.fieldWritten).toBe(FIELD_ID);
    }
    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    expect(editCall?.args).toMatchObject({
      fields: { [FIELD_ID]: 3, labels: ["est:m"] },
    });
  });

  // ── Happy-path: time-based strategy ─────────────────────────────────────

  it("ideal_days 3 → timetracking.originalEstimate '3d' + label est:3-ideal-days; fieldWritten 'timetracking'", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels([])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 3,
      config: { strategy: "ideal_days", jiraTarget: "time" },
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fieldWritten).toBe("timetracking");
      expect(r.data.normalized.timeString).toBe("3d");
    }
    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    expect(editCall?.args).toMatchObject({
      fields: {
        timetracking: { originalEstimate: "3d" },
        labels: ["est:3-ideal-days"],
      },
    });
  });

  // ── jiraTarget "none" ────────────────────────────────────────────────────

  it("jiraTarget 'none' → NO native field; label written; fieldWritten null", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels([])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "none" },
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fieldWritten).toBeNull();
    }
    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    // Must NOT write story_points field or timetracking
    const fields = editCall?.args?.fields as Record<string, unknown> | undefined;
    expect(fields).toBeDefined();
    expect(fields?.[FIELD_ID]).toBeUndefined();
    expect(fields?.["timetracking"]).toBeUndefined();
    expect(fields?.["labels"]).toEqual(["est:5"]);
  });

  // ── Guard: story_points without fieldId ─────────────────────────────────

  it("story_points without fieldId → INVALID_REQUEST + hint contains 'Story Points'; NO MCP calls", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points" }, // no fieldId
    });

    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_REQUEST");
      expect(String((r.details as Record<string, unknown>)?.hint ?? "")).toContain("Story Points");
    }
  });

  it("story_points with empty string fieldId → INVALID_REQUEST; NO MCP calls", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: "" },
    });

    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
  });

  // ── Guard: strategy / jiraTarget mismatch (silent no-op prevention) ──────

  it("strategy/jiraTarget mismatch: fibonacci + jiraTarget 'time' → INVALID_REQUEST; NO MCP calls", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "time" },
    });

    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
  });

  it("strategy/jiraTarget mismatch: ideal_days + jiraTarget 'story_points' → INVALID_REQUEST; NO MCP calls", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 3,
      config: { strategy: "ideal_days", jiraTarget: "story_points", fieldId: "customfield_10016" },
    });

    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
  });

  // ── Label idempotency ────────────────────────────────────────────────────

  it("label idempotency: getJiraIssue returns ['keep','est:3'] → editJiraIssue labels=['keep','est:5'] (prior est: stripped)", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels(["keep", "est:3"])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });

    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    const fields = editCall?.args?.fields as Record<string, unknown>;
    expect(fields?.labels).toEqual(["keep", "est:5"]);
  });

  it("label idempotency: re-run with same value strips old est: and appends new one (single est: in result)", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels(["est:5", "other"])],
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });

    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    const labels = (editCall?.args?.fields as Record<string, unknown>)?.labels as string[];
    const estLabels = labels.filter((l) => l.startsWith("est:"));
    expect(estLabels).toHaveLength(1);
    expect(estLabels[0]).toBe("est:5");
    expect(labels).toContain("other");
  });

  // ── normalizeEstimate validation error ──────────────────────────────────

  it("invalid input for strategy (string for fibonacci) → INVALID_REQUEST from normalizeEstimate; NO MCP calls", async () => {
    const { mcp, calls } = makeMcp(new Map());
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: "not-a-number" as unknown as number,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });

    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_REQUEST");
  });

  // ── Error propagation ────────────────────────────────────────────────────

  it("getJiraIssue throws 401 → AUTH_ERROR", async () => {
    const { mcp } = makeMcp(new Map([["getJiraIssue", new Error("401 Unauthorized")]]));
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AUTH_ERROR");
  });

  it("editJiraIssue throws 429 → RATE_LIMITED", async () => {
    const { mcp } = makeMcp(
      new Map([
        ["getJiraIssue", makeIssueLabels([])],
        ["editJiraIssue", new Error("429 Too Many Requests")],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    const r = await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("RATE_LIMITED");
  });

  // ── Defensive label read: alternate shape (root-level labels) ───────────

  it("getJiraIssue returns root-level labels (not nested under fields) → still read correctly", async () => {
    const { mcp, calls } = makeMcp(
      new Map([
        ["getJiraIssue", { labels: ["root-label"] }], // no .fields wrapper
        ["editJiraIssue", {}],
      ]),
    );
    const t = createJiraTransport({ mcp, config: TEST_CONFIG });
    await t.taskEstimateSet!({
      taskId: "KAN-1",
      input: 5,
      config: { strategy: "fibonacci", jiraTarget: "story_points", fieldId: FIELD_ID },
    });

    const editCall = calls.find((c) => c.tool === "editJiraIssue");
    const labels = (editCall?.args?.fields as Record<string, unknown>)?.labels as string[];
    expect(labels).toContain("root-label");
    expect(labels).toContain("est:5");
    expect(labels.filter((l) => l.startsWith("est:"))).toHaveLength(1);
  });
});
