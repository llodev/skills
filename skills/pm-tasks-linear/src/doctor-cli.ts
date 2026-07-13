// pm-tasks-linear doctor-cli — adapter-specific health checks (C-LIN-*)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveDataDir } from "@llodev/pm-tasks-core/audit";
import { type DoctorCheck, type DoctorContext, runChecks } from "@llodev/pm-tasks-core/doctor";
import { renderReport, type RenderOpts } from "@llodev/pm-tasks-core/bin/doctor";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Probe interface — injected in tests; absent in standalone doctor invocations
// ---------------------------------------------------------------------------

export interface LinearProbe {
  /** Call Linear MCP list_teams and return team list */
  getTeam?: (teamId: string) => Promise<{ id: string; key: string } | null>;
}

// ---------------------------------------------------------------------------
// C-LIN-1: Config present and parseable (pure filesystem check)
// ---------------------------------------------------------------------------

const C_LIN_1: DoctorCheck = {
  id: "C-LIN-1",
  label: "Config present and parseable",
  severity: "error",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    if (!cfg || Object.keys(cfg).length === 0) {
      return {
        ok: false,
        message: `Config not found or empty at ${ctx.configPath}`,
        fixHint: "Run pm-tasks-linear init to generate a .linear.json config file.",
      };
    }
    if (typeof cfg["version"] !== "string") {
      return {
        ok: false,
        message: "Config is missing the required `version` field",
        fixHint: "Re-run pm-tasks-linear init to regenerate the config.",
      };
    }
    return { ok: true, message: `Config present (version ${String(cfg["version"])})` };
  },
};

// ---------------------------------------------------------------------------
// C-LIN-2: Team id present in config
// ---------------------------------------------------------------------------

const C_LIN_2: DoctorCheck = {
  id: "C-LIN-2",
  label: "Team id resolvable",
  severity: "error",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const team = (cfg["team"] ?? {}) as Record<string, unknown>;
    const id = typeof team["id"] === "string" ? team["id"] : "";
    const key = typeof team["key"] === "string" ? team["key"] : "";
    if (!id || !key) {
      return {
        ok: false,
        message: "team.id or team.key is missing in config",
        fixHint: "Re-run pm-tasks-linear init to regenerate the config.",
      };
    }
    return { ok: true, message: `team present: ${key} (${id})` };
  },
};

// ---------------------------------------------------------------------------
// C-LIN-3: states[] includes a completed-type entry
// ---------------------------------------------------------------------------

const C_LIN_3: DoctorCheck = {
  id: "C-LIN-3",
  label: "Completed state present",
  severity: "warn",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const states = cfg["states"];
    if (!Array.isArray(states) || states.length === 0) {
      return {
        ok: true,
        message:
          "No states in config — skipping completed-state check (init did not populate states)",
      };
    }
    const hasCompleted = (states as Array<Record<string, unknown>>).some(
      (s) => s["type"] === "completed",
    );
    if (!hasCompleted) {
      return {
        ok: false,
        message:
          "No state with type=completed found in config.states — task.close and task.move to done may fail",
        fixHint:
          "Re-run pm-tasks-linear init or manually add a completed-type state to .linear.json.",
      };
    }
    return { ok: true, message: "Completed state present in config.states" };
  },
};

// ---------------------------------------------------------------------------
// C-LIN-4: estimation.enabled coherent with linearTarget
// ---------------------------------------------------------------------------

const C_LIN_4: DoctorCheck = {
  id: "C-LIN-4",
  label: "Estimation config coherent",
  severity: "error",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const estimation = (cfg["estimation"] ?? {}) as Record<string, unknown>;
    const enabled = estimation["enabled"];
    const linearTarget = estimation["linearTarget"];

    if (enabled === undefined) {
      return {
        ok: false,
        message: "estimation.enabled is not set — re-run pm-tasks-linear init (M2 fix required)",
        fixHint: "Re-run pm-tasks-linear init to regenerate estimation block.",
      };
    }
    if (enabled === false && linearTarget === "points") {
      return {
        ok: false,
        message: "estimation.enabled=false but linearTarget=points — inconsistent",
        fixHint:
          'Set linearTarget to "none", or re-run pm-tasks-linear init with estimation enabled.',
      };
    }
    return {
      ok: true,
      message: `estimation: enabled=${String(enabled)}, linearTarget=${String(linearTarget ?? "not set")}`,
    };
  },
};

// ---------------------------------------------------------------------------
// C-LIN-5: cycles.enabled present
// ---------------------------------------------------------------------------

const C_LIN_5: DoctorCheck = {
  id: "C-LIN-5",
  label: "Cycles config present",
  severity: "warn",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const cycles = cfg["cycles"];
    if (!cycles || typeof (cycles as Record<string, unknown>)["enabled"] !== "boolean") {
      return {
        ok: false,
        message: "cycles.enabled is missing — task.sprint.set will be NOT_APPLICABLE at runtime",
        fixHint: "Re-run pm-tasks-linear init to populate cycles block.",
      };
    }
    return {
      ok: true,
      message: `cycles.enabled=${String((cycles as Record<string, unknown>)["enabled"])}`,
    };
  },
};

// ---------------------------------------------------------------------------
// C-LIN-6: autonomous scope references real team ids (pure config check)
// ---------------------------------------------------------------------------

const C_LIN_6: DoctorCheck = {
  id: "C-LIN-6",
  label: "Autonomous scope uses team id",
  severity: "warn",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const autonomous = cfg["autonomous"] as Record<string, unknown> | undefined;
    if (!autonomous) {
      return { ok: true, message: "No autonomous block — check not applicable" };
    }
    const scope = autonomous["scope"] as Record<string, unknown> | undefined;
    if (!scope) {
      return { ok: true, message: "Autonomous enabled but no scope restrictions — open scope" };
    }
    const teams = (scope["teams"] as string[] | undefined) ?? [];
    const team = (cfg["team"] ?? {}) as Record<string, unknown>;
    const teamId = typeof team["id"] === "string" ? team["id"] : "";
    if (teams.length > 0 && teamId && !teams.includes(teamId)) {
      return {
        ok: false,
        message: `autonomous.scope.teams does not include the configured team id (${teamId})`,
        fixHint: "Re-run pm-tasks-linear init --doctor or update autonomous.scope.teams manually.",
      };
    }
    return { ok: true, message: "Autonomous scope is consistent with team config" };
  },
};

// ---------------------------------------------------------------------------
// C-LIN-7: Team reachable (probe-based; degrades gracefully when no probe)
// ---------------------------------------------------------------------------

function makeC_LIN_7(probe?: LinearProbe): DoctorCheck {
  return {
    id: "C-LIN-7",
    label: "Team reachable",
    severity: "warn",
    async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
      if (!probe?.getTeam) {
        return {
          ok: true,
          message:
            "No Linear probe injected — skipping reachability check. Run from a Claude Code session to verify.",
        };
      }

      const cfg = ctx.config as Record<string, unknown>;
      const team = (cfg["team"] ?? {}) as Record<string, unknown>;
      const id = typeof team["id"] === "string" ? team["id"] : "";

      try {
        const result = await probe.getTeam(id);
        if (!result) {
          return {
            ok: false,
            message: `Team id ${id} not found in Linear`,
            fixHint: "Ensure the Linear MCP is authenticated and the team id matches.",
          };
        }
        return { ok: true, message: `Team reachable: ${result.key} (${result.id})` };
      } catch (e) {
        return {
          ok: false,
          message: `Team reachability probe error: ${(e as Error).message}`,
          fixHint: "Ensure the Linear MCP is authenticated and the team id matches.",
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Factory + default export
// ---------------------------------------------------------------------------

/** Create the linear-specific check array, optionally with a live probe for C-LIN-7. */
export function makeLinearChecks(probe?: LinearProbe): DoctorCheck[] {
  return [C_LIN_1, C_LIN_2, C_LIN_3, C_LIN_4, C_LIN_5, C_LIN_6, makeC_LIN_7(probe)];
}

/** Pre-built checks without a probe (used when running standalone without MCP). */
export const ADAPTER_CHECKS: DoctorCheck[] = makeLinearChecks();

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
    configPath = path.resolve(process.cwd(), ".linear.json");
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

  const ctx: DoctorContext = {
    tool: "linear",
    configPath,
    config,
    manifest,
    schema,
    auditLogPath: path.join(resolveDataDir("linear"), "audit.log"),
    auditRotationMaxBytes: 10 * 1024 * 1024,
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
