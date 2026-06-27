import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createAdapter } from "../src/adapter.js";
import type { McpCaller } from "../src/adapter.js";

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

let tmpDir: string;
let configPath: string;
let logDir: string;
let originalLogDir: string | undefined;
let calls: CallRecord[];

/** Minimal valid .jira.json config */
const TEST_CONFIG = {
  tool: "jira",
  site: { cloudId: "cloud-abc" },
  project: { key: "KAN" },
  issueTypes: { task: "Task", subtask: "Subtask" },
};

/**
 * Omnibus stub McpCaller — returns minimal valid shapes for every Jira MCP
 * tool the transport calls. Records calls for inspection.
 *
 * Verbs that need transitions (taskMove, taskClose, checklistCheck) receive a
 * response that covers all three status categories so any categoryKey resolves.
 */
function makeOmnibusMcp(): McpCaller {
  return async (tool, args) => {
    calls.push({ tool, args: args as Record<string, unknown> });
    switch (tool) {
      case "createJiraIssue":
        return { key: "KAN-42", url: "https://example.atlassian.net/browse/KAN-42" };
      case "getTransitionsForJiraIssue":
        return {
          transitions: [
            { id: "11", name: "To Do", to: { id: "1", statusCategory: { key: "new" } } },
            {
              id: "21",
              name: "In Progress",
              to: { id: "3", statusCategory: { key: "indeterminate" } },
            },
            { id: "31", name: "Done", to: { id: "10002", statusCategory: { key: "done" } } },
          ],
        };
      case "transitionJiraIssue":
        return {};
      case "editJiraIssue":
        return {};
      case "addCommentToJiraIssue":
        return { id: "comment-1", created: "2026-06-27T00:00:00.000Z" };
      default:
        throw new Error(`Unexpected MCP call: ${tool}`);
    }
  };
}

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "pm-tasks-jira-adapter-"));
  configPath = path.join(tmpDir, ".jira.json");
  logDir = path.join(tmpDir, "logs");
  await writeFile(configPath, JSON.stringify(TEST_CONFIG), "utf8");
  originalLogDir = process.env.LLODEV_PM_TASKS_LOG_DIR;
  process.env.LLODEV_PM_TASKS_LOG_DIR = logDir;
  calls = [];
});

afterEach(async () => {
  if (originalLogDir === undefined) delete process.env.LLODEV_PM_TASKS_LOG_DIR;
  else process.env.LLODEV_PM_TASKS_LOG_DIR = originalLogDir;
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. createAdapter wiring
// ---------------------------------------------------------------------------

describe("createAdapter (jira) — wiring", () => {
  it("returns a Runtime with all 7 verb methods + F3/F7", async () => {
    const runtime = await createAdapter({ configPath, mcp: async () => ({}) });
    expect(typeof runtime.taskCreate).toBe("function");
    expect(typeof runtime.taskMove).toBe("function");
    expect(typeof runtime.checklistCheck).toBe("function");
    expect(typeof runtime.taskClose).toBe("function");
    expect(typeof runtime.taskDueDateSet).toBe("function");
    expect(typeof runtime.taskAssigneeAdd).toBe("function");
    expect(typeof runtime.taskCommentAdd).toBe("function");
    expect(typeof runtime.taskParentSet).toBe("function");
    expect(typeof runtime.taskEstimateSet).toBe("function");
  });

  it("throws when configPath missing", async () => {
    const missing = path.join(tmpDir, "nonexistent.json");
    await expect(createAdapter({ configPath: missing, mcp: async () => ({}) })).rejects.toThrow(
      /ENOENT|no such file/,
    );
  });

  it("throws when config is invalid JSON", async () => {
    await writeFile(configPath, "not valid json{", "utf8");
    // adapter.ts pre-parses config before calling createCoreRuntime, so a
    // native SyntaxError is thrown rather than the core's friendly message.
    await expect(createAdapter({ configPath, mcp: async () => ({}) })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Verb dispatch — all 5 core verbs → ok:true with stub transport
// ---------------------------------------------------------------------------

describe("createAdapter (jira) — verb dispatch: ok:true", () => {
  it("taskCreate dispatches to createJiraIssue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskCreate({
      boardOrProjectId: "KAN", // ignored by Jira transport; identity from config
      listOrSectionId: "", // ignored by Jira transport; status via transitions
      name: "Test issue",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("KAN-42");
    const created = calls.filter((c) => c.tool === "createJiraIssue");
    expect(created).toHaveLength(1);
  });

  it("taskMove dispatches to getTransitionsForJiraIssue + transitionJiraIssue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    // targetListOrSectionId is used as the status category key in the Jira transport
    const result = await runtime.taskMove({ taskId: "KAN-1", targetListOrSectionId: "done" });
    expect(result.ok).toBe(true);
    const toolsUsed = calls.map((c) => c.tool);
    expect(toolsUsed).toContain("getTransitionsForJiraIssue");
    expect(toolsUsed).toContain("transitionJiraIssue");
  });

  it("checklistCheck (complete) dispatches to createJiraIssue + transition → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.checklistCheck({
      taskId: "KAN-1",
      checklistId: "KAN-1",
      itemId: "Fix the bug",
      targetState: "complete",
    });
    expect(result.ok).toBe(true);
    const toolsUsed = calls.map((c) => c.tool);
    expect(toolsUsed).toContain("createJiraIssue");
    expect(toolsUsed).toContain("getTransitionsForJiraIssue");
    expect(toolsUsed).toContain("transitionJiraIssue");
  });

  it("taskClose dispatches to getTransitionsForJiraIssue + transitionJiraIssue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskClose({ taskId: "KAN-1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.closed).toBe(true);
    const toolsUsed = calls.map((c) => c.tool);
    expect(toolsUsed).toContain("getTransitionsForJiraIssue");
    expect(toolsUsed).toContain("transitionJiraIssue");
  });

  it("taskDueDateSet dispatches to editJiraIssue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskDueDateSet({
      taskId: "KAN-1",
      dueAt: "2026-07-15T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    const edited = calls.filter((c) => c.tool === "editJiraIssue");
    expect(edited).toHaveLength(1);
  });

  it("taskAssigneeAdd (accountId fast-path) dispatches to editJiraIssue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    // Atlassian accountId format — skips lookupJiraAccountId
    const result = await runtime.taskAssigneeAdd({
      taskId: "KAN-1",
      userId: "712020:aabbccdd-1234-5678-abcd-ef0123456789",
    });
    expect(result.ok).toBe(true);
    const toolsUsed = calls.map((c) => c.tool);
    expect(toolsUsed).not.toContain("lookupJiraAccountId");
    expect(toolsUsed).toContain("editJiraIssue");
  });

  it("taskCommentAdd dispatches to addCommentToJiraIssue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskCommentAdd({ taskId: "KAN-1", text: "Looks good!" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.commentId).toBe("comment-1");
    const commented = calls.filter((c) => c.tool === "addCommentToJiraIssue");
    expect(commented).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 3. F3 / F7 — UNSUPPORTED_VERB (transport does not implement them yet)
// ---------------------------------------------------------------------------

describe("createAdapter (jira) — F3/F7 UNSUPPORTED_VERB", () => {
  it("taskParentSet returns UNSUPPORTED_VERB (Phase 4)", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskParentSet({ taskId: "KAN-1", parentTaskId: "KAN-0" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNSUPPORTED_VERB");
  });

  it("taskEstimateSet returns UNSUPPORTED_VERB (Phase 4)", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskEstimateSet({ taskId: "KAN-1", estimate: "3h" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNSUPPORTED_VERB");
  });
});
