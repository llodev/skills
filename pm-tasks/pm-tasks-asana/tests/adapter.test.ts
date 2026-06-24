import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createAdapter } from "../src/adapter.js";
import type { McpCaller } from "../src/transport-asana.js";

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

let tmpDir: string;
let configPath: string;
let logDir: string;
let originalLogDir: string | undefined;
let mcpCalls: CallRecord[];

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "pm-tasks-asana-adapter-"));
  configPath = path.join(tmpDir, ".asana.json");
  logDir = path.join(tmpDir, "logs");
  await writeFile(
    configPath,
    JSON.stringify({ tool: "asana", projects: [{ id: "p1", name: "P" }] }),
    "utf8",
  );
  originalLogDir = process.env.LLODEV_PM_TASKS_LOG_DIR;
  process.env.LLODEV_PM_TASKS_LOG_DIR = logDir;
  mcpCalls = [];
});

afterEach(async () => {
  if (originalLogDir === undefined) delete process.env.LLODEV_PM_TASKS_LOG_DIR;
  else process.env.LLODEV_PM_TASKS_LOG_DIR = originalLogDir;
  await rm(tmpDir, { recursive: true, force: true });
});

function makeMcp(responses: Map<string, unknown>): McpCaller {
  return async (tool, args) => {
    mcpCalls.push({ tool, args });
    if (!responses.has(tool)) throw new Error(`Unexpected MCP call: ${tool}`);
    const resp = responses.get(tool);
    if (resp instanceof Error) throw resp;
    return resp;
  };
}

// ---------------------------------------------------------------------------
// 1. createAdapter returns Runtime with all 7 verb methods
// ---------------------------------------------------------------------------

describe("createAdapter (asana) — wiring", () => {
  it("returns a Runtime with all 7 verb methods", async () => {
    const runtime = await createAdapter({
      configPath,
      mcp: async () => ({}),
    });
    expect(typeof runtime.taskCreate).toBe("function");
    expect(typeof runtime.taskMove).toBe("function");
    expect(typeof runtime.checklistCheck).toBe("function");
    expect(typeof runtime.taskClose).toBe("function");
    expect(typeof runtime.taskDueDateSet).toBe("function");
    expect(typeof runtime.taskAssigneeAdd).toBe("function");
    expect(typeof runtime.taskCommentAdd).toBe("function");
  });

  it("throws clear error when configPath missing", async () => {
    const missing = path.join(tmpDir, "nonexistent.json");
    await expect(createAdapter({ configPath: missing, mcp: async () => ({}) })).rejects.toThrow(
      /config not found.*npx @llodev\/pm-tasks-asana init/s,
    );
  });

  it("throws clear error on invalid JSON", async () => {
    await writeFile(configPath, "not valid json{", "utf8");
    await expect(createAdapter({ configPath, mcp: async () => ({}) })).rejects.toThrow(
      /invalid JSON/,
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Verb dispatch via transport → MCP
// ---------------------------------------------------------------------------

describe("createAdapter (asana) — verb dispatch", () => {
  it("taskCreate dispatches through transport to mcp__claude_ai_Asana__create_tasks", async () => {
    const mcp = makeMcp(
      new Map([
        [
          "mcp__claude_ai_Asana__create_tasks",
          {
            tasks: [{ gid: "task1", permalink_url: "https://app.asana.com/0/p1/task1" }],
          },
        ],
      ]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskCreate({
      boardOrProjectId: "p1",
      listOrSectionId: "s1",
      name: "T",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__create_tasks");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("task1");
  });

  it("taskMove dispatches to mcp__claude_ai_Asana__update_tasks", async () => {
    const mcp = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", {}]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskMove({
      taskId: "task1",
      targetListOrSectionId: "s2",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(result.ok).toBe(true);
  });

  it("checklistCheck dispatches to mcp__claude_ai_Asana__update_tasks", async () => {
    const mcp = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", {}]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.checklistCheck({
      taskId: "task1",
      checklistId: "task1",
      itemId: "sub1",
      targetState: "complete",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(result.ok).toBe(true);
  });

  it("taskClose dispatches ONLY to mcp__claude_ai_Asana__update_tasks (single call)", async () => {
    const mcp = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", {}]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskClose({ taskId: "task1" });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(result.ok).toBe(true);
  });

  it("taskDueDateSet dispatches to mcp__claude_ai_Asana__update_tasks with due_on YYYY-MM-DD", async () => {
    const mcp = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", {}]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskDueDateSet({
      taskId: "task1",
      dueAt: "2026-06-22T15:30:00.000Z",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    const args = mcpCalls[0].args as { updates: Array<{ due_on?: string }> };
    expect(args.updates[0].due_on).toBe("2026-06-22");
    expect(result.ok).toBe(true);
  });

  it("taskDueDateSet rejects malformed dueAt with INVALID_REQUEST without calling MCP", async () => {
    const mcp = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", {}]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskDueDateSet({
      taskId: "task1",
      dueAt: "not-iso",
    });
    expect(mcpCalls).toHaveLength(0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_REQUEST");
  });

  it("taskAssigneeAdd dispatches to mcp__claude_ai_Asana__update_tasks", async () => {
    const mcp = makeMcp(new Map([["mcp__claude_ai_Asana__update_tasks", {}]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskAssigneeAdd({ taskId: "task1", userId: "u1" });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__update_tasks");
    expect(result.ok).toBe(true);
  });

  it("taskCommentAdd dispatches to mcp__claude_ai_Asana__add_comment and writes audit log to env-overridden dir", async () => {
    const mcp = makeMcp(
      new Map([
        ["mcp__claude_ai_Asana__add_comment", { gid: "comm1", created_at: "2026-06-22T20:00:00Z" }],
      ]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskCommentAdd({ taskId: "task1", text: "hello" });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__claude_ai_Asana__add_comment");
    expect(result.ok).toBe(true);

    // Confirm audit log landed in the env-overridden temp dir.
    const auditPath = path.join(logDir, "asana", "audit.log");
    const st = await stat(auditPath);
    expect(st.isFile()).toBe(true);
    expect(st.size).toBeGreaterThan(0);
  });
});
