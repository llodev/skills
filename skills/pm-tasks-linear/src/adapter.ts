import { readFile } from "node:fs/promises";
import { createCoreRuntime, type Runtime, type Transport } from "@llodev/pm-tasks-core/runtime";
import { createLinearTransport, type McpCaller } from "./transport-linear.js";

export type { McpCaller };

export interface CreateAdapterOptions {
  /** Absolute or cwd-relative path to .linear.json config file. */
  configPath: string;
  /** Caller-supplied MCP dispatcher (proxies to `mcp__linear__*` tools at runtime). */
  mcp: McpCaller;
  /** Optional session id for audit-log correlation. Defaults to generateSession() when omitted. */
  session?: string;
  /** Optional locale hint (forwarded from .linear.json locale field for narration). */
  language?: string;
}

/**
 * Construct a ready-to-use Linear adapter Runtime. Reads + parses config from
 * configPath, wires the Linear MCP transport from the caller-supplied McpCaller,
 * and returns the same Runtime shape as createCoreRuntime.
 *
 * The double-parse (adapter reads config for transport; createCoreRuntime reads
 * it again for the handler layer) is intentional — extending CreateRuntimeOptions
 * to carry an already-parsed config is deferred (YAGNI). Config validation lives
 * in `init` / `doctor` (Phase 3), not here.
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<Runtime> {
  const raw = await readFile(opts.configPath, "utf-8");
  const config = JSON.parse(raw);
  // Cast to Transport: taskEstimateSet is narrowed to LinearTaskEstimateSetRequest
  // (uses linearTarget instead of jiraTarget); the runtime always calls it via
  // the task-estimate-set handler which passes req.config as-is from the caller.
  const transport = createLinearTransport({ mcp: opts.mcp, config }) as unknown as Transport;
  return createCoreRuntime({
    tool: "linear",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
}
