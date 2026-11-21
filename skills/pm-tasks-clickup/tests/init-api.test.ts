import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  ClickUpInitError,
  createMcpInitApi,
  createRestInitApi,
  type ClickUpListSummary,
} from "../src/init-api.js";
import { mapStatuses } from "../src/status-map.js";
import { makeMcp, mcpFixture, type ResponseFn } from "./helpers/mcp-stub.js";

// A synthetic token (no `pk_<id>_` shape, so secret scanners stay quiet).
const TOKEN = "test-token-not-real-0123456789abcdef";
const BASE = "https://api.clickup.com/api/v2";

const WS = "90130000001";
const SPACE = { id: "901310000001", name: "Space 1" };
const FOLDER = { id: "1000400000000001", name: "pm-tasks-sandbox" };
const LIST_A = "1000400000000002";
const LIST_B = "1000400000000003";
const FOLDERLESS = "901330000001";

type Json = Record<string, unknown>;

function restFixture(name: string): Json {
  const url = new URL(`./fixtures/rest/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Json;
}

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

/** A route answer: a JSON body (status 200) or a function building the Response. */
type Route = unknown;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * A recording fetch serving routes keyed by the path after the base URL
 * (query string included). An unknown route answers 418 so the API under test
 * throws and the test fails loudly.
 */
function makeFetch(routes: Record<string, Route>): { fetchFn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    const key = url.startsWith(BASE) ? url.slice(BASE.length) : url;
    if (!(key in routes)) return new Response("unexpected route", { status: 418 });
    const route = routes[key];
    return typeof route === "function" ? (route as () => Response)() : json(route);
  };
  return { fetchFn, calls };
}

/** The routes of a workspace with one space, one folder (two lists) and one folderless list. */
function populatedRoutes(): Record<string, Route> {
  return {
    "/team": restFixture("workspaces"),
    [`/team/${WS}/space`]: restFixture("spaces"),
    [`/space/${SPACE.id}/folder`]: restFixture("folders.populated"),
    [`/space/${SPACE.id}/list`]: restFixture("folderless-lists"),
    [`/list/${FOLDERLESS}`]: restFixture("list"),
  };
}

const POPULATED_LISTS: ClickUpListSummary[] = [
  { id: LIST_A, name: "sandbox-a", space: SPACE, folder: FOLDER },
  { id: LIST_B, name: "sandbox-b", space: SPACE, folder: FOLDER },
  { id: FOLDERLESS, name: "List 1", space: SPACE },
];

async function captureError(p: Promise<unknown> | (() => unknown)): Promise<ClickUpInitError> {
  try {
    if (typeof p === "function") p();
    else await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ClickUpInitError);
    return e as ClickUpInitError;
  }
  throw new Error("expected a ClickUpInitError, nothing was thrown");
}

/** Every rendering of the error a caller could print or log. */
function renderings(err: Error): string[] {
  return [
    err.message,
    String(err),
    err.stack ?? "",
    JSON.stringify(err),
    JSON.stringify(err.cause ?? null),
  ];
}

describe("createRestInitApi: requests", () => {
  it("sends the Authorization header exactly as captured (no Bearer)", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    const api = createRestInitApi(TOKEN, fetchFn);
    await api.getWorkspaces();
    await api.getLists(WS);
    await api.getListStatuses(FOLDERLESS);

    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      const headers = new Headers(c.init?.headers);
      expect(headers.get("authorization")).toBe(TOKEN);
      expect([...headers.keys()]).toEqual(["authorization"]);
      expect(headers.get("authorization")).not.toMatch(/bearer/i);
    }
  });

  it("calls only GET, with no body", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    const api = createRestInitApi(TOKEN, fetchFn);
    await api.getWorkspaces();
    await api.getLists(WS);
    await api.getListStatuses(FOLDERLESS);
    await api.getMembers(WS);

    for (const c of calls) {
      expect(c.init?.method).toBe("GET");
      expect(c.init?.body).toBeUndefined();
    }
  });

  it("never puts the token in a URL and never asks for archived items", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    const api = createRestInitApi(TOKEN, fetchFn);
    await api.getWorkspaces();
    await api.getLists(WS);
    await api.getListStatuses(FOLDERLESS);

    for (const c of calls) {
      expect(c.url.startsWith(`${BASE}/`)).toBe(true);
      expect(c.url).not.toContain(TOKEN);
      expect(c.url).not.toContain("archived");
      expect(c.url).not.toContain("?");
    }
  });

  it("trims surrounding whitespace from the token", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    await createRestInitApi(`  ${TOKEN}\n`, fetchFn).getWorkspaces();
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe(TOKEN);
  });

  it("does not expose the token on the returned object", () => {
    const api = createRestInitApi(TOKEN, makeFetch({}).fetchFn);
    for (const value of Object.values(api)) expect(typeof value).toBe("function");
    expect(JSON.stringify(api)).not.toContain(TOKEN);
  });
});

describe("createRestInitApi: token validation", () => {
  const bad = [
    "",
    "   ",
    "abc def",
    "abc\tdef",
    "abc\ndef",
    "abc\u0000def",
    "abc\u007fdef",
    "tokén",
  ];

  it.each(bad.map((t) => [JSON.stringify(t), t]))(
    "rejects a malformed token %s without echoing it and before any request",
    async (_label, token) => {
      const { fetchFn, calls } = makeFetch(populatedRoutes());
      const err = await captureError(() => createRestInitApi(token, fetchFn));
      expect(err.code).toBe("AUTH");
      expect(err.message).toContain("CLICKUP_API_TOKEN");
      if (token.trim() !== "") {
        for (const text of renderings(err)) expect(text).not.toContain(token.trim());
      }
      expect(calls).toHaveLength(0);
    },
  );

  it("the malformed-token message names non-ASCII characters", async () => {
    const err = await captureError(() => createRestInitApi("tokén"));
    expect(err.message).toContain("non-ASCII");
  });
});

describe("createRestInitApi: workspaces and members", () => {
  it("maps /team to workspaces with string ids", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    expect(await createRestInitApi(TOKEN, fetchFn).getWorkspaces()).toEqual([
      { id: WS, name: "Workspace" },
    ]);
    expect(calls.map((c) => c.url)).toEqual([`${BASE}/team`]);
  });

  it("maps inline members keyed by a string id; a shared email does not merge them", async () => {
    const { fetchFn } = makeFetch(populatedRoutes());
    const members = await createRestInitApi(TOKEN, fetchFn).getMembers(WS);
    expect(members).toEqual([
      { id: "100000001", name: "Person 1", email: "user@example.com" },
      { id: "100000002", name: "Person 2", email: "user@example.com" },
    ]);
  });

  it("a team without members yields an empty members array", async () => {
    const { fetchFn } = makeFetch({ "/team": { teams: [{ id: WS, name: "Workspace" }] } });
    expect(await createRestInitApi(TOKEN, fetchFn).getMembers(WS)).toEqual([]);
  });

  it("a member without a username falls back to the email, then the id; no id is skipped", async () => {
    const { fetchFn } = makeFetch({
      "/team": {
        teams: [
          {
            id: WS,
            name: "Workspace",
            members: [
              { user: { id: 7, username: null, email: "user@example.com" } },
              { user: { id: 8, username: null, email: null } },
              { user: { username: "No Id" } },
              { invited_by: { id: 9 } },
            ],
          },
        ],
      },
    });
    expect(await createRestInitApi(TOKEN, fetchFn).getMembers(WS)).toEqual([
      { id: "7", name: "user@example.com", email: "user@example.com" },
      { id: "8", name: "8" },
    ]);
  });

  it("an unknown workspace id is NOT_FOUND", async () => {
    const { fetchFn } = makeFetch(populatedRoutes());
    const err = await captureError(createRestInitApi(TOKEN, fetchFn).getMembers("123"));
    expect(err.code).toBe("NOT_FOUND");
  });

  it("getWorkspaces and getMembers share one /team call; a failed /team is not cached", async () => {
    let fail = true;
    const { fetchFn, calls } = makeFetch({
      "/team": () => (fail ? json({ err: "boom" }, 500) : json(restFixture("workspaces"))),
    });
    const api = createRestInitApi(TOKEN, fetchFn);
    await expect(api.getWorkspaces()).rejects.toBeInstanceOf(ClickUpInitError);
    fail = false;
    await api.getWorkspaces();
    await api.getMembers(WS);
    expect(calls.map((c) => c.url)).toEqual([`${BASE}/team`, `${BASE}/team`]);
  });
});

describe("createRestInitApi: lists", () => {
  it("flattens spaces, folders and folderless lists", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    expect(await createRestInitApi(TOKEN, fetchFn).getLists(WS)).toEqual(POPULATED_LISTS);
    // One call for the spaces, then one per space for folders and one for folderless lists.
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/team/${WS}/space`,
      `${BASE}/space/${SPACE.id}/folder`,
      `${BASE}/space/${SPACE.id}/list`,
    ]);
  });

  it("never presents ClickUp's hidden container as a folder", async () => {
    const { fetchFn } = makeFetch({
      ...populatedRoutes(),
      [`/space/${SPACE.id}/folder`]: restFixture("folders"),
    });
    const lists = await createRestInitApi(TOKEN, fetchFn).getLists(WS);
    expect(lists).toEqual([{ id: FOLDERLESS, name: "List 1", space: SPACE }]);
    expect(lists[0]).not.toHaveProperty("folder");
  });

  it("a hidden folder's lists carry no folder and appear once", async () => {
    const hiddenFolder = {
      id: "901320000001",
      name: "hidden",
      hidden: true,
      lists: [{ id: FOLDERLESS, name: "List 1" }],
    };
    const { fetchFn } = makeFetch({
      ...populatedRoutes(),
      [`/space/${SPACE.id}/folder`]: { folders: [hiddenFolder] },
    });
    expect(await createRestInitApi(TOKEN, fetchFn).getLists(WS)).toEqual([
      { id: FOLDERLESS, name: "List 1", space: SPACE },
    ]);
  });

  it("a non-hidden folder object on a folderless-list item is kept", async () => {
    const lists = restFixture("folder-lists").lists as Json[];
    const { fetchFn } = makeFetch({
      ...populatedRoutes(),
      [`/space/${SPACE.id}/folder`]: restFixture("folders"),
      [`/space/${SPACE.id}/list`]: { lists },
    });
    expect(await createRestInitApi(TOKEN, fetchFn).getLists(WS)).toEqual([
      { id: LIST_A, name: "sandbox-a", space: SPACE, folder: FOLDER },
      { id: LIST_B, name: "sandbox-b", space: SPACE, folder: FOLDER },
    ]);
  });

  it("skips an archived inline list, an archived folderless list and an archived folder", async () => {
    const populated = restFixture("folders.populated").folders as Json[];
    const folder = populated[0] as Json & { lists: Json[] };
    const archivedFolder = {
      ...folder,
      id: "1000400000000009",
      archived: true,
      lists: [{ ...folder.lists[0], id: "1000400000000010" }],
    };
    const { fetchFn } = makeFetch({
      ...populatedRoutes(),
      [`/space/${SPACE.id}/folder`]: {
        folders: [
          { ...folder, lists: [folder.lists[0], { ...folder.lists[1], archived: true }] },
          archivedFolder,
        ],
      },
      [`/space/${SPACE.id}/list`]: {
        lists: [
          ...(restFixture("folderless-lists").lists as Json[]),
          { id: "901330000009", name: "Old", archived: true },
        ],
      },
    });
    expect(await createRestInitApi(TOKEN, fetchFn).getLists(WS)).toEqual([
      { id: LIST_A, name: "sandbox-a", space: SPACE, folder: FOLDER },
      { id: FOLDERLESS, name: "List 1", space: SPACE },
    ]);
  });

  it("a workspace with zero spaces has no lists and makes one call", async () => {
    const { fetchFn, calls } = makeFetch({ [`/team/${WS}/space`]: { spaces: [] } });
    expect(await createRestInitApi(TOKEN, fetchFn).getLists(WS)).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("each space's lists carry their own space", async () => {
    const SPACE_2 = { id: "901310000002", name: "Space 2" };
    const spaces = restFixture("spaces").spaces as Json[];
    const { fetchFn, calls } = makeFetch({
      ...populatedRoutes(),
      [`/team/${WS}/space`]: { spaces: [...spaces, { ...spaces[0], ...SPACE_2 }] },
      [`/space/${SPACE_2.id}/folder`]: { folders: [] },
      [`/space/${SPACE_2.id}/list`]: { lists: [{ id: "901330000002", name: "Other" }] },
    });
    expect(await createRestInitApi(TOKEN, fetchFn).getLists(WS)).toEqual([
      ...POPULATED_LISTS,
      { id: "901330000002", name: "Other", space: SPACE_2 },
    ]);
    expect(calls).toHaveLength(5);
  });

  it("maps statuses from GET /list/{id}", async () => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    const statuses = await createRestInitApi(TOKEN, fetchFn).getListStatuses(FOLDERLESS);
    expect(calls.map((c) => c.url)).toEqual([`${BASE}/list/${FOLDERLESS}`]);
    expect(statuses).toEqual([
      { status: "to do", type: "open", orderindex: 0 },
      { status: "planning", type: "custom", orderindex: 1 },
      { status: "in progress", type: "custom", orderindex: 2 },
      { status: "at risk", type: "custom", orderindex: 3 },
      { status: "update required", type: "custom", orderindex: 4 },
      { status: "on hold", type: "custom", orderindex: 5 },
      { status: "complete", type: "done", orderindex: 6 },
      { status: "cancelled", type: "closed", orderindex: 7 },
    ]);
    expect(mapStatuses(statuses)).toEqual({
      open: "to do",
      done: "complete",
      closed: "cancelled",
      wipCandidates: ["planning", "in progress", "at risk", "update required", "on hold"],
    });
  });

  it("normalizes a numeric-string orderindex and drops unknown status types", async () => {
    const { fetchFn } = makeFetch({
      [`/list/${FOLDERLESS}`]: {
        statuses: [
          { status: "to do", type: "open", orderindex: "0" },
          { status: "odd", type: "weird", orderindex: 1 },
          { status: "done", type: "done", orderindex: "x" },
        ],
      },
    });
    expect(await createRestInitApi(TOKEN, fetchFn).getListStatuses(FOLDERLESS)).toEqual([
      { status: "to do", type: "open", orderindex: 0 },
      { status: "done", type: "done" },
    ]);
  });
});

describe("createRestInitApi: ids in paths", () => {
  const badIds = ["", "abc", "12/../team", "12?archived=true", "1 2", "١٢٣"];

  it.each(badIds)("rejects the id %j instead of interpolating it", async (id) => {
    const { fetchFn, calls } = makeFetch(populatedRoutes());
    const api = createRestInitApi(TOKEN, fetchFn);
    expect((await captureError(api.getLists(id))).code).toBe("INVALID_ID");
    expect((await captureError(api.getListStatuses(id))).code).toBe("INVALID_ID");
    expect(calls).toHaveLength(0);
  });

  it("rejects a non-digit space id returned by the API", async () => {
    const { fetchFn, calls } = makeFetch({
      [`/team/${WS}/space`]: { spaces: [{ id: "../team", name: "Evil" }] },
    });
    const err = await captureError(createRestInitApi(TOKEN, fetchFn).getLists(WS));
    expect(err.code).toBe("INVALID_ID");
    expect(calls).toHaveLength(1);
  });
});

describe("createRestInitApi: errors", () => {
  const AUTH_BODY = { err: "Oauth token not found", ECODE: "OAUTH_019" };

  it.each([401, 403])(
    "HTTP %i throws a clear error without echoing the token or the body",
    async (status) => {
      const { fetchFn } = makeFetch({ "/team": () => json(AUTH_BODY, status) });
      const err = await captureError(createRestInitApi(TOKEN, fetchFn).getWorkspaces());
      expect(err.code).toBe("AUTH");
      expect(err.status).toBe(status);
      expect(err.message).toMatch(/authentication failed/i);
      expect(err.message).toContain("CLICKUP_API_TOKEN");
      for (const text of renderings(err)) {
        expect(text).not.toContain(TOKEN);
        expect(text).not.toContain("Oauth token not found");
        expect(text).not.toContain("OAUTH_019");
      }
    },
  );

  it("HTTP 429 is a rate-limit error", async () => {
    const { fetchFn } = makeFetch({ "/team": () => json({ err: "Rate limit" }, 429) });
    const err = await captureError(createRestInitApi(TOKEN, fetchFn).getWorkspaces());
    expect(err.code).toBe("RATE_LIMIT");
    expect(err.status).toBe(429);
  });

  it("any other non-2xx carries the status code only", async () => {
    const { fetchFn } = makeFetch({
      [`/list/${FOLDERLESS}`]: () => json({ err: "secret body text" }, 404),
    });
    const err = await captureError(createRestInitApi(TOKEN, fetchFn).getListStatuses(FOLDERLESS));
    expect(err.code).toBe("HTTP");
    expect(err.status).toBe(404);
    expect(err.message).toContain("404");
    for (const text of renderings(err)) expect(text).not.toContain("secret body text");
  });

  it("a network failure is a NETWORK error that echoes neither the token nor the cause", async () => {
    const fetchFn: typeof fetch = async () => {
      throw new TypeError(`fetch failed for ${TOKEN}`);
    };
    const err = await captureError(createRestInitApi(TOKEN, fetchFn).getWorkspaces());
    expect(err.code).toBe("NETWORK");
    for (const text of renderings(err)) expect(text).not.toContain(TOKEN);
  });

  it("an invalid JSON body is a PARSE error", async () => {
    const { fetchFn } = makeFetch({ "/team": () => new Response("<html>oops", { status: 200 }) });
    const err = await captureError(createRestInitApi(TOKEN, fetchFn).getWorkspaces());
    expect(err.code).toBe("PARSE");
    for (const text of renderings(err)) expect(text).not.toContain("oops");
  });

  it.each([
    ["/team", "getWorkspaces"],
    [`/team/${WS}/space`, "getLists"],
    [`/list/${FOLDERLESS}`, "getListStatuses"],
  ] as const)("an unexpected shape on %s is a PARSE error", async (route, method) => {
    const { fetchFn } = makeFetch({ [route]: { unexpected: true } });
    const api = createRestInitApi(TOKEN, fetchFn);
    const call =
      method === "getWorkspaces"
        ? api.getWorkspaces()
        : method === "getLists"
          ? api.getLists(WS)
          : api.getListStatuses(FOLDERLESS);
    expect((await captureError(call)).code).toBe("PARSE");
  });

  it("an unexpected folder or folderless-list shape is a PARSE error", async () => {
    for (const route of [`/space/${SPACE.id}/folder`, `/space/${SPACE.id}/list`]) {
      const { fetchFn } = makeFetch({ ...populatedRoutes(), [route]: { nope: [] } });
      expect((await captureError(createRestInitApi(TOKEN, fetchFn).getLists(WS))).code).toBe(
        "PARSE",
      );
    }
  });

  it("a folder without its inline lists fails closed instead of dropping them", async () => {
    const { fetchFn } = makeFetch({
      ...populatedRoutes(),
      [`/space/${SPACE.id}/folder`]: { folders: [{ ...FOLDER, hidden: false }] },
    });
    expect((await captureError(createRestInitApi(TOKEN, fetchFn).getLists(WS))).code).toBe("PARSE");
  });
});

// ---------------------------------------------------------------------------
// MCP path
// ---------------------------------------------------------------------------

const HIERARCHY = mcpFixture("clickup_get_workspace_hierarchy") as Json;

const MCP_LISTS: ClickUpListSummary[] = [
  { id: LIST_A, name: "sandbox-a", space: SPACE, folder: FOLDER },
  { id: LIST_B, name: "sandbox-b", space: SPACE, folder: FOLDER },
  { id: FOLDERLESS, name: "List", space: SPACE },
];

function page(spaces: Json[], next: string | null, hasMore: boolean): Json {
  return {
    hierarchy: { root: { id: WS, name: "Workspace", children: spaces } },
    next_cursor: next,
    has_more: hasMore,
    total_spaces: 2,
  };
}

describe("createMcpInitApi", () => {
  it("getWorkspaces reads the hierarchy root (the session's workspace)", async () => {
    const { mcp, calls } = makeMcp(new Map([["clickup_get_workspace_hierarchy", HIERARCHY]]));
    expect(await createMcpInitApi(mcp).getWorkspaces()).toEqual([{ id: WS, name: "Workspace" }]);
    expect(calls).toEqual([{ tool: "clickup_get_workspace_hierarchy", args: { max_depth: "2" } }]);
  });

  it("getLists flattens spaces, folders and folderless lists", async () => {
    const { mcp, calls } = makeMcp(new Map([["clickup_get_workspace_hierarchy", HIERARCHY]]));
    expect(await createMcpInitApi(mcp).getLists(WS)).toEqual(MCP_LISTS);
    expect(calls).toEqual([
      {
        tool: "clickup_get_workspace_hierarchy",
        args: { max_depth: "2", workspace_id: WS },
      },
    ]);
  });

  it("a workspace with zero spaces has no lists", async () => {
    const { mcp } = makeMcp(new Map([["clickup_get_workspace_hierarchy", page([], null, false)]]));
    expect(await createMcpInitApi(mcp).getLists(WS)).toEqual([]);
  });

  it("MCP path follows next_cursor and returns every space and list once", async () => {
    const SPACE_2 = { id: "901310000002", name: "Space 2" };
    const space1 = ((HIERARCHY.hierarchy as Json).root as { children: Json[] }).children[0] as Json;
    const space2: Json = {
      ...SPACE_2,
      type: "space",
      children: [{ id: "901330000002", name: "Other", type: "list", children: [] }],
    };
    const pages: Record<string, Json> = {
      first: page([space1], "cursor-2", true),
      "cursor-2": page([space1, space2], null, false),
    };
    const respond: ResponseFn = (args) => pages[(args.cursor as string | undefined) ?? "first"];
    const { mcp, calls } = makeMcp(new Map([["clickup_get_workspace_hierarchy", respond]]));

    expect(await createMcpInitApi(mcp).getLists(WS)).toEqual([
      ...MCP_LISTS,
      { id: "901330000002", name: "Other", space: SPACE_2 },
    ]);
    expect(calls.map((c) => c.args)).toEqual([
      { max_depth: "2", workspace_id: WS },
      { max_depth: "2", workspace_id: WS, cursor: "cursor-2" },
    ]);
  });

  it("has_more without a next_cursor fails closed instead of returning a partial list", async () => {
    const { mcp } = makeMcp(new Map([["clickup_get_workspace_hierarchy", page([], null, true)]]));
    expect((await captureError(createMcpInitApi(mcp).getLists(WS))).code).toBe("PARSE");
  });

  it("a cursor that does not advance fails instead of looping", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["clickup_get_workspace_hierarchy", page([], "same", true)]]),
    );
    expect((await captureError(createMcpInitApi(mcp).getLists(WS))).code).toBe("PARSE");
    expect(calls).toHaveLength(2);
  });

  it("a server that always returns a fresh cursor stops at 50 pages", async () => {
    let n = 0;
    const respond: ResponseFn = () => page([], `cursor-${++n}`, true);
    const { mcp, calls } = makeMcp(new Map([["clickup_get_workspace_hierarchy", respond]]));
    const err = await captureError(createMcpInitApi(mcp).getLists(WS));
    expect(err.code).toBe("PARSE");
    expect(err.message).toContain("50");
    expect(calls).toHaveLength(50);
  });

  it("a resolved {error} is thrown", async () => {
    const { mcp } = makeMcp(
      new Map([["clickup_get_workspace_hierarchy", { error: "Workspace not found" }]]),
    );
    await expect(createMcpInitApi(mcp).getLists(WS)).rejects.toThrow("Workspace not found");
  });

  it("a hierarchy without a root is a PARSE error", async () => {
    const { mcp } = makeMcp(new Map([["clickup_get_workspace_hierarchy", { hierarchy: {} }]]));
    const api = createMcpInitApi(mcp);
    expect((await captureError(api.getWorkspaces())).code).toBe("PARSE");
    expect((await captureError(api.getLists(WS))).code).toBe("PARSE");
  });

  it("maps statuses from clickup_get_list", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["clickup_get_list", mcpFixture("clickup_get_list.a")]]),
    );
    const statuses = await createMcpInitApi(mcp).getListStatuses(LIST_A);
    expect(calls).toEqual([{ tool: "clickup_get_list", args: { list_id: LIST_A } }]);
    expect(statuses).toHaveLength(8);
    expect(mapStatuses(statuses)).toEqual({
      open: "to do",
      done: "complete",
      closed: "cancelled",
      wipCandidates: ["planning", "in progress", "at risk", "update required", "on hold"],
    });
  });

  it("a list without statuses is a PARSE error", async () => {
    const { mcp } = makeMcp(new Map([["clickup_get_list", { id: LIST_A, name: "sandbox-a" }]]));
    expect((await captureError(createMcpInitApi(mcp).getListStatuses(LIST_A))).code).toBe("PARSE");
  });

  it("getMembers maps workspace members keyed by a string id", async () => {
    const { mcp, calls } = makeMcp(
      new Map([["clickup_get_workspace_members", mcpFixture("clickup_get_workspace_members")]]),
    );
    expect(await createMcpInitApi(mcp).getMembers(WS)).toEqual([
      { id: "100000001", name: "Person 1", email: "user@example.com" },
      { id: "100000002", name: "Person 2", email: "user@example.com" },
    ]);
    expect(calls).toEqual([{ tool: "clickup_get_workspace_members", args: { workspace_id: WS } }]);
  });

  it("a members response without a members array is a PARSE error", async () => {
    const { mcp } = makeMcp(new Map([["clickup_get_workspace_members", { users: [] }]]));
    expect((await captureError(createMcpInitApi(mcp).getMembers(WS))).code).toBe("PARSE");
  });
});
