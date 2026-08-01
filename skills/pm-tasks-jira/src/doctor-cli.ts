// pm-tasks-jira doctor-cli — adapter-specific health checks (C-JIR-*)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveDataDir } from "@llodev/pm-tasks-core/audit";
import { type DoctorCheck, type DoctorContext, runChecks } from "@llodev/pm-tasks-core/doctor";
import { renderReport, type RenderOpts } from "@llodev/pm-tasks-core/bin/doctor";
import { registerI18nRoot, listLocales } from "@llodev/pm-tasks-core/i18n";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Probe interface — injected in tests; absent in standalone doctor invocations
// ---------------------------------------------------------------------------

export interface JiraProbe {
  /** Call mcp__atlassian__getVisibleJiraProjects and return project list */
  getProject?: (cloudId: string) => Promise<Array<{ key: string }>>;
}

// ---------------------------------------------------------------------------
// C-JIR-1: Estimation field consistent (pure config check — no MCP)
// ---------------------------------------------------------------------------

const C_JIR_1: DoctorCheck = {
  id: "C-JIR-1",
  label: "Estimation field consistent",
  severity: "error",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const estimation = (cfg["estimation"] ?? {}) as Record<string, unknown>;
    const jiraTarget = estimation["jiraTarget"];

    if (jiraTarget !== "story_points") {
      return { ok: true, message: "jiraTarget is not story_points — fieldId not required" };
    }

    const fieldId = estimation["fieldId"];
    if (typeof fieldId === "string" && fieldId.length > 0) {
      return { ok: true, message: `fieldId present: ${fieldId}` };
    }

    return {
      ok: false,
      message: "estimation.jiraTarget is story_points but estimation.fieldId is missing or empty",
      fixHint: "Add fieldId to estimation block, or run pm-tasks-jira init to re-detect.",
    };
  },
};

// ---------------------------------------------------------------------------
// C-JIR-2: Project reachable (probe-based; degrades to warn when no probe)
// ---------------------------------------------------------------------------

function makeC_JIR_2(probe?: JiraProbe): DoctorCheck {
  return {
    id: "C-JIR-2",
    label: "Project reachable",
    severity: "warn",
    async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
      if (!probe?.getProject) {
        return {
          ok: true,
          message:
            "No Jira probe injected — skipping reachability check (no probe). Run from a Claude Code session to verify.",
        };
      }

      const cfg = ctx.config as Record<string, unknown>;
      const project = (cfg["project"] ?? {}) as Record<string, unknown>;
      const site = (cfg["site"] ?? {}) as Record<string, unknown>;
      const key = typeof project["key"] === "string" ? project["key"] : "";
      const cloudId = typeof site["cloudId"] === "string" ? site["cloudId"] : "";

      try {
        const projects = await probe.getProject(cloudId);
        const found = projects.some((p) => p.key === key);
        if (found) {
          return { ok: true, message: `project ${key} is reachable` };
        }
        return {
          ok: false,
          message: `project ${key} not found in accessible Jira projects`,
          fixHint: "Ensure the Atlassian MCP is authenticated and the project key matches.",
        };
      } catch (e) {
        return {
          ok: false,
          message: `reachability probe error: ${(e as Error).message}`,
          fixHint: "Ensure the Atlassian MCP is authenticated and the project key matches.",
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Factory + default export
// ---------------------------------------------------------------------------

/** Create the jira-specific check array, optionally with a live probe for C-JIR-2. */
export function makeJiraChecks(probe?: JiraProbe): DoctorCheck[] {
  return [C_JIR_1, makeC_JIR_2(probe)];
}

/** Pre-built checks without a probe (used when running standalone without MCP). */
export const ADAPTER_CHECKS: DoctorCheck[] = makeJiraChecks();

// ---------------------------------------------------------------------------
// runDoctor — called from bin/init.ts when --doctor is passed
// ---------------------------------------------------------------------------

export interface RunDoctorOpts {
  tool: string;
  argv: string[];
}

export async function runDoctor({ argv }: RunDoctorOpts): Promise<void> {
  const jsonMode = argv.includes("--json");
  const fixHintsOnly = argv.includes("--fix-hints-only");

  // --config override
  const configIdx = argv.indexOf("--config");
  let configPath: string;
  if (configIdx !== -1 && argv[configIdx + 1]) {
    configPath = argv[configIdx + 1];
  } else {
    configPath = path.resolve(process.cwd(), ".jira.json");
  }

  let config: unknown;
  try {
    const raw = await readFile(configPath, "utf8");
    config = JSON.parse(raw) as unknown;
  } catch {
    config = {};
  }

  const schemaRaw = await readFile(path.join(ROOT, "schemas", "config.json"), "utf8");
  const manifestRaw = await readFile(path.join(ROOT, "manifest.json"), "utf8");
  const schema = JSON.parse(schemaRaw) as unknown;
  const manifest = JSON.parse(manifestRaw) as { tool: string; verbs: string[] };

  let availableLocales: string[] | undefined;
  try {
    registerI18nRoot("__doctor-jira", path.join(ROOT, "i18n"));
    availableLocales = await listLocales("__doctor-jira");
  } catch {
    availableLocales = undefined; // never crash the doctor over locale discovery
  }

  const ctx: DoctorContext = {
    tool: "jira",
    configPath,
    config,
    manifest,
    schema,
    auditLogPath: path.join(resolveDataDir("jira"), "audit.log"),
    auditRotationMaxBytes: 10 * 1024 * 1024,
    availableLocales,
  };

  const report = await runChecks(ctx, ADAPTER_CHECKS);

  const opts: RenderOpts = {
    format: jsonMode ? "json" : "md",
    fixHintsOnly,
  };

  console.log(renderReport(report, opts));

  const hasError = report.results.some((r) => !r.result.ok && r.check.severity === "error");
  process.exit(hasError ? 1 : 0);
}
