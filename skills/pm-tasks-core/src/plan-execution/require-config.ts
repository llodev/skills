import { readFile } from "node:fs/promises";
import { validateConfig } from "../init-lib.js";

/**
 * Reason a ConfigRequiredError was thrown. Surfaced as `error.code`
 * so callers can branch on the failure mode without parsing the message.
 */
export type ConfigRequiredCode = "MISSING" | "INVALID_JSON" | "SCHEMA_VIOLATION";

export interface ConfigRequiredErrorInit {
  code: ConfigRequiredCode;
  toolPath: string;
  tool: string;
  /** Underlying ajv errors when code === SCHEMA_VIOLATION; otherwise omitted. */
  errors?: unknown[] | null;
}

/**
 * Structured error indicating the caller must surface a "run init" prompt.
 * Plain Error subclass — the `code`, `toolPath`, `tool`, `hint`, and
 * optional `errors` fields are accessed directly by F15 callers.
 */
export class ConfigRequiredError extends Error {
  readonly code: ConfigRequiredCode;
  readonly toolPath: string;
  readonly tool: string;
  readonly hint: string;
  readonly errors: unknown[] | null | undefined;

  constructor(init: ConfigRequiredErrorInit) {
    const hint = `run 'npx @llodev/pm-tasks-${init.tool} init' to create or fix the config`;
    const reason =
      init.code === "MISSING"
        ? "not found"
        : init.code === "INVALID_JSON"
          ? "is not valid JSON"
          : "fails schema validation";
    super(`pm-tasks-core: config ${reason} at ${init.toolPath} — ${hint}`);
    this.name = "ConfigRequiredError";
    this.code = init.code;
    this.toolPath = init.toolPath;
    this.tool = init.tool;
    this.hint = hint;
    this.errors = init.errors;
  }
}

export interface RequireConfigOptions {
  /** Absolute or cwd-relative path to .<tool>.json. */
  configPath: string;
  /** Tool name (e.g. "trello", "asana") — used in error messages + the init hint. */
  tool: string;
  /** Optional JSON schema. When omitted, only existence + JSON-parse are checked. */
  schema?: unknown;
}

/**
 * Load and (optionally) validate the .<tool>.json config file. Returns the
 * parsed object on success; throws ConfigRequiredError on missing file,
 * malformed JSON, or schema violation.
 *
 * The caller is responsible for loading the adapter's schema (e.g. via
 * fs.readFile of pm-tasks-<tool>/schemas/config.json) and passing it as
 * opts.schema — this helper does NOT auto-load schemas (keeps pm-tasks-core
 * adapter-agnostic).
 */
export async function requireConfig(opts: RequireConfigOptions): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(opts.configPath, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ConfigRequiredError({
        code: "MISSING",
        toolPath: opts.configPath,
        tool: opts.tool,
      });
    }
    throw e; // unexpected I/O error — bubble up
  }

  let config: unknown;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new ConfigRequiredError({
      code: "INVALID_JSON",
      toolPath: opts.configPath,
      tool: opts.tool,
    });
  }

  if (opts.schema !== undefined) {
    const result = await validateConfig(config, opts.schema);
    if (!result.ok) {
      throw new ConfigRequiredError({
        code: "SCHEMA_VIOLATION",
        toolPath: opts.configPath,
        tool: opts.tool,
        errors: result.errors,
      });
    }
  }

  return config;
}
