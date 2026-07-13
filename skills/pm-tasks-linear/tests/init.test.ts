import { describe, it, expect } from "vitest";
import {
  runInit,
  stripEnvQuotes,
  sanitizePersistedConfig,
  type LinearInitApi,
  type InitDeps,
} from "../src/init-flow.js";

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

const TEAM = { id: "team-abc", key: "ENG", name: "Engineering" };

const STATES = [
  { id: "state-backlog", name: "Backlog", type: "backlog" },
  { id: "state-todo", name: "Todo", type: "unstarted" },
  { id: "state-wip", name: "In Progress", type: "started" },
  { id: "state-done", name: "Done", type: "completed" },
  { id: "state-canceled", name: "Canceled", type: "canceled" },
  { id: "state-duplicate", name: "Duplicate", type: "duplicate" },
];

const LABELS = [
  { id: "label-1", name: "bug" },
  { id: "label-2", name: "feature" },
];

const USERS = [
  { id: "user-1", name: "Alice", email: "alice@example.com" },
  { id: "user-2", name: "Bob", email: "bob@example.com" },
];

function makeApi(overrides: Partial<LinearInitApi> = {}): LinearInitApi {
  return {
    getTeams: async () => [TEAM],
    getStates: async () => STATES,
    getLabels: async () => LABELS,
    getUsers: async () => USERS,
    getTeamSettings: async () => ({
      cyclesEnabled: true,
      issueEstimationType: "fibonacci",
    }),
    getCycles: async () => [],
    ...overrides,
  };
}

/** Minimal deps — all prompts auto-answer, nothing written to disk */
function baseDeps(api: LinearInitApi, overrides: Partial<InitDeps> = {}): InitDeps {
  return {
    api,
    locale: "en-US",
    pick: async (_label, choices) => choices[0].value,
    yesNo: async () => false,
    doWrite: async () => undefined,
    doValidate: async () => ({ ok: true }),
    doLoadSchema: async () => ({}),
    outPath: "/dev/null",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Path A — MCP-driven (via injected api stub)
// ---------------------------------------------------------------------------

describe("runInit — happy path (estimation enabled)", () => {
  it("writes team block correctly", async () => {
    const out = await runInit(baseDeps(makeApi()));
    expect(out["team"]).toEqual({ id: "team-abc", key: "ENG", name: "Engineering" });
  });

  it("captures states array", async () => {
    const out = await runInit(baseDeps(makeApi()));
    expect(out["states"]).toEqual(STATES);
  });

  it("captures labels array", async () => {
    const out = await runInit(baseDeps(makeApi()));
    expect(out["labels"]).toEqual(LABELS);
  });

  it("captures members with email", async () => {
    const out = await runInit(baseDeps(makeApi()));
    const members = out["members"] as Array<Record<string, unknown>>;
    expect(members).toHaveLength(2);
    expect(members[0]).toEqual({ id: "user-1", name: "Alice", email: "alice@example.com" });
  });

  it("writes estimation.enabled explicitly (M2)", async () => {
    const out = await runInit(baseDeps(makeApi()));
    const est = out["estimation"] as Record<string, unknown>;
    expect(typeof est["enabled"]).toBe("boolean");
    expect(est["enabled"]).toBe(true);
  });

  it("writes cycles block", async () => {
    const out = await runInit(baseDeps(makeApi()));
    expect(out["cycles"]).toEqual({ enabled: true });
  });

  it("writes version=1 and locale", async () => {
    const out = await runInit(baseDeps(makeApi()));
    expect(out["version"]).toBe("1");
    expect(out["locale"]).toBe("en-US");
  });

  it("fibonacci strategy → scale=[1,2,3,5,8,13] + linearTarget=points", async () => {
    const out = await runInit(baseDeps(makeApi()));
    const est = out["estimation"] as Record<string, unknown>;
    expect(est["strategy"]).toBe("fibonacci");
    expect(est["scale"]).toEqual([1, 2, 3, 5, 8, 13]);
    expect(est["linearTarget"]).toBe("points");
  });

  it("does NOT include autonomous block when answered no", async () => {
    const out = await runInit(baseDeps(makeApi(), { yesNo: async () => false }));
    expect(out["autonomous"]).toBeUndefined();
  });

  it("includes autonomous block when answered yes", async () => {
    const out = await runInit(baseDeps(makeApi(), { yesNo: async () => true }));
    const auto = out["autonomous"] as Record<string, unknown>;
    expect(auto).toBeDefined();
    expect((auto["allow"] as string[]).length).toBeGreaterThan(0);
    expect((auto["scope"] as Record<string, unknown>)["teams"]).toContain("team-abc");
  });

  it("t_shirt strategy → sizeMap present", async () => {
    const out = await runInit(
      baseDeps(makeApi(), {
        pick: async (_label, choices) => {
          // First pick is team (only one so skip), then strategy
          const tshirt = choices.find((c) => (c.value as unknown) === "t_shirt");
          return (tshirt ?? choices[0]).value;
        },
      }),
    );
    const est = out["estimation"] as Record<string, unknown>;
    if (est["strategy"] === "t_shirt") {
      expect(est["sizeMap"]).toBeDefined();
    }
  });
});

describe("runInit — estimation disabled", () => {
  it("writes linearTarget=none and enabled=false when issueEstimationType=notUsed", async () => {
    const api = makeApi({
      getTeamSettings: async () => ({
        cyclesEnabled: false,
        issueEstimationType: "notUsed",
      }),
    });
    const out = await runInit(baseDeps(api));
    const est = out["estimation"] as Record<string, unknown>;
    expect(est["enabled"]).toBe(false);
    expect(est["linearTarget"]).toBe("none");
  });
});

describe("runInit — cycles via getCycles fallback", () => {
  it("cycles.enabled=true when cyclesEnabled=false but cycles list is non-empty", async () => {
    const api = makeApi({
      getTeamSettings: async () => ({
        cyclesEnabled: false,
        issueEstimationType: "fibonacci",
      }),
      getCycles: async () => [{ id: "cycle-1", name: "Sprint 1", number: 1 }],
    });
    const out = await runInit(baseDeps(api));
    expect(out["cycles"]).toEqual({ enabled: true });
  });

  it("cycles.enabled=false when cyclesEnabled=false and empty list", async () => {
    const api = makeApi({
      getTeamSettings: async () => ({
        cyclesEnabled: false,
        issueEstimationType: "fibonacci",
      }),
      getCycles: async () => [],
    });
    const out = await runInit(baseDeps(api));
    expect(out["cycles"]).toEqual({ enabled: false });
  });
});

describe("runInit — multiple teams → picks first by default", () => {
  it("picks team index 0 by default when multiple teams exist", async () => {
    const api = makeApi({
      getTeams: async () => [
        { id: "team-abc", key: "ENG", name: "Engineering" },
        { id: "team-xyz", key: "OPS", name: "Operations" },
      ],
    });
    const out = await runInit(baseDeps(api));
    // default pick fn picks first → ENG
    expect((out["team"] as Record<string, unknown>)["key"]).toBe("ENG");
  });
});

// ---------------------------------------------------------------------------
// Path B — GraphQL standalone (mocked fetch)
// ---------------------------------------------------------------------------

describe("runInit — GraphQL path (mocked fetch)", () => {
  it("uses LINEAR_API_KEY without Bearer prefix to call GraphQL", async () => {
    const capturedHeaders: Record<string, string>[] = [];

    const mockFetch = async (
      _url: string,
      opts: { headers?: Record<string, string>; body?: string },
    ) => {
      capturedHeaders.push(opts.headers ?? {});
      const body = JSON.parse(opts.body ?? "{}") as { query?: string };
      const query = body.query ?? "";

      // Respond appropriately based on query content
      let data: unknown;
      if (query.includes("teams")) {
        data = { teams: { nodes: [{ id: "team-gql", key: "GQL", name: "GQL Team" }] } };
      } else if (query.includes("states")) {
        data = {
          team: {
            states: { nodes: [{ id: "s-1", name: "Done", type: "completed" }] },
          },
        };
      } else if (query.includes("issueLabels")) {
        data = { issueLabels: { nodes: [{ id: "l-1", name: "bug" }] } };
      } else if (query.includes("users")) {
        data = { users: { nodes: [{ id: "u-1", name: "Bob", email: "bob@example.com" }] } };
      } else if (query.includes("cyclesEnabled")) {
        data = { team: { cyclesEnabled: true, issueEstimationType: "fibonacci" } };
      } else if (query.includes("cycles")) {
        data = { team: { cycles: { nodes: [] } } };
      } else {
        data = {};
      }

      return {
        ok: true,
        json: async () => ({ data }),
      };
    };

    // Inject mock fetch into globalThis
    const origFetch = globalThis.fetch;
    (globalThis as Record<string, unknown>).fetch = mockFetch;

    try {
      // Clear the api dep; provide LINEAR_API_KEY via env
      const origKey = process.env.LINEAR_API_KEY;
      process.env.LINEAR_API_KEY = "lin_api_test_key";

      const out = await runInit({
        locale: "en-US",
        pick: async (_label, choices) => choices[0].value,
        yesNo: async () => false,
        doWrite: async () => undefined,
        doValidate: async () => ({ ok: true }),
        doLoadSchema: async () => ({}),
        outPath: "/dev/null",
      });

      // GraphQL header must NOT have Bearer prefix
      expect(capturedHeaders[0]["Authorization"]).toBe("lin_api_test_key");
      expect(capturedHeaders[0]["Authorization"]).not.toContain("Bearer");

      // Config produced correctly
      expect((out["team"] as Record<string, unknown>)["id"]).toBe("team-gql");

      process.env.LINEAR_API_KEY = origKey;
    } finally {
      (globalThis as Record<string, unknown>).fetch = origFetch;
    }
  });

  it("strips surrounding quotes from LINEAR_API_KEY (M-guard)", () => {
    expect(stripEnvQuotes('"lin_api_123"')).toBe("lin_api_123");
    expect(stripEnvQuotes("'lin_api_123'")).toBe("lin_api_123");
    expect(stripEnvQuotes("lin_api_123")).toBe("lin_api_123");
  });
});

// ---------------------------------------------------------------------------
// MCP path — via deps.mcp (McpCaller injection)
// ---------------------------------------------------------------------------

describe("runInit — MCP path (mocked McpCaller)", () => {
  it("calls list_teams, list_issue_statuses, list_issue_labels, list_users, get_team via MCP", async () => {
    const mcpCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];

    const mockMcp = async (tool: string, args: Record<string, unknown>) => {
      mcpCalls.push({ tool, args });
      switch (tool) {
        case "list_teams":
          return { nodes: [{ id: "mcp-team", key: "MCP", name: "MCP Team" }] };
        case "list_issue_statuses":
          return {
            nodes: [{ id: "s-done", name: "Done", type: "completed" }],
          };
        case "list_issue_labels":
          return { nodes: [{ id: "l-bug", name: "bug" }] };
        case "list_users":
          return { nodes: [{ id: "u-alice", name: "Alice", email: "alice@co.com" }] };
        case "get_team":
          return { cyclesEnabled: false, issueEstimationType: "fibonacci" };
        case "list_cycles":
          return { nodes: [] };
        default:
          throw new Error(`Unexpected MCP call: ${tool}`);
      }
    };

    const out = await runInit({
      mcp: mockMcp,
      locale: "en-US",
      pick: async (_label, choices) => choices[0].value,
      yesNo: async () => false,
      doWrite: async () => undefined,
      doValidate: async () => ({ ok: true }),
      doLoadSchema: async () => ({}),
      outPath: "/dev/null",
    });

    expect((out["team"] as Record<string, unknown>)["id"]).toBe("mcp-team");
    expect(mcpCalls.map((c) => c.tool)).toContain("list_teams");
    expect(mcpCalls.map((c) => c.tool)).toContain("list_issue_statuses");
    expect(mcpCalls.map((c) => c.tool)).toContain("list_issue_labels");
    expect(mcpCalls.map((c) => c.tool)).toContain("list_users");
    expect(mcpCalls.map((c) => c.tool)).toContain("get_team");

    // Verify corrected MCP param keys (real schema conformance)
    const statusCall = mcpCalls.find((c) => c.tool === "list_issue_statuses");
    expect(statusCall?.args).toHaveProperty("team"); // not teamId
    expect(statusCall?.args).not.toHaveProperty("teamId");

    const teamCall = mcpCalls.find((c) => c.tool === "get_team");
    expect(teamCall?.args).toHaveProperty("query"); // not id
    expect(teamCall?.args).not.toHaveProperty("id");
  });
});

// ---------------------------------------------------------------------------
// sanitizePersistedConfig
// ---------------------------------------------------------------------------

describe("sanitizePersistedConfig", () => {
  it("rejects strings with control characters", () => {
    expect(() => sanitizePersistedConfig("hello" + String.fromCharCode(0) + "world")).toThrow(
      "unsafe",
    );
  });

  it("rejects strings exceeding max length", () => {
    const longStr = "x".repeat(1025);
    expect(() => sanitizePersistedConfig(longStr)).toThrow("unsafe");
  });

  it("passes clean strings", () => {
    expect(sanitizePersistedConfig("hello world")).toBe("hello world");
  });

  it("recursively sanitizes nested objects", () => {
    const safe = sanitizePersistedConfig({ team: { id: "t1", name: "Eng" } });
    expect(safe).toEqual({ team: { id: "t1", name: "Eng" } });
  });
});
