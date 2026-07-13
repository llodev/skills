// pm-tasks-linear init flow — library surface (no CLI side effects).
// The bin entry (bin/init.ts) is a thin shim that imports runInit from here.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  promptPick,
  promptYesNo,
  promptLocale,
  loadStrings,
  registerI18nRoot,
  writeConfig,
  validateConfig,
  printInstructions,
  type Choice,
  type PromptPickOptions,
  type StringsTable,
  type ValidationResult,
} from "@llodev/pm-tasks-core/init-lib";
import type { McpCaller } from "./transport-linear.js";

// dist/init-flow.js → package root is one level up.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadSchema(): Promise<unknown> {
  const raw = await readFile(path.join(ROOT, "schemas", "config.json"), "utf8");
  return JSON.parse(raw) as unknown;
}

// ---------------------------------------------------------------------------
// Linear API response types
// ---------------------------------------------------------------------------

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export interface LinearState {
  id: string;
  name: string;
  type: string;
}

export interface LinearLabel {
  id: string;
  name: string;
}

export interface LinearMember {
  id: string;
  name: string;
  email?: string;
}

export interface LinearTeamSettings {
  cyclesEnabled: boolean;
  issueEstimationType: string; // "notUsed" means estimation disabled
}

// ---------------------------------------------------------------------------
// Dependency injection interface — enables unit testing with stubs
// ---------------------------------------------------------------------------

export interface LinearInitApi {
  getTeams(): Promise<LinearTeam[]>;
  getStates(teamId: string): Promise<LinearState[]>;
  getLabels(): Promise<LinearLabel[]>;
  getUsers(): Promise<LinearMember[]>;
  getTeamSettings(teamId: string): Promise<LinearTeamSettings>;
  getCycles(teamId: string): Promise<unknown[]>;
}

export type PickFn = <T>(
  label: string,
  choices: Choice<T>[],
  opts?: PromptPickOptions<T>,
) => Promise<T | null>;

export interface InitDeps {
  /** Injected API implementation (MCP or GraphQL stub — used in tests) */
  api?: LinearInitApi;
  /** Injected MCP caller — builds MCP-based API when no api is provided */
  mcp?: McpCaller;
  pick?: PickFn;
  yesNo?: (question: string) => Promise<boolean>;
  /** Pre-resolved locale (tests pass this to skip interactive promptLocale) */
  locale?: string;
  doWrite?: (targetPath: string, data: unknown) => Promise<void>;
  doValidate?: (data: unknown, schema: unknown) => Promise<ValidationResult>;
  doLoadSchema?: () => Promise<unknown>;
  outPath?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINEAR_10_VERBS = [
  "task.create",
  "task.move",
  "checklist.check",
  "task.close",
  "task.due-date.set",
  "task.assignee.add",
  "task.comment.add",
  "task.parent.set",
  "task.estimate.set",
  "task.sprint.set",
] as const;

const DEFAULT_FIBONACCI_SCALE = [1, 2, 3, 5, 8, 13];
const DEFAULT_SIZE_MAP = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };

const STRATEGY_CHOICES: Choice<string>[] = [
  { label: "fibonacci (default)", value: "fibonacci" },
  { label: "story_points", value: "story_points" },
  { label: "planning_poker", value: "planning_poker" },
  { label: "affinity", value: "affinity" },
  { label: "t_shirt", value: "t_shirt" },
  { label: "ideal_days", value: "ideal_days" },
  { label: "ideal_hours", value: "ideal_hours" },
  { label: "three_point", value: "three_point" },
];

// ---------------------------------------------------------------------------
// Path A: MCP-driven API
// ---------------------------------------------------------------------------

function createMcpApi(mcp: McpCaller): LinearInitApi {
  return {
    getTeams: async () => {
      const res = await mcp("list_teams", {});
      return extractNodes(res).map((n) => ({
        id: String(n["id"] ?? ""),
        key: String(n["key"] ?? ""),
        name: String(n["name"] ?? ""),
      }));
    },
    getStates: async (teamId: string) => {
      const res = await mcp("list_issue_statuses", { team: teamId });
      return extractNodes(res).map((n) => ({
        id: String(n["id"] ?? ""),
        name: String(n["name"] ?? ""),
        type: String(n["type"] ?? ""),
      }));
    },
    getLabels: async () => {
      const res = await mcp("list_issue_labels", {});
      return extractNodes(res).map((n) => ({
        id: String(n["id"] ?? ""),
        name: String(n["name"] ?? ""),
      }));
    },
    getUsers: async () => {
      const res = await mcp("list_users", {});
      return extractNodes(res).map((n) => ({
        id: String(n["id"] ?? ""),
        name: String(n["name"] ?? ""),
        email: typeof n["email"] === "string" ? n["email"] : undefined,
      }));
    },
    getTeamSettings: async (teamId: string) => {
      const res = await mcp("get_team", { query: teamId });
      const obj = isRecord(res) ? res : {};
      return {
        cyclesEnabled: Boolean(obj["cyclesEnabled"] ?? false),
        issueEstimationType: String(obj["issueEstimationType"] ?? "notUsed"),
      };
    },
    getCycles: async (teamId: string) => {
      const res = await mcp("list_cycles", { teamId });
      return extractNodes(res);
    },
  };
}

// ---------------------------------------------------------------------------
// Path B: GraphQL standalone (LINEAR_API_KEY in env)
// ---------------------------------------------------------------------------

function createGraphQLApi(apiKey: string): LinearInitApi {
  const GQL_URL = "https://api.linear.app/graphql";

  // Linear personal API keys go directly in Authorization (no Bearer prefix).
  async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await globalThis.fetch(GQL_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Linear GraphQL HTTP ${res.status}`);
    const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`Linear GraphQL: ${body.errors[0].message}`);
    if (!body.data) throw new Error("Linear GraphQL: no data in response");
    return body.data;
  }

  return {
    getTeams: async () => {
      const data = await gql<{
        teams: { nodes: Array<{ id: string; key: string; name: string }> };
      }>(`{ teams { nodes { id key name } } }`);
      return data.teams.nodes;
    },
    getStates: async (teamId: string) => {
      const data = await gql<{
        team: { states: { nodes: Array<{ id: string; name: string; type: string }> } };
      }>(`query($id: String!) { team(id: $id) { states { nodes { id name type } } } }`, {
        id: teamId,
      });
      return data.team.states.nodes;
    },
    getLabels: async () => {
      const data = await gql<{
        issueLabels: { nodes: Array<{ id: string; name: string }> };
      }>(`{ issueLabels { nodes { id name } } }`);
      return data.issueLabels.nodes;
    },
    getUsers: async () => {
      const data = await gql<{
        users: { nodes: Array<{ id: string; name: string; email: string }> };
      }>(`{ users { nodes { id name email } } }`);
      return data.users.nodes.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email || undefined,
      }));
    },
    getTeamSettings: async (teamId: string) => {
      const data = await gql<{
        team: { cyclesEnabled: boolean; issueEstimationType: string };
      }>(`query($id: String!) { team(id: $id) { cyclesEnabled issueEstimationType } }`, {
        id: teamId,
      });
      return {
        cyclesEnabled: data.team.cyclesEnabled,
        issueEstimationType: data.team.issueEstimationType,
      };
    },
    getCycles: async (teamId: string) => {
      const data = await gql<{
        team: { cycles: { nodes: Array<Record<string, unknown>> } };
      }>(`query($id: String!) { team(id: $id) { cycles { nodes { id name number } } } }`, {
        id: teamId,
      });
      return data.team.cycles.nodes;
    },
  };
}

// ---------------------------------------------------------------------------
// Sanitization (mirror jira — defense against CodeQL js/http-to-file-access)
// ---------------------------------------------------------------------------

const MAX_CONFIG_STRING_LEN = 1024;

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function sanitizePersistedConfig<T>(value: T): T {
  if (typeof value === "string") {
    if (value.length > MAX_CONFIG_STRING_LEN || hasControlChar(value)) {
      throw new Error(
        `pm-tasks-linear init: refusing to persist unsafe config value ${JSON.stringify(value.slice(0, 40))}`,
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePersistedConfig(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      clean[key] = sanitizePersistedConfig(item);
    }
    return clean as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractNodes(res: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(res)) return res.filter(isRecord);
  if (isRecord(res) && Array.isArray(res["nodes"])) {
    return (res["nodes"] as unknown[]).filter(isRecord);
  }
  return [];
}

/** Strip surrounding quotes from an env value (defense against dotenv quoting). */
export function stripEnvQuotes(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

// ---------------------------------------------------------------------------
// Main init flow (exported for testing)
// ---------------------------------------------------------------------------

export async function runInit(deps: InitDeps = {}): Promise<Record<string, unknown>> {
  const outPath = deps.outPath ?? path.resolve(process.cwd(), ".linear.json");
  const doLoadSchema = deps.doLoadSchema ?? loadSchema;
  const doWrite = deps.doWrite ?? writeConfig;
  const doValidate = deps.doValidate ?? validateConfig;
  const doPick: PickFn = deps.pick ?? promptPick;
  const doYesNo = deps.yesNo ?? ((q: string) => promptYesNo(q));

  // Resolve API — injected (tests) → MCP caller → GraphQL standalone
  let api: LinearInitApi;
  if (deps.api) {
    api = deps.api;
  } else if (deps.mcp) {
    api = createMcpApi(deps.mcp);
  } else {
    const rawKey = process.env.LINEAR_API_KEY;
    if (rawKey) {
      const apiKey = stripEnvQuotes(rawKey);
      api = createGraphQLApi(apiKey);
    } else {
      printInstructions([
        "pm-tasks-linear init requires Linear credentials.",
        "Either connect the Linear MCP server in your Claude Code session,",
        "or set LINEAR_API_KEY environment variable for standalone GraphQL discovery.",
        "Linear MCP: https://linear.app/docs/mcp",
      ]);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Step 0: Locale FIRST
  // -------------------------------------------------------------------------
  registerI18nRoot("linear", path.join(ROOT, "i18n"));
  const locale = deps.locale ?? (await promptLocale("core", { defaultLocale: "en-US" }));
  const strings: StringsTable = await loadStrings("linear", locale);
  console.log(`\n${strings.header}\n`);

  // -------------------------------------------------------------------------
  // Step 1: Pick team
  // -------------------------------------------------------------------------
  const teams = await api.getTeams();
  if (teams.length === 0) {
    printInstructions([
      "No Linear teams found.",
      "Ensure your Linear MCP is authenticated or LINEAR_API_KEY is valid.",
    ]);
    process.exit(1);
  }

  let team: LinearTeam;
  if (teams.length === 1) {
    team = teams[0];
  } else {
    const picked = await doPick(
      strings.teamPrompt,
      teams.map((t) => ({ label: `${t.key} — ${t.name}`, value: t })),
      { defaultIndex: 0 },
    );
    if (!picked) {
      process.stderr.write(`${strings.noTeam}\n`);
      process.exit(1);
    }
    team = picked;
  }

  // -------------------------------------------------------------------------
  // Step 2: Discover states, labels, users, team settings (parallel)
  // -------------------------------------------------------------------------
  const [states, labels, users, teamSettings] = await Promise.all([
    api.getStates(team.id),
    api.getLabels(),
    api.getUsers(),
    api.getTeamSettings(team.id),
  ]);

  // Cycles: team setting OR any cycles exist
  let cyclesEnabled = teamSettings.cyclesEnabled;
  if (!cyclesEnabled) {
    try {
      const cycles = await api.getCycles(team.id);
      if (cycles.length > 0) cyclesEnabled = true;
    } catch {
      // leave as false
    }
  }

  const members = users.map((u) => ({
    id: u.id,
    name: u.name,
    ...(u.email ? { email: u.email } : {}),
  }));

  // -------------------------------------------------------------------------
  // Step 3: Estimation strategy
  // -------------------------------------------------------------------------
  const strategy =
    (await doPick(strings.strategyPrompt, STRATEGY_CHOICES, { defaultIndex: 0 })) ?? "fibonacci";

  const usesFibonacciScale = ["fibonacci", "story_points", "planning_poker"].includes(strategy);
  const scale = usesFibonacciScale ? DEFAULT_FIBONACCI_SCALE : undefined;

  // Determine estimation enabled from team setting (M2: always write explicitly)
  const estimationEnabled = teamSettings.issueEstimationType !== "notUsed";

  let linearTarget: "points" | "none";
  if (estimationEnabled) {
    linearTarget =
      (await doPick(
        strings.targetPromptPoints,
        [
          { label: strings.targetPoints, value: "points" as const },
          { label: strings.targetNone, value: "none" as const },
        ],
        { defaultIndex: 0 },
      )) ?? "points";
  } else {
    linearTarget = "none";
  }

  const estimation: Record<string, unknown> = {
    strategy,
    linearTarget,
    enabled: estimationEnabled, // M2: always write explicitly (never undefined at runtime)
  };
  if (scale) estimation.scale = scale;
  if (strategy === "t_shirt") estimation.sizeMap = { ...DEFAULT_SIZE_MAP };

  // -------------------------------------------------------------------------
  // Step 4: Autonomous block
  // -------------------------------------------------------------------------
  const wantAuto = await doYesNo(strings.autonomousPrompt);

  let autonomous: Record<string, unknown> | undefined;
  if (wantAuto) {
    autonomous = {
      enabled: false,
      allow: [...LINEAR_10_VERBS],
      scope: { teams: [team.id] },
      rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
      auditLog: "./logs/linear/audit.log",
    };
  }

  // -------------------------------------------------------------------------
  // Step 5: Assemble, validate, and write config
  // -------------------------------------------------------------------------
  const out: Record<string, unknown> = {
    version: "1",
    locale,
    team: { id: team.id, key: team.key, name: team.name },
  };
  if (states.length > 0) out.states = states;
  if (labels.length > 0) out.labels = labels;
  if (members.length > 0) out.members = members;
  out.estimation = estimation;
  out.cycles = { enabled: cyclesEnabled };
  if (autonomous !== undefined) out.autonomous = autonomous;

  const schema = await doLoadSchema();
  const valid = await doValidate(out, schema);
  if (!valid.ok) {
    console.error(
      "pm-tasks-linear init: config validation failed:",
      JSON.stringify(valid.errors, null, 2),
    );
    process.exit(1);
  }

  const safeConfig = sanitizePersistedConfig(out);
  await doWrite(outPath, safeConfig);
  printInstructions([
    `Config written to ${outPath}`,
    strings.nextDoctor,
    "Linear MCP: https://linear.app/docs/mcp",
  ]);

  return safeConfig;
}
