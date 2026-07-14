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

/** Minimal valid .linear.json config */
const TEST_CONFIG = {
  version: "1",
  team: { id: "team-abc", key: "ENG", name: "Engineering" },
  states: [
    { id: "state-unstarted", name: "Todo", type: "unstarted" },
    { id: "state-started", name: "In Progress", type: "started" },
    { id: "state-completed", name: "Done", type: "completed" },
  ],
  labels: [{ id: "label-bug", name: "bug" }],
  estimation: {
    strategy: "story_points",
    linearTarget: "points",
    enabled: true,
  },
  cycles: { enabled: true },
};

/**
 * Omnibus stub McpCaller — returns minimal valid shapes for every Linear MCP
 * tool the transport calls. Records calls for inspection.
 */
function makeOmnibusMcp(): McpCaller {
  return async (tool, args) => {
    calls.push({ tool, args: args as Record<string, unknown> });
    switch (tool) {
      case "save_issue":
        return { id: "issue-42", url: "https://linear.app/team/issue/ENG-42" };
      case "save_comment":
        return { id: "comment-1", createdAt: "2026-06-27T00:00:00.000Z" };
      case "get_issue":
        return { labels: [] };
      case "list_cycles":
        return { nodes: [{ id: "cycle-1", name: "Sprint 1", number: 1 }] };
      default:
        throw new Error(`Unexpected MCP call: ${tool}`);
    }
  };
}

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "pm-tasks-linear-adapter-"));
  configPath = path.join(tmpDir, ".linear.json");
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

describe("createAdapter (linear) — wiring", () => {
  it("returns a Runtime with all 7 base verb methods + F3/F7/F10", async () => {
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
    expect(typeof runtime.taskSprintSet).toBe("function");
  });

  it("throws when configPath missing", async () => {
    const missing = path.join(tmpDir, "nonexistent.json");
    await expect(createAdapter({ configPath: missing, mcp: async () => ({}) })).rejects.toThrow(
      /ENOENT|no such file|not found/,
    );
  });

  it("throws when config is invalid JSON", async () => {
    await writeFile(configPath, "not valid json{", "utf8");
    await expect(createAdapter({ configPath, mcp: async () => ({}) })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Verb dispatch — core verbs → ok:true with omnibus stub transport
// ---------------------------------------------------------------------------

describe("createAdapter (linear) — verb dispatch: ok:true", () => {
  it("taskCreate dispatches to save_issue → ok:true with id", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskCreate({
      boardOrProjectId: "IGNORED",
      listOrSectionId: "IGNORED",
      name: "Test issue",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("issue-42");
    expect(calls.filter((c) => c.tool === "save_issue")).toHaveLength(1);
  });

  it("taskMove dispatches to save_issue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskMove({ taskId: "issue-1", targetListOrSectionId: "done" });
    expect(result.ok).toBe(true);
    expect(calls.some((c) => c.tool === "save_issue")).toBe(true);
  });

  it("checklistCheck dispatches to save_issue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.checklistCheck({
      taskId: "issue-1",
      checklistId: "ignored",
      itemId: "sub-issue-1",
      targetState: "complete",
    });
    expect(result.ok).toBe(true);
    expect(calls.some((c) => c.tool === "save_issue")).toBe(true);
  });

  it("taskClose dispatches to save_issue → ok:true with closed=true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskClose({ taskId: "issue-1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.closed).toBe(true);
  });

  it("taskDueDateSet dispatches to save_issue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskDueDateSet({
      taskId: "issue-1",
      dueAt: "2026-07-15T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.newDueAt).toBe("2026-07-15");
  });

  it("taskAssigneeAdd dispatches to save_issue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskAssigneeAdd({ taskId: "issue-1", userId: "user-abc" });
    expect(result.ok).toBe(true);
  });

  it("taskCommentAdd dispatches to save_comment → ok:true with commentId", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskCommentAdd({ taskId: "issue-1", text: "Hello!" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.commentId).toBe("comment-1");
    expect(calls.some((c) => c.tool === "save_comment")).toBe(true);
  });

  it("taskParentSet dispatches to save_issue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskParentSet({ taskId: "issue-child", parentId: "issue-parent" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.newParentId).toBe("issue-parent");
  });

  it("taskSprintSet dispatches to list_cycles + save_issue → ok:true", async () => {
    const runtime = await createAdapter({ configPath, mcp: makeOmnibusMcp() });
    const result = await runtime.taskSprintSet({ taskId: "issue-1", sprintRef: "Sprint 1" });
    expect(result.ok).toBe(true);
    expect(calls.some((c) => c.tool === "list_cycles")).toBe(true);
    expect(calls.some((c) => c.tool === "save_issue")).toBe(true);
  });
});
