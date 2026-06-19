// @llodev/pm-tasks-core/doctor
// Health-check engine: check catalog + orchestrator.
// All I/O uses Node 20+ built-ins only — no new runtime deps.
import { access, mkdir, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { validateConfig } from "./init-lib.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = "error" | "warn" | "info";

export interface DoctorContext {
  tool: string;
  configPath: string;
  config: unknown; // parsed .<tool>.json
  manifest: { tool: string; verbs: string[] }; // loaded from package's manifest.json
  schema: unknown; // loaded from package's schemas/config.json
  auditLogPath: string; // resolved via audit.ts resolveDataDir
  auditRotationMaxBytes: number; // default 10 * 1024 * 1024
}

export interface DoctorResult {
  ok: boolean;
  message: string;
  fixHint?: string;
}

export interface DoctorCheck {
  id: string;
  label: string;
  severity: Severity;
  run(ctx: DoctorContext): Promise<DoctorResult>;
}

export interface RunReport {
  tool: string;
  configPath: string;
  results: Array<{ check: DoctorCheck; result: DoctorResult }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ---------------------------------------------------------------------------
// Core check catalog
// ---------------------------------------------------------------------------

const C_FS_1: DoctorCheck = {
  id: "C-FS-1",
  label: "Config file exists",
  severity: "error",
  async run(ctx) {
    try {
      await access(ctx.configPath, fsConstants.R_OK);
      return { ok: true, message: `${ctx.configPath} found` };
    } catch {
      return {
        ok: false,
        message: `${ctx.configPath} not found or not readable`,
        fixHint: `Run \`pnpm --filter @llodev/pm-tasks-${ctx.tool} init\` to bootstrap.`,
      };
    }
  },
};

const C_FS_2: DoctorCheck = {
  id: "C-FS-2",
  label: "Audit log directory writable",
  severity: "error",
  async run(ctx) {
    const { dirname } = await import("node:path");
    const dir = dirname(ctx.auditLogPath);
    try {
      await mkdir(dir, { recursive: true });
      await access(dir, fsConstants.W_OK);
      return { ok: true, message: `${dir} is writable` };
    } catch {
      return {
        ok: false,
        message: `${dir} is not writable`,
        fixHint: `Check LLODEV_PM_TASKS_LOG_DIR; default is ~/.local/share/llodev/pm-tasks/${ctx.tool}/audit.log.`,
      };
    }
  },
};

const C_FS_3: DoctorCheck = {
  id: "C-FS-3",
  label: "Audit log size under rotation threshold",
  severity: "warn",
  async run(ctx) {
    try {
      const s = await stat(ctx.auditLogPath);
      const threshold = 0.8 * ctx.auditRotationMaxBytes;
      const mb = (s.size / (1024 * 1024)).toFixed(1);
      const maxMb = (ctx.auditRotationMaxBytes / (1024 * 1024)).toFixed(0);
      if (s.size < threshold) {
        return { ok: true, message: `${mb}MB / ${maxMb}MB` };
      }
      return {
        ok: false,
        message: `${mb}MB / ${maxMb}MB — approaching rotation threshold`,
        fixHint: `Run \`node scripts/rotate-audit.mjs --tool ${ctx.tool}\` to rotate.`,
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { ok: true, message: "no audit log yet" };
      }
      throw e;
    }
  },
};

const C_CFG_1: DoctorCheck = {
  id: "C-CFG-1",
  label: "Config validates against schema",
  severity: "error",
  async run(ctx) {
    const result = await validateConfig(ctx.config, ctx.schema);
    if (result.ok) {
      return { ok: true, message: "schema valid" };
    }
    const errors = asArray(result.errors);
    const first = errors[0] as Record<string, unknown> | undefined;
    const instancePath = first ? asString(first["instancePath"]) || "(root)" : "(unknown)";
    const keyword = first ? asString(first["keyword"]) : "";
    const msg = keyword ? `${instancePath} failed '${keyword}'` : `${instancePath} invalid`;
    return {
      ok: false,
      message: msg,
      fixHint: `See pm-tasks-${ctx.tool}/schemas/config.json for the schema.`,
    };
  },
};

const C_CFG_2: DoctorCheck = {
  id: "C-CFG-2",
  label: "autonomous.allow ⊆ manifest.verbs",
  severity: "error",
  async run(ctx) {
    const cfg = asRecord(ctx.config);
    const autonomous = asRecord(cfg["autonomous"]);
    const allow = asArray(autonomous["allow"]).map(asString);
    if (allow.length === 0) {
      return { ok: true, message: "autonomous.allow not set — skipped" };
    }
    const manifestVerbs = new Set(ctx.manifest.verbs);
    const unknown = allow.filter((v) => !manifestVerbs.has(v));
    if (unknown.length === 0) {
      return { ok: true, message: "all verbs in manifest" };
    }
    return {
      ok: false,
      message: `unknown verbs: ${unknown.join(", ")}`,
      fixHint:
        "Remove unknown verbs from autonomous.allow or extend manifest.json if a new verb landed.",
    };
  },
};

const C_CFG_3: DoctorCheck = {
  id: "C-CFG-3",
  label: "autonomous.scope IDs declared in boards/lists/sections",
  severity: "error",
  async run(ctx) {
    const cfg = asRecord(ctx.config);
    const autonomous = asRecord(cfg["autonomous"]);
    const scope = asRecord(autonomous["scope"]);

    const failures: string[] = [];

    // boards
    const boardIds = new Set(
      asArray(cfg["boards"])
        .map(asRecord)
        .map((b) => asString(b["id"])),
    );
    for (const id of asArray(scope["boards"]).map(asString)) {
      if (!boardIds.has(id)) failures.push(`boards[${id}]`);
    }

    // lists
    const listIds = new Set(
      asArray(cfg["lists"])
        .map(asRecord)
        .map((l) => asString(l["id"])),
    );
    for (const id of asArray(scope["lists"]).map(asString)) {
      if (!listIds.has(id)) failures.push(`lists[${id}]`);
    }

    // sections (asana only — skip if config.sections absent)
    if (cfg["sections"] !== undefined) {
      const sectionIds = new Set(
        asArray(cfg["sections"])
          .map(asRecord)
          .map((s) => asString(s["id"])),
      );
      for (const id of asArray(scope["sections"]).map(asString)) {
        if (!sectionIds.has(id)) failures.push(`sections[${id}]`);
      }
    }

    if (failures.length === 0) {
      return { ok: true, message: "all scope IDs declared" };
    }
    return {
      ok: false,
      message: `unknown scope IDs: ${failures.join(", ")}`,
      fixHint:
        "Ensure autonomous.scope IDs match the IDs in boards/lists/sections arrays in the config.",
    };
  },
};

const C_CFG_4: DoctorCheck = {
  id: "C-CFG-4",
  label: "Default aliases resolve",
  severity: "error",
  async run(ctx) {
    const cfg = asRecord(ctx.config);
    const defaults = asRecord(cfg["defaults"]);
    if (Object.keys(defaults).length === 0) {
      return { ok: true, message: "no defaults set — skipped" };
    }

    const failures: string[] = [];

    const boardAliases = new Set(
      asArray(cfg["boards"])
        .map(asRecord)
        .map((b) => asString(b["alias"])),
    );
    const listAliases = new Set(
      asArray(cfg["lists"])
        .map(asRecord)
        .map((l) => asString(l["alias"])),
    );
    const sectionAliases = new Set(
      asArray(cfg["sections"])
        .map(asRecord)
        .map((s) => asString(s["alias"])),
    );
    const memberAliases = new Set(
      asArray(cfg["members"])
        .map(asRecord)
        .map((m) => asString(m["alias"])),
    );

    if (defaults["boardAlias"] !== undefined) {
      const v = asString(defaults["boardAlias"]);
      if (v && !boardAliases.has(v)) failures.push(`defaults.boardAlias="${v}"`);
    }
    if (defaults["listAlias"] !== undefined) {
      const v = asString(defaults["listAlias"]);
      if (v && !listAliases.has(v)) failures.push(`defaults.listAlias="${v}"`);
    }
    if (defaults["sectionAlias"] !== undefined) {
      const v = asString(defaults["sectionAlias"]);
      if (v && !sectionAliases.has(v)) failures.push(`defaults.sectionAlias="${v}"`);
    }
    if (defaults["assigneeAlias"] !== undefined) {
      const v = asString(defaults["assigneeAlias"]);
      // "me" is a special built-in alias — always valid
      if (v && v !== "me" && !memberAliases.has(v)) failures.push(`defaults.assigneeAlias="${v}"`);
    }

    if (failures.length === 0) {
      return { ok: true, message: "all default aliases resolve" };
    }
    return {
      ok: false,
      message: `unresolved aliases: ${failures.join(", ")}`,
      fixHint: "Ensure the alias exists in the corresponding boards/lists/sections/members array.",
    };
  },
};

export const CORE_CHECKS: DoctorCheck[] = [
  C_FS_1,
  C_FS_2,
  C_FS_3,
  C_CFG_1,
  C_CFG_2,
  C_CFG_3,
  C_CFG_4,
];

// ---------------------------------------------------------------------------
// runChecks orchestrator
// ---------------------------------------------------------------------------

export async function runChecks(ctx: DoctorContext, extra?: DoctorCheck[]): Promise<RunReport> {
  const checks = [...CORE_CHECKS, ...(extra ?? [])];
  const results: RunReport["results"] = [];

  for (const check of checks) {
    let result: DoctorResult;
    try {
      result = await check.run(ctx);
    } catch (e) {
      result = {
        ok: false,
        message: `${check.id} threw: ${(e as Error).message}`,
      };
    }
    results.push({ check, result });
  }

  return { tool: ctx.tool, configPath: ctx.configPath, results };
}
