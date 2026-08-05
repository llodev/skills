import { describe, it, expect } from "vitest";
import { createTrelloTransport, type McpCaller } from "../src/transport-trello.js";
import { batchCreateWithChecklists } from "../src/batch-create.js";
import type { Runtime } from "@llodev/pm-tasks-core/runtime";
import type { TrelloTransport } from "../src/transport-trello.js";

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

describe("batchCreateWithChecklists — orchestrator", () => {
  it("creates each card via runtime.taskCreate then its checklists via transport", async () => {
    const created: string[] = [];
    const runtime = {
      taskCreate: async (req: { name: string }) => {
        created.push(req.name);
        return { ok: true as const, data: { id: `card-${req.name}`, url: `u/${req.name}` } };
      },
    } as unknown as Runtime;
    const transport = {
      createChecklists: async (cardId: string, cls: { name: string }[]) => ({
        ok: true as const,
        data: cls.map((c) => ({ id: `cl-${cardId}`, name: c.name, items: [] })),
      }),
    } as unknown as TrelloTransport;

    const res = await batchCreateWithChecklists(
      {
        boardOrProjectId: "b",
        cards: [
          { listOrSectionId: "l", name: "A", checklists: [{ name: "Pre-flight", items: [] }] },
          { listOrSectionId: "l", name: "B" },
        ],
      },
      { runtime, transport },
    );

    expect(created).toEqual(["A", "B"]);
    expect(res.ok).toBe(true);
    expect(res.created).toBe(2);
    expect(res.failed).toBe(0);
    expect(res.results[0]).toEqual({
      ok: true,
      card: { id: "card-A", url: "u/A" },
      checklists: [{ id: "cl-card-A", name: "Pre-flight", items: [] }],
    });
  });

  it("marks a card failed when runtime.taskCreate fails, without aborting the batch", async () => {
    const runtime = {
      taskCreate: async (req: { name: string }) =>
        req.name === "bad"
          ? { ok: false as const, code: "MCP_ERROR" as const, details: { message: "boom" } }
          : { ok: true as const, data: { id: `card-${req.name}` } },
    } as unknown as Runtime;
    const transport = {
      createChecklists: async () => ({ ok: true as const, data: [] }),
    } as unknown as TrelloTransport;

    const res = await batchCreateWithChecklists(
      {
        boardOrProjectId: "b",
        cards: [
          { listOrSectionId: "l", name: "bad" },
          { listOrSectionId: "l", name: "ok" },
        ],
      },
      { runtime, transport },
    );

    expect(res.ok).toBe(false);
    expect(res.created).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results[0].ok).toBe(false);
    expect(res.results[0].error?.code).toBe("MCP_ERROR");
  });

  it("does not abort the batch when runtime.taskCreate THROWS (rejects) for one card", async () => {
    const runtime = {
      taskCreate: async (req: { name: string }) => {
        if (req.name === "boom") throw new Error("audit append failed: disk full");
        return { ok: true as const, data: { id: `card-${req.name}` } };
      },
    } as unknown as Runtime;
    const transport = {
      createChecklists: async () => ({ ok: true as const, data: [] }),
    } as unknown as TrelloTransport;

    // Must not throw/reject even though one worker's runtime.taskCreate rejects.
    const res = await batchCreateWithChecklists(
      {
        boardOrProjectId: "b",
        cards: [
          { listOrSectionId: "l", name: "boom" },
          { listOrSectionId: "l", name: "ok" },
        ],
      },
      { runtime, transport },
    );

    expect(res.ok).toBe(false);
    expect(res.created).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results[0].ok).toBe(false);
    expect(res.results[0].error).toEqual({
      code: "MCP_ERROR",
      message: "audit append failed: disk full",
    });
    expect(res.results[1]).toEqual({
      ok: true,
      card: { id: "card-ok" },
      checklists: [],
    });
  });

  it("marks a card failed when transport.createChecklists fails, still carrying the card ref", async () => {
    const runtime = {
      taskCreate: async (req: { name: string }) => ({
        ok: true as const,
        data: { id: `card-${req.name}`, url: `u/${req.name}` },
      }),
    } as unknown as Runtime;
    const transport = {
      createChecklists: async () => ({
        ok: false as const,
        code: "MCP_ERROR" as const,
        details: { message: "checklist create failed" },
      }),
    } as unknown as TrelloTransport;

    const res = await batchCreateWithChecklists(
      {
        boardOrProjectId: "b",
        cards: [
          { listOrSectionId: "l", name: "A", checklists: [{ name: "Pre-flight", items: [] }] },
        ],
      },
      { runtime, transport },
    );

    expect(res.ok).toBe(false);
    expect(res.created).toBe(0);
    expect(res.failed).toBe(1);
    expect(res.results[0]).toEqual({
      ok: false,
      card: { id: "card-A", url: "u/A" },
      checklists: [],
      error: { code: "MCP_ERROR", message: "checklist create failed" },
    });
  });
});
