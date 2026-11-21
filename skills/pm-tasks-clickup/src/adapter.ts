import { readFile } from "node:fs/promises";
import { createCoreRuntime, type Runtime, type Transport } from "@llodev/pm-tasks-core/runtime";
import { isObj } from "./envelope.js";
import { createClickUpTransport, type ClickUpConfig, type McpCaller } from "./transport-clickup.js";

export type { McpCaller };

export interface CreateAdapterOptions {
  /** Absolute or cwd-relative path to the .clickup.json config file. */
  configPath: string;
  /** Caller-supplied MCP dispatcher (proxies to the `clickup_*` tools, no server prefix). */
  mcp: McpCaller;
  /** Optional session id for audit-log correlation. Defaults to generateSession() when omitted. */
  session?: string;
  /** Optional locale hint (forwarded from the .clickup.json locale field for narration). */
  language?: string;
}

/**
 * The shape every verb relies on: an object, `workspace.id` a non-empty string,
 * `lists` an array, and `estimation` absent or an object.
 */
function hasRequiredShape(value: unknown): value is ClickUpConfig {
  if (!isObj(value) || !isObj(value.workspace)) return false;
  const id = value.workspace.id;
  return (
    typeof id === "string" &&
    id !== "" &&
    Array.isArray(value.lists) &&
    (value.estimation === undefined || isObj(value.estimation))
  );
}

/**
 * Reads and parses .clickup.json; a missing, malformed or misshapen file names
 * the path, never the content.
 */
async function readConfig(configPath: string): Promise<ClickUpConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (e) {
    const missing = (e as { code?: unknown }).code === "ENOENT";
    throw new Error(
      missing
        ? `pm-tasks-clickup: config not found at ${configPath} — run 'npx @llodev/pm-tasks-clickup init' to create one`
        : `pm-tasks-clickup: cannot read config at ${configPath}`,
      { cause: e },
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    throw new Error(`pm-tasks-clickup: invalid JSON in config at ${configPath}`, { cause: e });
  }
  if (!hasRequiredShape(parsed)) {
    throw new Error(
      `pm-tasks-clickup: invalid config at ${configPath} (workspace.id and lists[] are required) — run 'npx @llodev/pm-tasks-clickup init --doctor'`,
    );
  }
  return parsed;
}

/**
 * Construct a ready-to-use ClickUp adapter Runtime. Reads and parses the config
 * from configPath, wires the ClickUp MCP transport to the caller-supplied
 * McpCaller, and returns the same Runtime shape as createCoreRuntime. No MCP
 * call is made here.
 *
 * The config is read twice (here for the transport, again by createCoreRuntime
 * for the handler layer). Construction rejects only a config that is not an
 * object, has no non-empty string `workspace.id`, has a `lists` that is not an
 * array, or has an `estimation` that is not an object. Everything else is left
 * to `init` and `doctor`, and each verb fails closed on what it needs (a list
 * without pinned statuses makes the status verbs INVALID_REQUEST).
 *
 * task.estimate.set: the runtime passes the request through unchanged and does
 * not read the config's `estimation` block, so the caller passes that block as
 * `req.config` (cast to core's `EstimationConfig`: ClickUp's block carries
 * `clickupTarget` instead of `jiraTarget`). The request config drives strategy,
 * target, scale, sizeMap and hoursPerDay. The block in .clickup.json is the on/off
 * switch: when it is absent or says `enabled: false` (or the request config does),
 * the verb is NOT_APPLICABLE; a request without `config` is INVALID_REQUEST.
 *
 * task.sprint.set is not in the manifest: the transport has no taskSprintSet, so
 * the runtime answers UNSUPPORTED_VERB without an MCP call.
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<Runtime> {
  const config = await readConfig(opts.configPath);
  // Cast to Transport: taskEstimateSet is narrowed to ClickUpTaskEstimateSetRequest
  // (clickupTarget instead of jiraTarget); the runtime's task-estimate-set handler
  // passes the caller's request, req.config included, through as is.
  const transport = createClickUpTransport({ mcp: opts.mcp, config }) as unknown as Transport;
  return createCoreRuntime({
    tool: "clickup",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
}
