import { readFile } from "node:fs/promises";
import { createCoreRuntime, type Runtime } from "@llodev/pm-tasks-core/runtime";
import { createJiraTransport, type McpCaller } from "./transport-jira.js";

export type { McpCaller };

export interface CreateAdapterOptions {
  /** Absolute or cwd-relative path to .jira.json config file. */
  configPath: string;
  /** Caller-supplied MCP dispatcher (proxies to `mcp__atlassian__*` tools at runtime). */
  mcp: McpCaller;
  /** Optional session id for audit-log correlation. Defaults to generateSession() when omitted. */
  session?: string;
  /** Optional locale hint (forwarded from .jira.json locale field for narration). */
  language?: string;
}

/**
 * Construct a ready-to-use Jira adapter Runtime. Reads + parses config from
 * configPath, wires the Jira MCP transport from the caller-supplied McpCaller,
 * and returns the same Runtime shape as createCoreRuntime.
 *
 * The double-parse (adapter reads config for transport; createCoreRuntime reads
 * it again for the handler layer) is intentional — extending CreateRuntimeOptions
 * to carry an already-parsed config is deferred (YAGNI). Config validation lives
 * in `init` / `doctor` (Phase 2), not here.
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<Runtime> {
  const raw = await readFile(opts.configPath, "utf-8");
  const config = JSON.parse(raw);
  const transport = createJiraTransport({ mcp: opts.mcp, config });
  return createCoreRuntime({
    tool: "jira",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
}
