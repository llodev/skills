/**
 * Read-only discovery for `init` and `doctor`: workspaces, lists (with their
 * space and folder), list statuses and members. One interface, two sources:
 * the ClickUp MCP inside an agent session, and the REST API v2 with a personal
 * token in a terminal. Nothing here prompts, writes or logs.
 */

import { callTool, finiteNumber, idString, isObj, nonEmptyString } from "./envelope.js";
import type { ClickUpStatus, ClickUpStatusType } from "./status-map.js";
import type { McpCaller } from "./transport-clickup.js";

export interface ClickUpWorkspace {
  id: string;
  name: string;
}

export interface ClickUpListSummary {
  id: string;
  name: string;
  space: { id: string; name: string };
  /** Absent for a folderless list (ClickUp's hidden container is never a folder). */
  folder?: { id: string; name: string };
}

export interface ClickUpMember {
  id: string;
  name: string;
  email?: string;
}

export interface ClickUpInitApi {
  getWorkspaces(): Promise<ClickUpWorkspace[]>;
  /** Every non-archived list of the workspace: folder lists, then folderless lists, per space. */
  getLists(workspaceId: string): Promise<ClickUpListSummary[]>;
  getListStatuses(listId: string): Promise<ClickUpStatus[]>;
  getMembers(workspaceId: string): Promise<ClickUpMember[]>;
}

/**
 * - `AUTH`: the token is malformed, or the API answered 401/403.
 * - `RATE_LIMIT`: the API answered 429.
 * - `HTTP`: any other non-2xx answer (`status` holds the code).
 * - `NETWORK`: the request failed or timed out.
 * - `PARSE`: the answer is not JSON or lacks the expected shape.
 * - `INVALID_ID`: an id meant for a URL path is not a digit string.
 * - `NOT_FOUND`: the workspace is not among the token's workspaces.
 *
 * Messages never carry the token, a response body, a name or an id.
 */
export type ClickUpInitErrorCode =
  "AUTH" | "RATE_LIMIT" | "HTTP" | "NETWORK" | "PARSE" | "INVALID_ID" | "NOT_FOUND";

export class ClickUpInitError extends Error {
  readonly code: ClickUpInitErrorCode;
  readonly status?: number;

  constructor(code: ClickUpInitErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ClickUpInitError";
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

type Obj = Record<string, unknown>;
type Ref = { id: string; name: string };

const STATUS_TYPES: ReadonlySet<string> = new Set<ClickUpStatusType>([
  "open",
  "custom",
  "done",
  "closed",
]);

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseError(detail: string): ClickUpInitError {
  return new ClickUpInitError("PARSE", `ClickUp init: unexpected ClickUp response (${detail}).`);
}

/** The objects of `body[key]`; a missing array is a shape error (fail closed). */
function arrayOf(body: unknown, key: string): Obj[] {
  const value = isObj(body) ? body[key] : undefined;
  if (!Array.isArray(value)) throw parseError(`no "${key}" array`);
  return value.filter(isObj);
}

function toStatuses(raw: Obj[]): ClickUpStatus[] {
  return raw.flatMap((s) => {
    if (typeof s.type !== "string" || !STATUS_TYPES.has(s.type)) return [];
    const status = nonEmptyString(s.status);
    if (status === undefined) return [];
    const orderindex = finiteNumber(s.orderindex);
    return [
      {
        status,
        type: s.type as ClickUpStatusType,
        ...(orderindex !== null ? { orderindex } : {}),
      },
    ];
  });
}

/** Member ids are numbers in ClickUp: normalized to strings. Never keyed by email. */
function toMember(raw: unknown): ClickUpMember[] {
  if (!isObj(raw)) return [];
  const id = idString(raw.id);
  if (id === undefined) return [];
  const email = nonEmptyString(raw.email);
  const name = nonEmptyString(raw.name) ?? nonEmptyString(raw.username) ?? email ?? id;
  return [{ id, name, ...(email !== undefined ? { email } : {}) }];
}

/** A user folder; undefined for ClickUp's hidden container (`hidden: true`) or no id. */
function userFolder(raw: unknown): Ref | undefined {
  if (!isObj(raw) || raw.hidden === true) return undefined;
  const id = idString(raw.id);
  return id === undefined ? undefined : { id, name: str(raw.name) };
}

/** An archived list is never offered, whatever the response that carries it. */
function listSummary(raw: unknown, space: Ref, folder: Ref | undefined): ClickUpListSummary[] {
  if (!isObj(raw) || raw.archived === true) return [];
  const id = idString(raw.id);
  if (id === undefined) return [];
  return [{ id, name: str(raw.name), space, ...(folder !== undefined ? { folder } : {}) }];
}

/** First occurrence wins: a list seen twice (two pages, two sources) is returned once. */
function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// ---------------------------------------------------------------------------
// REST API v2 (terminal path, personal token)
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.clickup.com/api/v2";
const REQUEST_TIMEOUT_MS = 30_000;
const TOKEN_HINT = "Set CLICKUP_API_TOKEN to a valid ClickUp personal API token.";
/** Visible ASCII only: no whitespace or control character can reach the header. */
const TOKEN_SHAPE = /^[\x21-\x7e]+$/;
const DIGITS = /^[0-9]+$/;

/** ClickUp ids are digit strings; anything else is rejected, never interpolated. */
function pathId(id: unknown, what: string): string {
  if (typeof id !== "string" || !DIGITS.test(id)) {
    throw new ClickUpInitError(
      "INVALID_ID",
      `ClickUp init: invalid ${what} id (expected digits only).`,
    );
  }
  return id;
}

/**
 * REST discovery with a personal token. The token is sent only as the raw
 * `Authorization` header value (no `Bearer`), only on GET requests to the
 * ClickUp API; it is never logged, put in a URL, returned or echoed in an error.
 * Default requests return non-archived items only, which is what `init` offers.
 */
export function createRestInitApi(token: string, fetchFn?: typeof fetch): ClickUpInitApi {
  const auth = typeof token === "string" ? token.trim() : "";
  if (!TOKEN_SHAPE.test(auth)) {
    throw new ClickUpInitError(
      "AUTH",
      `ClickUp init: the API token is empty or malformed (it must not contain spaces, control characters or non-ASCII characters). ${TOKEN_HINT}`,
    );
  }
  const doFetch: typeof fetch = fetchFn ?? ((input, init) => globalThis.fetch(input, init));

  async function get(path: string): Promise<unknown> {
    let res: Response;
    try {
      res = await doFetch(`${BASE_URL}${path}`, {
        method: "GET",
        headers: { Authorization: auth },
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ClickUpInitError(
        "NETWORK",
        "ClickUp init: could not reach the ClickUp API (network error or timeout). Check the connection and try again.",
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new ClickUpInitError(
        "AUTH",
        `ClickUp init: authentication failed (HTTP ${res.status}). ${TOKEN_HINT}`,
        res.status,
      );
    }
    if (res.status === 429) {
      throw new ClickUpInitError(
        "RATE_LIMIT",
        "ClickUp init: the ClickUp API rate limit was reached (HTTP 429). Wait a minute and try again.",
        429,
      );
    }
    if (!res.ok) {
      throw new ClickUpInitError(
        "HTTP",
        `ClickUp init: the ClickUp API returned HTTP ${res.status}.`,
        res.status,
      );
    }
    try {
      return (await res.json()) as unknown;
    } catch {
      throw parseError("the body is not valid JSON");
    }
  }

  // `GET /team` carries the workspaces and their members: fetched once per api.
  let teams: Promise<Obj[]> | undefined;
  function getTeams(): Promise<Obj[]> {
    teams ??= get("/team")
      .then((body) => arrayOf(body, "teams"))
      .catch((e: unknown) => {
        teams = undefined; // a failure is not cached: a retry asks again
        throw e;
      });
    return teams;
  }

  return {
    getWorkspaces: async () =>
      (await getTeams()).flatMap((t) => {
        const id = idString(t.id);
        return id === undefined ? [] : [{ id, name: str(t.name) }];
      }),

    // 1 call for the spaces, then 2 per space (folders with inline lists, folderless lists).
    getLists: async (workspaceId) => {
      const spaces = arrayOf(
        await get(`/team/${pathId(workspaceId, "workspace")}/space`),
        "spaces",
      );
      const lists: ClickUpListSummary[] = [];
      for (const s of spaces) {
        const space = { id: pathId(idString(s.id), "space"), name: str(s.name) };
        for (const f of arrayOf(await get(`/space/${space.id}/folder`), "folders")) {
          if (f.archived === true) continue;
          const folder = userFolder(f);
          for (const l of arrayOf(f, "lists")) lists.push(...listSummary(l, space, folder));
        }
        for (const l of arrayOf(await get(`/space/${space.id}/list`), "lists")) {
          lists.push(...listSummary(l, space, userFolder(l.folder)));
        }
      }
      return uniqueById(lists);
    },

    getListStatuses: async (listId) =>
      toStatuses(arrayOf(await get(`/list/${pathId(listId, "list")}`), "statuses")),

    getMembers: async (workspaceId) => {
      const team = (await getTeams()).find((t) => idString(t.id) === workspaceId);
      if (team === undefined) {
        throw new ClickUpInitError(
          "NOT_FOUND",
          "ClickUp init: the workspace is not among the token's workspaces.",
        );
      }
      const members = Array.isArray(team.members) ? team.members : [];
      return members.flatMap((m) => (isObj(m) ? toMember(m.user) : []));
    },
  };
}

// ---------------------------------------------------------------------------
// ClickUp MCP (agent-session path)
// ---------------------------------------------------------------------------

const HIERARCHY_TOOL = "clickup_get_workspace_hierarchy";
/** A bound on the cursor loop: a server that never stops paging fails instead of hanging. */
const MAX_HIERARCHY_PAGES = 50;

function hierarchyRoot(resp: unknown): Obj {
  const root = isObj(resp) && isObj(resp.hierarchy) ? resp.hierarchy.root : undefined;
  if (!isObj(root)) throw parseError("no hierarchy root");
  return root;
}

function childNodes(node: Obj, type: string): Obj[] {
  return Array.isArray(node.children)
    ? node.children.filter((c): c is Obj => isObj(c) && c.type === type)
    : [];
}

/**
 * MCP discovery. The session is bound to one workspace: the hierarchy root.
 * `workspace_id` is passed where the call is workspace-scoped (lists, members).
 */
export function createMcpInitApi(mcp: McpCaller): ClickUpInitApi {
  return {
    getWorkspaces: async () => {
      const root = hierarchyRoot(await callTool(mcp, HIERARCHY_TOOL, { max_depth: "2" }));
      const id = idString(root.id);
      if (id === undefined) throw parseError("no workspace id");
      return [{ id, name: str(root.name) }];
    },

    getLists: async (workspaceId) => {
      const lists: ClickUpListSummary[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;
      for (let pages = 1; ; pages++) {
        const resp = await callTool(mcp, HIERARCHY_TOOL, {
          max_depth: "2",
          workspace_id: workspaceId,
          ...(cursor !== undefined ? { cursor } : {}),
        });
        for (const spaceNode of childNodes(hierarchyRoot(resp), "space")) {
          const spaceId = idString(spaceNode.id);
          if (spaceId === undefined) continue;
          const space = { id: spaceId, name: str(spaceNode.name) };
          for (const folderNode of childNodes(spaceNode, "folder")) {
            const folder = userFolder(folderNode);
            for (const l of childNodes(folderNode, "list")) {
              lists.push(...listSummary(l, space, folder));
            }
          }
          for (const l of childNodes(spaceNode, "list")) {
            lists.push(...listSummary(l, space, undefined));
          }
        }
        const next = isObj(resp) ? nonEmptyString(resp.next_cursor) : undefined;
        if (next === undefined) {
          // More pages but no cursor: fail closed rather than return a partial list.
          if (isObj(resp) && resp.has_more === true) throw parseError("has_more without a cursor");
          break;
        }
        if (seenCursors.has(next)) throw parseError("the pagination cursor did not advance");
        if (pages >= MAX_HIERARCHY_PAGES) {
          throw parseError(`more than ${MAX_HIERARCHY_PAGES} hierarchy pages`);
        }
        seenCursors.add(next);
        cursor = next;
      }
      return uniqueById(lists);
    },

    getListStatuses: async (listId) =>
      toStatuses(arrayOf(await callTool(mcp, "clickup_get_list", { list_id: listId }), "statuses")),

    getMembers: async (workspaceId) =>
      arrayOf(
        await callTool(mcp, "clickup_get_workspace_members", { workspace_id: workspaceId }),
        "members",
      ).flatMap(toMember),
  };
}
