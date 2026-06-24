import { createCoreRuntime, type Runtime } from "@llodev/pm-tasks-core/runtime";
import { createAsanaTransport, type McpCaller } from "./transport-asana.js";

export interface CreateAdapterOptions {
  /** Absolute or cwd-relative path to .asana.json config file. */
  configPath: string;
  /** Caller-supplied MCP dispatcher (proxies to `mcp__claude_ai_Asana__*` tools at runtime). */
  mcp: McpCaller;
  /** Optional session id for audit-log correlation. Defaults to generateSession() when omitted. */
  session?: string;
  /** Optional locale hint (forwarded from .asana.json locale field for narration). */
  language?: string;
}

/**
 * Construct a ready-to-use Asana adapter Runtime. Loads config from configPath,
 * wires the Asana MCP transport from the caller-supplied McpCaller, and returns
 * the same Runtime shape as createCoreRuntime.
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<Runtime> {
  const transport = createAsanaTransport({ mcp: opts.mcp });
  return createCoreRuntime({
    tool: "asana",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
}
