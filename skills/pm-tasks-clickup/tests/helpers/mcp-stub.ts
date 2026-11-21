import { readFileSync } from "node:fs";
import { expect } from "vitest";
import type { McpCaller } from "../../src/transport-clickup.js";

export interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

/** A per-call response: evaluated with the call's args on every call to that tool. */
export type ResponseFn = (args: Record<string, unknown>) => unknown;

/** Read a sanitized MCP capture from `tests/fixtures/mcp/<name>.json`. */
export function mcpFixture(name: string): unknown {
  const url = new URL(`../fixtures/mcp/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as unknown;
}

/**
 * Allowed parameter keys per tool, copied from the live tool schemas
 * (`additionalProperties: false`), keyed by tool name without the server prefix.
 */
export const TOOL_KEYS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(mcpFixture("_tool-keys") as Record<string, string[]>).map(([tool, keys]) => [
    tool,
    new Set(keys),
  ]),
);

/**
 * Build a recording McpCaller.
 *
 * - A tool missing from `allowedKeys` or from `responses` throws (unexpected call).
 * - An argument key outside the tool's allow-list throws, like the real schema.
 * - A function response is called with the args on every call (successive calls can differ).
 * - An `Error` response (or one returned by a function) is thrown.
 * - Any other value, including a plain `{error: "..."}` object, is returned as is.
 */
export function makeMcp(
  responses: Map<string, unknown>,
  allowedKeys: Record<string, Set<string>> = TOOL_KEYS,
): { mcp: McpCaller; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const mcp: McpCaller = async (tool, args) => {
    calls.push({ tool, args });
    const allowed = allowedKeys[tool];
    if (!allowed) throw new Error(`Unknown MCP tool: ${tool}`);
    const unknownKeys = Object.keys(args).filter((k) => !allowed.has(k));
    if (unknownKeys.length > 0) {
      throw new Error(`${tool} received unknown keys: ${unknownKeys.join(", ")}`);
    }
    if (!responses.has(tool)) throw new Error(`Unexpected MCP call: ${tool}`);
    const entry = responses.get(tool);
    const resp = typeof entry === "function" ? (entry as ResponseFn)(args) : entry;
    if (resp instanceof Error) throw resp;
    return resp;
  };
  return { mcp, calls };
}

/** Every recorded call carries the configured workspace id (the transport's `call` helper). */
export function expectWorkspaceOnEveryCall(calls: CallRecord[], workspaceId: string): void {
  for (const c of calls) expect(c.args.workspace_id, c.tool).toBe(workspaceId);
}
