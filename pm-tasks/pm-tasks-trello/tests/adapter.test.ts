import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createAdapter } from "../src/adapter.js";
import type { McpCaller } from "../src/transport-trello.js";

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
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "pm-tasks-trello-adapter-"));
  configPath = path.join(tmpDir, ".trello.json");
  logDir = path.join(tmpDir, "logs");
  await writeFile(
    configPath,
    JSON.stringify({ tool: "trello", boards: [{ id: "b1", name: "B" }] }),
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

describe("createAdapter (trello) — wiring", () => {
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
      /config not found.*npx @llodev\/pm-tasks-trello init/s,
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

describe("createAdapter (trello) — verb dispatch", () => {
  it("taskCreate dispatches through transport to mcp__trello__create_card", async () => {
    const mcp = makeMcp(
      new Map([["mcp__trello__create_card", { id: "card1", url: "https://trello.com/c/card1" }]]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskCreate({
      boardOrProjectId: "b1",
      listOrSectionId: "l1",
      name: "T",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__create_card");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("card1");
  });

  it("taskMove dispatches to mcp__trello__move_card with cardId+idList", async () => {
    const mcp = makeMcp(new Map([["mcp__trello__move_card", { idList: "l2" }]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskMove({
      taskId: "card1",
      targetListOrSectionId: "l2",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__move_card");
    expect(mcpCalls[0].args).toEqual({ cardId: "card1", idList: "l2" });
    expect(result.ok).toBe(true);
  });

  it("checklistCheck dispatches to mcp__trello__trello_update_check_item", async () => {
    const mcp = makeMcp(
      new Map([["mcp__trello__trello_update_check_item", { state: "complete" }]]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.checklistCheck({
      taskId: "card1",
      checklistId: "cl1",
      itemId: "i1",
      targetState: "complete",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__trello_update_check_item");
    expect(result.ok).toBe(true);
  });

  it("taskClose (no closeListOrSectionId) dispatches ONLY mcp__trello__update_card", async () => {
    const mcp = makeMcp(
      new Map<string, unknown>([["mcp__trello__update_card", { id: "card1", dueComplete: true }]]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskClose({ taskId: "card1" });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__update_card");
    expect(result.ok).toBe(true);
  });

  it("taskDueDateSet dispatches to mcp__trello__update_card with due arg", async () => {
    const mcp = makeMcp(new Map([["mcp__trello__update_card", { due: "2026-07-01T12:00:00Z" }]]));
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskDueDateSet({
      taskId: "card1",
      dueAt: "2026-07-01T12:00:00Z",
    });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__update_card");
    expect(mcpCalls[0].args).toEqual({ id: "card1", due: "2026-07-01T12:00:00Z" });
    expect(result.ok).toBe(true);
  });

  it("taskAssigneeAdd dispatches to mcp__trello__trello_add_member_to_card", async () => {
    const mcp = makeMcp(
      new Map([["mcp__trello__trello_add_member_to_card", { idMembers: ["m1"] }]]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskAssigneeAdd({ taskId: "card1", userId: "m1" });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__trello_add_member_to_card");
    expect(result.ok).toBe(true);
  });

  it("taskCommentAdd dispatches to mcp__trello__trello_add_comment and writes audit log to env-overridden dir", async () => {
    const mcp = makeMcp(
      new Map([["mcp__trello__trello_add_comment", { id: "comm1", date: "2026-06-22T20:00:00Z" }]]),
    );
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskCommentAdd({ taskId: "card1", text: "hello" });
    expect(mcpCalls).toHaveLength(1);
    expect(mcpCalls[0].tool).toBe("mcp__trello__trello_add_comment");
    expect(result.ok).toBe(true);

    // Confirm audit log landed in the env-overridden temp dir.
    const auditPath = path.join(logDir, "trello", "audit.log");
    const st = await stat(auditPath);
    expect(st.isFile()).toBe(true);
    expect(st.size).toBeGreaterThan(0);
  });
});
