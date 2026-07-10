import { createCoreRuntime, type Runtime } from "@llodev/pm-tasks-core/runtime";
import { createTrelloTransport, type McpCaller } from "./transport-trello.js";

export interface CreateAdapterOptions {
  /** Absolute or cwd-relative path to .trello.json config file. */
  configPath: string;
  /** Caller-supplied MCP dispatcher (proxies to `mcp__trello__*` tools at runtime). */
  mcp: McpCaller;
  /** Optional session id for audit-log correlation. Defaults to generateSession() when omitted. */
  session?: string;
  /** Optional locale hint (forwarded from .trello.json locale field for narration). */
  language?: string;
}

/**
 * Construct a ready-to-use Trello adapter Runtime. Loads config from configPath,
 * wires the Trello MCP transport from the caller-supplied McpCaller, and returns
 * the same Runtime shape as createCoreRuntime.
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<Runtime> {
  const transport = createTrelloTransport({ mcp: opts.mcp });
  return createCoreRuntime({
    tool: "trello",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
}
