/**
 * Adapter health checks (C-CLK-*), run after core's shared checks. There is no
 * C-CLK-5: sprints are not part of this adapter. The live checks (C-CLK-7, C-CLK-8)
 * go through a probe only: a read-only REST probe when CLICKUP_API_TOKEN is set
 * (tests inject their own), else they are skipped with an advisory.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDataDir } from "@llodev/pm-tasks-core/audit";
import { renderReport } from "@llodev/pm-tasks-core/bin/doctor";
import {
  type DoctorCheck,
  type DoctorContext,
  type DoctorResult,
  runChecks,
} from "@llodev/pm-tasks-core/doctor";
import {
  interpolate,
  listLocales,
  loadStrings,
  registerI18nRoot,
} from "@llodev/pm-tasks-core/i18n";
import { isObj } from "./envelope.js";
import { readClickUpToken } from "./env.js";
import { TIME_STRATEGIES } from "./estimation.js";
import { ClickUpInitError, createRestInitApi, type ClickUpInitApi } from "./init-api.js";
import { statusKey } from "./status.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const I18N = "clickup";
const REINIT = "Re-run pm-tasks-clickup init.";
const ROLES = ["open", "wip", "done", "closed"] as const;

/** Live reads for C-CLK-7 and C-CLK-8; a missing method skips its check. */
export interface ClickUpProbe {
  getWorkspaces?(): Promise<{ id: string }[]>;
  getListStatuses?(listId: string): Promise<string[]>;
}

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj => (isObj(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** A string trimmed, or "" for anything else. */
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const workspaceId = (ctx: DoctorContext): string => text(obj(obj(ctx.config).workspace).id);

/** The C-CLK messages in the config's locale (en-US when unset or unknown). */
async function strings(ctx: DoctorContext): Promise<Record<string, string>> {
  registerI18nRoot(I18N, path.join(ROOT, "i18n"));
  const locale = text(obj(ctx.config).locale);
  return loadStrings(I18N, /^[a-z]{2}-[A-Z]{2}$/.test(locale) ? locale : "en-US");
}

function listLabel(l: Obj): string {
  const name = text(l.name);
  const id = text(l.id);
  return name && id ? `${name} (${id})` : name || id || "?";
}

function verdict(problems: string[], okMessage: string, fixHint: string): DoctorResult {
  return problems.length > 0
    ? { ok: false, message: problems.join(" "), fixHint }
    : { ok: true, message: okMessage };
}

/** An init error's message (built never to carry a token, header or body); else a fixed text. */
function reason(e: unknown): string {
  return e instanceof ClickUpInitError ? e.message : "the ClickUp probe failed";
}

const C_CLK_1: DoctorCheck = {
  id: "C-CLK-1",
  label: "Config present and parseable",
  severity: "error",
  async run(ctx) {
    const s = await strings(ctx);
    if (isObj(ctx.config) && typeof ctx.config.version === "string") {
      return { ok: true, message: s.doctorOk };
    }
    const exists = await access(ctx.configPath).then(
      () => true,
      () => false,
    );
    return exists
      ? {
          ok: false,
          message: interpolate(s.doctorConfigInvalid, { path: ctx.configPath }),
          fixHint: REINIT,
        }
      : {
          ok: false,
          message: s.doctorNoConfig,
          fixHint: "Run pm-tasks-clickup init, or pass --config <path>.",
        };
  },
};

const C_CLK_2: DoctorCheck = {
  id: "C-CLK-2",
  label: "Workspace id present",
  severity: "error",
  async run(ctx) {
    const id = workspaceId(ctx);
    return id
      ? { ok: true, message: `workspace.id ${id}` }
      : { ok: false, message: (await strings(ctx)).doctorNoWorkspace, fixHint: REINIT };
  },
};

const C_CLK_3: DoctorCheck = {
  id: "C-CLK-3",
  label: "Every list pins open and done",
  severity: "error",
  async run(ctx) {
    const s = await strings(ctx);
    const lists = arr(obj(ctx.config).lists).map(obj);
    if (lists.length === 0) return { ok: false, message: s.doctorNoLists, fixHint: REINIT };
    const problems = lists.flatMap((l) => {
      const pins = obj(l.statuses);
      const list = listLabel(l);
      return [
        ...(text(pins.open) ? [] : [interpolate(s.doctorNoOpen, { list })]),
        ...(text(pins.done) ? [] : [interpolate(s.doctorNoDone, { list })]),
      ];
    });
    return verdict(problems, `${lists.length} list(s) pin open and done`, REINIT);
  },
};

// warn: a time target on a point strategy only drops the native estimate. An
// out-of-range hoursPerDay breaks every estimate, and core's schema check (C-CFG-1)
// already fails the run on it.
const C_CLK_4: DoctorCheck = {
  id: "C-CLK-4",
  label: "Estimation coherent",
  severity: "warn",
  async run(ctx) {
    const s = await strings(ctx);
    const est = obj(ctx.config).estimation;
    if (!isObj(est) || est.enabled === false) return { ok: true, message: s.doctorEstimationOff };
    const h = est.hoursPerDay;
    const problems = [
      ...(h === undefined || (typeof h === "number" && h >= 1 && h <= 24)
        ? []
        : [s.doctorHoursPerDay]),
      ...(est.clickupTarget === "time" && !TIME_STRATEGIES.has(est.strategy)
        ? [s.doctorEstimationMismatch]
        : []),
    ];
    return verdict(
      problems,
      `estimation: ${String(est.strategy)} → ${String(est.clickupTarget)}`,
      "Edit the estimation block of .clickup.json, or re-run pm-tasks-clickup init.",
    );
  },
};

const C_CLK_6: DoctorCheck = {
  id: "C-CLK-6",
  label: "Autonomous scope and default aliases resolve",
  severity: "warn",
  async run(ctx) {
    const s = await strings(ctx);
    const cfg = obj(ctx.config);
    const auto = obj(cfg.autonomous);
    const defaults = obj(cfg.defaults);
    const listIds = new Set(arr(cfg.lists).map((l) => obj(l).id));
    // Core's rule (C-CFG-4): "me" or a members[].alias; an empty or non-string default is unset.
    const aliases = new Set<unknown>(["me", ...arr(cfg.members).map((m) => obj(m).alias)]);
    const problems = [
      ...arr(obj(auto.scope).lists)
        .filter((id) => !listIds.has(id))
        .map((id) => interpolate(s.doctorScopeUnknownList, { list: String(id) })),
      ...(["assigneeAlias", "escalateToAlias"] as const)
        .filter((field) => {
          const alias = defaults[field];
          return typeof alias === "string" && alias !== "" && !aliases.has(alias);
        })
        .map((field) =>
          interpolate(s.doctorAliasUnresolved, { field, alias: String(defaults[field]) }),
        ),
    ];
    const message = [
      ...(problems.length > 0 ? problems : ["autonomous scope and default aliases resolve"]),
      ...(auto.enabled === true ? [] : [s.doctorAutonomousDisabled]),
    ].join(" ");
    return problems.length > 0
      ? {
          ok: false,
          message,
          fixHint:
            'Register the list with pm-tasks-clickup init or drop it from autonomous.scope.lists; set each default to "me" or a members[].alias.',
        }
      : { ok: true, message };
  },
};

/** Create the ClickUp checks; without a probe the live checks are skipped. */
export function makeClickUpChecks(probe?: ClickUpProbe): DoctorCheck[] {
  // C-CLK-7's result per run, so C-CLK-8 reuses it instead of probing again.
  const reached = new WeakMap<DoctorContext, Promise<DoctorResult>>();

  async function reach(ctx: DoctorContext): Promise<DoctorResult> {
    const s = await strings(ctx);
    const id = workspaceId(ctx);
    if (!probe?.getWorkspaces) return { ok: true, message: s.doctorNoProbe };
    if (!id) return { ok: true, message: "skipped: no workspace.id (see C-CLK-2)" };
    const fixHint =
      "Check CLICKUP_API_TOKEN, and that workspace.id is a workspace of that account.";
    try {
      if ((await probe.getWorkspaces()).some((w) => w.id === id)) {
        return { ok: true, message: `workspace ${id} reachable` };
      }
      return {
        ok: false,
        message: interpolate(s.doctorWorkspaceHidden, { workspace: id }),
        fixHint,
      };
    } catch (e) {
      return {
        ok: false,
        message: interpolate(s.doctorUnreachable, { reason: reason(e) }),
        fixHint,
      };
    }
  }

  const C_CLK_7: DoctorCheck = {
    id: "C-CLK-7",
    label: "ClickUp reachable",
    severity: "warn",
    run(ctx) {
      let result = reached.get(ctx);
      if (!result) reached.set(ctx, (result = reach(ctx)));
      return result;
    },
  };

  // The safety net for a pinned status renamed or removed after init: the verbs
  // fail closed on it, and this check names the list and role to fix.
  const C_CLK_8: DoctorCheck = {
    id: "C-CLK-8",
    label: "Pinned statuses exist in ClickUp",
    severity: "error",
    async run(ctx) {
      const s = await strings(ctx);
      if (!probe?.getListStatuses) return { ok: true, message: s.doctorNoProbe };
      // One skipped result, not one failure per list, when C-CLK-7 failed.
      if (!(await C_CLK_7.run(ctx)).ok) return { ok: true, message: s.doctorLiveSkipped };
      // One call per distinct list id (the first entry wins), no retry.
      const seen = new Set<unknown>();
      const lists = arr(obj(ctx.config).lists)
        .map(obj)
        .filter((l) => {
          if (!text(l.id) || seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
      const problems: string[] = [];
      for (const [i, l] of lists.entries()) {
        const list = listLabel(l);
        let live: Set<string>;
        try {
          live = new Set((await probe.getListStatuses(l.id as string)).map(statusKey));
        } catch (e) {
          // C-CLK-7 passed in this run, so a 401/403 means ClickUp will not show this list.
          if (e instanceof ClickUpInitError && e.code === "AUTH") {
            problems.push(interpolate(s.doctorListInaccessible, { list, status: e.status ?? 401 }));
            continue;
          }
          problems.push(interpolate(s.doctorListUnreadable, { list, reason: reason(e) }));
          // A rate-limit answer would repeat for every list: stop, and say so once.
          if (e instanceof ClickUpInitError && e.code === "RATE_LIMIT") {
            const count = lists.length - i - 1;
            if (count > 0) problems.push(interpolate(s.doctorListsNotChecked, { count }));
            break;
          }
          continue;
        }
        const pins = obj(l.statuses);
        for (const role of ROLES) {
          const status = text(pins[role]);
          if (status && !live.has(statusKey(status))) {
            problems.push(interpolate(s.doctorStatusDrift, { list, status: pins[role], role }));
          }
        }
      }
      return verdict(
        problems,
        `pinned statuses exist in ${lists.length} list(s)`,
        "Re-run pm-tasks-clickup init to pin the current lists and statuses.",
      );
    },
  };

  return [C_CLK_1, C_CLK_2, C_CLK_3, C_CLK_4, C_CLK_6, C_CLK_7, C_CLK_8];
}

/** The checks without a probe: the live checks are skipped. */
export const ADAPTER_CHECKS: DoctorCheck[] = makeClickUpChecks();

/** A read-only REST probe. The token only reaches init-api, which sends it as the header. */
function restProbe(token: string): ClickUpProbe {
  let api: ClickUpInitApi | undefined;
  // Built on first use, so a malformed token fails C-CLK-7 instead of throwing here.
  const rest = (): ClickUpInitApi => (api ??= createRestInitApi(token));
  return {
    getWorkspaces: async () => rest().getWorkspaces(),
    getListStatuses: async (id) => (await rest().getListStatuses(id)).map((st) => st.status),
  };
}

export interface RunDoctorOpts {
  tool: string;
  argv: string[];
}

/** Seams for tests; each defaults to the real process. */
export interface DoctorDeps {
  env?: NodeJS.ProcessEnv;
  /** Wins over the REST probe that CLICKUP_API_TOKEN would build. */
  probe?: ClickUpProbe;
  write?: (text: string) => void;
  exit?: (code: number) => void;
}

/** `--json`, `--fix-hints-only`, `--config <path>` (default ./.clickup.json). Exits 1 on an error-severity failure. */
export async function runDoctor({ argv }: RunDoctorOpts, deps: DoctorDeps = {}): Promise<void> {
  const i = argv.indexOf("--config");
  const configPath = path.resolve((i === -1 ? undefined : argv[i + 1]) || ".clickup.json");

  let config: unknown = {};
  try {
    config = JSON.parse(await readFile(configPath, "utf8")) as unknown;
  } catch {
    // Missing or not JSON: C-CLK-1 reports which.
  }
  const read = async (rel: string): Promise<unknown> =>
    JSON.parse(await readFile(path.join(ROOT, rel), "utf8")) as unknown;

  let availableLocales: string[] | undefined;
  try {
    registerI18nRoot(I18N, path.join(ROOT, "i18n"));
    availableLocales = await listLocales(I18N);
  } catch {
    availableLocales = undefined; // never crash the doctor over locale discovery
  }

  const ctx: DoctorContext = {
    tool: "clickup",
    configPath,
    config,
    manifest: (await read("manifest.json")) as DoctorContext["manifest"],
    schema: await read("schemas/config.json"),
    auditLogPath: path.join(resolveDataDir("clickup"), "audit.log"),
    auditRotationMaxBytes: 10 * 1024 * 1024,
    availableLocales,
  };

  const token = readClickUpToken(deps.env ?? process.env);
  const probe = deps.probe ?? (token === undefined ? undefined : restProbe(token));
  const report = await runChecks(ctx, makeClickUpChecks(probe));

  const write = deps.write ?? ((t: string) => console.log(t));
  write(
    renderReport(report, {
      format: argv.includes("--json") ? "json" : "md",
      fixHintsOnly: argv.includes("--fix-hints-only"),
    }),
  );
  const hasError = report.results.some((r) => !r.result.ok && r.check.severity === "error");
  (deps.exit ?? ((code: number) => process.exit(code)))(hasError ? 1 : 0);
}
