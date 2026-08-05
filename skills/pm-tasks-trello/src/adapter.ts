import { createCoreRuntime, type Runtime } from "@llodev/pm-tasks-core/runtime";
import { createTrelloTransport, type McpCaller } from "./transport-trello.js";
import { batchCreateWithChecklists } from "./batch-create.js";
import type { BatchCreateRequest, BatchCreateResult } from "./batch.js";

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

/** Trello Runtime plus the F13 batch extension. */
export type TrelloAdapter = Runtime & {
  trelloBatchCreateWithChecklists(req: BatchCreateRequest): Promise<BatchCreateResult>;
};

/**
 * Construct a ready-to-use Trello adapter Runtime. Loads config from configPath,
 * wires the Trello MCP transport from the caller-supplied McpCaller, and returns
 * the same Runtime shape as createCoreRuntime plus the F13 batch extension.
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<TrelloAdapter> {
  const transport = createTrelloTransport({ mcp: opts.mcp });
  const runtime = await createCoreRuntime({
    tool: "trello",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
  return {
    ...runtime,
    trelloBatchCreateWithChecklists: (req) =>
      batchCreateWithChecklists(req, { runtime, transport }),
  };
}
