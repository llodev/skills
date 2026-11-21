/**
 * `pm-tasks-clickup init`: pick a workspace and lists, pin each list's statuses
 * by role, and write `.clickup.json`. Library surface; `bin/init.ts` is the shim.
 *
 * Credentials, in order: an injected `api`, an injected `mcp` (agent session),
 * then `CLICKUP_API_TOKEN` (read-only REST). The token only reaches init-api,
 * which sends it as a header: never printed, written or put in an error.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EstimationStrategy } from "@llodev/pm-tasks-core/estimation";
import {
  aliasOf,
  interpolate,
  loadStrings,
  multiSelect,
  printInstructions,
  promptLocale,
  promptPick,
  promptYesNo,
  registerI18nRoot,
  validateConfig,
  writeConfig,
  type Choice,
  type PromptPickOptions,
  type StringsTable,
  type ValidationResult,
} from "@llodev/pm-tasks-core/init-lib";
import { readClickUpToken } from "./env.js";
import { TIME_STRATEGIES } from "./estimation.js";
import {
  ClickUpInitError,
  createMcpInitApi,
  createRestInitApi,
  type ClickUpInitApi,
  type ClickUpInitErrorCode,
  type ClickUpListSummary,
  type ClickUpMember,
} from "./init-api.js";
import { mapStatuses } from "./status-map.js";
import type { ClickUpListConfig, McpCaller } from "./transport-clickup.js";

export { stripEnvQuotes } from "./env.js";

// src/ or dist/ → the package root is one level up.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const I18N = "clickup";

export type PickFn = <T>(
  label: string,
  choices: Choice<T>[],
  opts?: PromptPickOptions<T>,
) => Promise<T | null>;

export type MultiSelectFn = <T>(label: string, choices: Choice<T>[]) => Promise<T[]>;

export interface InitDeps {
  /** Injected discovery (tests); wins over `mcp` and the token. */
  api?: ClickUpInitApi;
  /** The ClickUp MCP in an agent session; wins over the token. */
  mcp?: McpCaller;
  pick?: PickFn;
  multiSelect?: MultiSelectFn;
  yesNo?: (question: string) => Promise<boolean>;
  /** Pre-resolved locale (skips the locale prompt). */
  locale?: string;
  doWrite?: (targetPath: string, data: unknown, opts?: { locale?: string }) => Promise<void>;
  doValidate?: (data: unknown, schema: unknown) => Promise<ValidationResult>;
  doLoadSchema?: () => Promise<unknown>;
  outPath?: string;
  /** Where CLICKUP_API_TOKEN is read (default process.env). */
  env?: NodeJS.ProcessEnv;
}

const STRATEGIES: EstimationStrategy[] = [
  "story_points",
  "fibonacci",
  "planning_poker",
  "affinity",
  "t_shirt",
  "ideal_days",
  "ideal_hours",
  "three_point",
];
const SCALE_STRATEGIES = new Set<unknown>(["fibonacci", "story_points", "planning_poker"]);

const ERROR_KEYS: Record<ClickUpInitErrorCode, string> = {
  AUTH: "initErrorAuth",
  RATE_LIMIT: "initErrorRateLimit",
  HTTP: "initErrorHttp",
  NETWORK: "initErrorNetwork",
  PARSE: "initErrorResponse",
  INVALID_ID: "initErrorResponse",
  NOT_FOUND: "initErrorWorkspace",
};

const readJson = async (rel: string): Promise<unknown> =>
  JSON.parse(await readFile(path.join(ROOT, rel), "utf8")) as unknown;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Run a discovery call; an init error becomes its localized message (no token, no body). */
async function discover<T>(s: StringsTable, read: () => T | Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (e) {
    if (!(e instanceof ClickUpInitError)) throw e;
    throw new Error(interpolate(s[ERROR_KEYS[e.code]], { status: e.status ?? "?" }));
  }
}

/** Refuse a string that is too long or holds a control character (API data reaches a file). */
function sanitize<T>(value: T): T {
  if (typeof value === "string") {
    if (value.length > 1024 || [...value].some((c) => c < " " || c === "\x7f")) {
      throw new Error(
        `pm-tasks-clickup init: refusing to persist unsafe config value ${JSON.stringify(value.slice(0, 40))}`,
      );
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitize) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)])) as T;
  }
  return value;
}

/** `Space › Folder › List`; a folderless list has no folder part. */
const listLabel = (l: ClickUpListSummary): string =>
  [l.space.name, l.folder?.name, l.name].filter(Boolean).join(" › ");

/**
 * Unique lowercase ASCII slugs of the names (`-2`, `-3` on collisions). "me" is
 * the caller's built-in alias, and a digit alias would read as a user id.
 */
function withAliases(members: ClickUpMember[]) {
  const used = new Set(["me"]);
  return members.map((m) => {
    const slug = aliasOf(m.name);
    const base = /^\d*$/.test(slug) ? `member-${m.id}` : slug;
    let alias = base;
    for (let n = 2; used.has(alias); n++) alias = `${base}-${n}`;
    used.add(alias);
    return { id: m.id, name: m.name, ...(m.email ? { email: m.email } : {}), alias };
  });
}

export async function runInit(deps: InitDeps = {}): Promise<Record<string, unknown>> {
  registerI18nRoot(I18N, path.join(ROOT, "i18n"));
  // Credentials before any prompt: a terminal without them stops here.
  const token = deps.api || deps.mcp ? undefined : readClickUpToken(deps.env ?? process.env);
  if (!deps.api && !deps.mcp && token === undefined) {
    fail((await loadStrings(I18N, deps.locale ?? "en-US")).noCredentials);
  }

  const locale = deps.locale ?? (await promptLocale("core", { defaultLocale: "en-US" }));
  const s = await loadStrings(I18N, locale);
  const core = await loadStrings("core", locale);
  const pick: PickFn =
    deps.pick ?? ((label, choices, opts) => promptPick(label, choices, { ...opts, strings: core }));
  const select: MultiSelectFn =
    deps.multiSelect ?? ((label, choices) => multiSelect(label, choices, { strings: core }));
  const yesNo = deps.yesNo ?? ((q: string) => promptYesNo(q, { strings: core }));
  console.log(`\n${s.header}\n`);

  const api = await discover(
    s,
    () => deps.api ?? (deps.mcp ? createMcpInitApi(deps.mcp) : createRestInitApi(token ?? "")),
  );

  // Workspace: picked only when there is more than one.
  const workspaces = await discover(s, () => api.getWorkspaces());
  if (workspaces.length === 0) fail(s.noWorkspaceFound);
  const workspace =
    workspaces.length === 1
      ? workspaces[0]
      : await pick(
          s.workspacePrompt,
          workspaces.map((w) => ({ label: `${w.name} (${w.id})`, value: w })),
          { defaultIndex: 0 },
        );
  if (!workspace) fail(s.noWorkspace);

  const found = await discover(s, () => api.getLists(workspace.id));
  if (found.length === 0) fail(interpolate(s.noListsFound, { workspace: workspace.name }));
  const chosen = await select(
    s.listsPrompt,
    found.map((l) => ({ label: listLabel(l), value: l })),
  );
  if (chosen.length === 0) fail(s.noList);

  // Statuses pinned per list; a list that cannot pin open and done is skipped, never half-pinned.
  const lists: ClickUpListConfig[] = [];
  for (const list of new Set(chosen)) {
    // The full path: list names repeat across spaces and folders.
    const named = { list: listLabel(list) };
    const map = mapStatuses(await discover(s, () => api.getListStatuses(list.id)));
    if ("error" in map) {
      const key = map.error === "no_open_status" ? "listSkippedNoOpen" : "listSkippedNoDone";
      console.warn(interpolate(s[key], named));
      continue;
    }
    const wip =
      map.wipCandidates.length === 0
        ? null
        : await pick(
            interpolate(s.wipStatusPrompt, named),
            map.wipCandidates.map((c) => ({ label: c, value: c })),
            { defaultIndex: 0 },
          );
    if (wip === null) console.warn(interpolate(s.noWipStatus, named));
    lists.push({
      id: list.id,
      name: list.name,
      ...(list.space.name ? { space: list.space.name } : {}),
      ...(list.folder?.name ? { folder: list.folder.name } : {}),
      statuses: {
        open: map.open,
        ...(wip !== null ? { wip } : {}),
        done: map.done,
        ...(map.closed !== undefined ? { closed: map.closed } : {}),
      },
    });
  }
  if (lists.length === 0) fail(s.noUsableList);

  const members = (await yesNo(s.membersPrompt))
    ? withAliases(await discover(s, () => api.getMembers(workspace.id)))
    : [];

  const strategy = await pick<EstimationStrategy | null>(
    s.strategyPrompt,
    [{ label: s.noEstimation, value: null }, ...STRATEGIES.map((v) => ({ label: v, value: v }))],
    { defaultIndex: 0 },
  );
  let estimation: Record<string, unknown> | undefined;
  if (strategy) {
    const clickupTarget = TIME_STRATEGIES.has(strategy)
      ? ((await pick(
          s.targetPromptTime,
          [
            { label: s.targetTime, value: "time" },
            { label: s.targetNone, value: "none" },
          ],
          { defaultIndex: 0 },
        )) ?? "time")
      : "none";
    estimation = {
      strategy,
      clickupTarget,
      enabled: true,
      ...(SCALE_STRATEGIES.has(strategy) ? { scale: [1, 2, 3, 5, 8, 13] } : {}),
      ...(strategy === "t_shirt" ? { sizeMap: { XS: 1, S: 2, M: 3, L: 5, XL: 8 } } : {}),
    };
  }

  // Written disabled on purpose: the user turns autonomous mode on deliberately.
  const autonomous = (await yesNo(s.autonomousPrompt))
    ? {
        enabled: false,
        allow: ((await readJson("manifest.json")) as { verbs: string[] }).verbs,
        scope: { lists: lists.map((l) => l.id) },
        rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
        auditLog: "./logs/clickup/audit.log",
      }
    : undefined;

  const config: Record<string, unknown> = {
    version: "1",
    locale,
    workspace: { id: workspace.id, name: workspace.name },
    lists,
    defaultListId: lists[0].id,
    ...(members.length > 0 ? { members } : {}),
    ...(estimation ? { estimation } : {}),
    ...(autonomous ? { autonomous } : {}),
  };

  const schema = await (deps.doLoadSchema ?? (() => readJson("schemas/config.json")))();
  const valid = await (deps.doValidate ?? validateConfig)(config, schema);
  if (!valid.ok) {
    fail(
      `pm-tasks-clickup init: config validation failed: ${JSON.stringify(valid.errors, null, 2)}`,
    );
  }

  const safe = sanitize(config);
  const outPath = deps.outPath ?? path.resolve(process.cwd(), ".clickup.json");
  await (deps.doWrite ?? writeConfig)(outPath, safe, { locale });
  printInstructions([
    interpolate(s.configWritten, { path: outPath }),
    ...(autonomous ? [s.nextAutonomous] : []),
    s.nextDoctor,
  ]);
  return safe;
}
