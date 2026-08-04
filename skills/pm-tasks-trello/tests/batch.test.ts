import { describe, it, expect } from "vitest";
import { createTrelloTransport, type McpCaller } from "../src/transport-trello.js";

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

/** Queue-per-tool recording stub: successive calls to the same tool pop the next response. */
function makeQueuedMcp(queues: Record<string, unknown[]>): { mcp: McpCaller; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const mcp: McpCaller = async (tool, args) => {
    calls.push({ tool, args });
    const q = queues[tool];
    if (!q || q.length === 0) throw new Error(`Unexpected MCP call: ${tool}`);
    const resp = q.shift();
    if (resp instanceof Error) throw resp;
    return resp;
  };
  return { mcp, calls };
}

describe("createTrelloTransport — createChecklists", () => {
  it("creates each checklist then its items, returning resolved ids", async () => {
    const { mcp, calls } = makeQueuedMcp({
      mcp__trello__trello_create_checklist: [{ id: "cl1" }],
      mcp__trello__trello_create_check_item: [{ id: "it1" }, { id: "it2" }],
    });
    const transport = createTrelloTransport({ mcp });
    const res = await transport.createChecklists(
      "cardA",
      [{ name: "Pre-flight", items: ["a", "b"] }],
      8,
    );
    expect(res).toEqual({
      ok: true,
      data: [
        {
          id: "cl1",
          name: "Pre-flight",
          items: [
            { id: "it1", name: "a" },
            { id: "it2", name: "b" },
          ],
        },
      ],
    });
    expect(calls[0]).toEqual({
      tool: "mcp__trello__trello_create_checklist",
      args: { cardId: "cardA", name: "Pre-flight" },
    });
    expect(calls.filter((c) => c.tool === "mcp__trello__trello_create_check_item")).toHaveLength(2);
    expect(calls[1].args).toEqual({ checklistId: "cl1", name: "a" });
  });

  it("classifies an MCP rate-limit error", async () => {
    const { mcp } = makeQueuedMcp({
      mcp__trello__trello_create_checklist: [new Error("Trello 429 rate limit")],
    });
    const transport = createTrelloTransport({ mcp });
    const res = await transport.createChecklists("cardA", [{ name: "X", items: [] }], 8);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("RATE_LIMITED");
  });

  it("returns an error envelope (not ok:true with a fabricated empty id) when create_check_item response is malformed", async () => {
    const { mcp } = makeQueuedMcp({
      mcp__trello__trello_create_checklist: [{ id: "cl1" }],
      mcp__trello__trello_create_check_item: [{}], // no `id` field
    });
    const transport = createTrelloTransport({ mcp });
    const res = await transport.createChecklists("cardA", [{ name: "X", items: ["a"] }], 8);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("MCP_ERROR");
  });

  it("regroups items under the correct checklist across multiple checklists, in input order", async () => {
    const { mcp, calls } = makeQueuedMcp({
      mcp__trello__trello_create_checklist: [{ id: "clA" }, { id: "clB" }],
      mcp__trello__trello_create_check_item: [
        { id: "ia1" },
        { id: "ia2" },
        { id: "ib1" },
        { id: "ib2" },
      ],
    });
    const transport = createTrelloTransport({ mcp });
    const res = await transport.createChecklists(
      "cardA",
      [
        { name: "A", items: ["Step 1", "Step 2"] },
        { name: "B", items: ["Task 1", "Task 2"] },
      ],
      8,
    );
    expect(res).toEqual({
      ok: true,
      data: [
        {
          id: "clA",
          name: "A",
          items: [
            { id: "ia1", name: "Step 1" },
            { id: "ia2", name: "Step 2" },
          ],
        },
        {
          id: "clB",
          name: "B",
          items: [
            { id: "ib1", name: "Task 1" },
            { id: "ib2", name: "Task 2" },
          ],
        },
      ],
    });
    expect(calls.filter((c) => c.tool === "mcp__trello__trello_create_checklist")).toHaveLength(2);
    expect(calls.filter((c) => c.tool === "mcp__trello__trello_create_check_item")).toHaveLength(4);
  });
});
