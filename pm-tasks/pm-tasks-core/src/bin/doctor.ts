#!/usr/bin/env node
// pm-tasks-core-doctor — workspace health-check CLI
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDataDir } from "../audit.js";
import { type DoctorCheck, type RunReport, runChecks } from "../doctor.js";

// ---------------------------------------------------------------------------
// Path anchoring — bin lives at dist/bin/doctor.js after build
// ---------------------------------------------------------------------------

const BIN_DIR = path.dirname(fileURLToPath(import.meta.url));
// dist/bin/ → ../../../pm-tasks-<tool>/ (sibling package in monorepo)
const PACKAGES_ROOT = path.resolve(BIN_DIR, "../../../");

// ---------------------------------------------------------------------------
// Renderer — exported so adapter doctor-cli.ts files can reuse it
// ---------------------------------------------------------------------------

export interface RenderOpts {
  format: "md" | "json";
  fixHintsOnly: boolean;
}

function statusIcon(check: DoctorCheck, ok: boolean): string {
  if (ok) return "✅";
  if (check.severity === "warn") return "⚠️";
  return "❌";
}

export function renderReport(report: RunReport, opts: RenderOpts): string {
  if (opts.format === "json") {
    const pass = report.results.filter((r) => r.result.ok).length;
    const fail = report.results.filter((r) => !r.result.ok && r.check.severity === "error").length;
    const warn = report.results.filter((r) => !r.result.ok && r.check.severity === "warn").length;
    const exitCode = fail > 0 ? 1 : 0;
    const out = {
      tool: report.tool,
      configPath: report.configPath,
      results: report.results.map(({ check, result }) => ({
        id: check.id,
        severity: check.severity,
        label: check.label,
        ok: result.ok,
        message: result.message,
        fixHint: result.fixHint ?? null,
      })),
      summary: { pass, warn, fail, exitCode },
    };
    return JSON.stringify(out, null, 2);
  }

  // Markdown table
  const rows = opts.fixHintsOnly ? report.results.filter((r) => !r.result.ok) : report.results;

  const lines: string[] = [
    `## pm-tasks-core-doctor — ${report.tool}`,
    `| ID | Status | Check | Message | Fix hint |`,
    `| --- | --- | --- | --- | --- |`,
  ];

  for (const { check, result } of rows) {
    const icon = statusIcon(check, result.ok);
    const hint = result.fixHint ?? "—";
    lines.push(`| ${check.id} | ${icon} | ${check.label} | ${result.message} | ${hint} |`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Config discovery
// ---------------------------------------------------------------------------

const KNOWN_TOOLS = ["trello", "asana"] as const;

interface DiscoveredConfig {
  tool: string;
  configPath: string;
}

async function discoverConfigs(
  toolFlag?: string,
  configOverride?: string,
): Promise<DiscoveredConfig[]> {
  if (toolFlag && configOverride) {
    // --config supplied explicitly: trust the caller, skip file-existence check here.
    // (The file-not-found error surfaces naturally when we try to readFile it later.)
    return [{ tool: toolFlag, configPath: path.resolve(configOverride) }];
  }

  if (toolFlag) {
    // Try cwd first, then global config dir
    const cwd = path.resolve(process.cwd(), `.${toolFlag}.json`);
    try {
      await readFile(cwd, "utf8");
      return [{ tool: toolFlag, configPath: cwd }];
    } catch {
      // fall through to global
    }
    const global = path.join(
      process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config"),
      "llodev",
      "pm-tasks",
      `${toolFlag}.json`,
    );
    try {
      await readFile(global, "utf8");
      return [{ tool: toolFlag, configPath: global }];
    } catch {
      return []; // caller handles empty
    }
  }

  // Scan cwd for known tool configs
  const found: DiscoveredConfig[] = [];
  for (const tool of KNOWN_TOOLS) {
    const p = path.resolve(process.cwd(), `.${tool}.json`);
    try {
      await readFile(p, "utf8");
      found.push({ tool, configPath: p });
    } catch {
      // not present
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Adapter schema + manifest loading
// ---------------------------------------------------------------------------

interface AdapterAssets {
  schema: unknown;
  manifest: { tool: string; verbs: string[] };
}

async function loadAdapterAssets(tool: string): Promise<AdapterAssets | null> {
  const pkgDir = path.join(PACKAGES_ROOT, `pm-tasks-${tool}`);
  try {
    const schemaRaw = await readFile(path.join(pkgDir, "schemas", "config.json"), "utf8");
    const manifestRaw = await readFile(path.join(pkgDir, "manifest.json"), "utf8");
    return {
      schema: JSON.parse(schemaRaw) as unknown,
      manifest: JSON.parse(manifestRaw) as { tool: string; verbs: string[] },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse flags
// ---------------------------------------------------------------------------

interface Flags {
  tool?: string;
  json: boolean;
  fixHintsOnly: boolean;
  configOverride?: string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { json: false, fixHintsOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tool" && argv[i + 1]) {
      flags.tool = argv[++i];
    } else if (a === "--json") {
      flags.json = true;
    } else if (a === "--fix-hints-only") {
      flags.fixHintsOnly = true;
    } else if (a === "--config" && argv[i + 1]) {
      flags.configOverride = argv[++i];
    }
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Skip-schema check — injected when adapter assets not available
// ---------------------------------------------------------------------------

function makeDegradedChecks(): DoctorCheck[] {
  return [
    {
      id: "C-CFG-0",
      label: "Adapter package on disk",
      severity: "warn" as const,
      async run() {
        return {
          ok: false,
          message: "adapter package not on disk; skipping C-CFG-1..4",
          fixHint: "Install the adapter package alongside core.",
        };
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const flags = parseFlags(argv);

  // Read running core package version (bin is at dist/bin/doctor.js → ../../package.json)
  let coreVersion: string | undefined;
  try {
    const pkgRaw = await readFile(new URL("../../package.json", import.meta.url), "utf8");
    coreVersion = (JSON.parse(pkgRaw) as { version?: string }).version;
  } catch {
    // never crash the doctor over a missing version
  }

  const discovered = await discoverConfigs(flags.tool, flags.configOverride);

  if (flags.tool && discovered.length === 0) {
    console.error(
      `pm-tasks-core-doctor: no config found for tool "${flags.tool}".\n` +
        `  Tried: .${flags.tool}.json in cwd and ~/.config/llodev/pm-tasks/${flags.tool}.json\n` +
        `  Run \`pnpm --filter @llodev/pm-tasks-${flags.tool} init\` to bootstrap.`,
    );
    process.exit(2);
  }

  if (!flags.tool && discovered.length === 0) {
    console.error(
      "pm-tasks-core-doctor: no .tool.json config found in current directory.\n" +
        "  Looked for: .trello.json, .asana.json\n" +
        "  Pass --tool <name> to specify a tool explicitly.",
    );
    process.exit(2);
  }

  let overallExitCode = 0;
  const outputs: string[] = [];

  for (const { tool, configPath } of discovered) {
    const effectiveConfigPath = flags.configOverride ?? configPath;

    // Load config
    let config: unknown;
    try {
      const raw = await readFile(effectiveConfigPath, "utf8");
      config = JSON.parse(raw) as unknown;
    } catch {
      config = {};
    }

    // Load adapter assets (degrade gracefully if missing)
    const assets = await loadAdapterAssets(tool);
    const extraChecks: DoctorCheck[] = assets ? [] : makeDegradedChecks();

    const ctx = {
      tool,
      configPath: effectiveConfigPath,
      config,
      manifest: assets?.manifest ?? { tool, verbs: [] },
      schema: assets?.schema ?? {},
      auditLogPath: path.join(resolveDataDir(tool), "audit.log"),
      auditRotationMaxBytes: 10 * 1024 * 1024,
      coreVersion,
    };

    // If no adapter assets, skip C-CFG-* checks by passing degraded extras
    // and using an empty schema (C-CFG-1 would pass vacuously — we suppress it
    // by injecting the C-CFG-0 warn instead via extraChecks when assets missing)
    const report = await runChecks(
      assets ? ctx : { ...ctx, schema: { type: "object" } },
      extraChecks,
    );

    const rendered = renderReport(report, {
      format: flags.json ? "json" : "md",
      fixHintsOnly: flags.fixHintsOnly,
    });
    outputs.push(rendered);

    // Determine exit code for this config
    const hasError = report.results.some((r) => !r.result.ok && r.check.severity === "error");
    if (hasError) overallExitCode = 1;
  }

  console.log(outputs.join("\n\n"));
  process.exit(overallExitCode);
}

// Only run main when executed directly (not when imported as a module by tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error("pm-tasks-core-doctor: unexpected error:", (e as Error).message);
    process.exit(1);
  });
}
