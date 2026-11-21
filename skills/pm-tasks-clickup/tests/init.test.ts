import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DoctorContext } from "@llodev/pm-tasks-core/doctor";
import { interpolate, validateConfig, type Choice } from "@llodev/pm-tasks-core/init-lib";
import { createAdapter } from "../src/adapter.js";
import { makeClickUpChecks, runDoctor } from "../src/doctor-cli.js";
import { stripEnvQuotes as envStripEnvQuotes } from "../src/env.js";
import {
  ClickUpInitError,
  createMcpInitApi,
  type ClickUpInitApi,
  type ClickUpInitErrorCode,
  type ClickUpMember,
} from "../src/init-api.js";
import {
  runInit,
  stripEnvQuotes,
  type InitDeps,
  type MultiSelectFn,
  type PickFn,
} from "../src/init-flow.js";
import type { ClickUpStatus } from "../src/status-map.js";
import { makeMcp, mcpFixture, type ResponseFn } from "./helpers/mcp-stub.js";

type Json = Record<string, unknown>;

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readPkgJson = (rel: string): Json =>
  JSON.parse(readFileSync(path.join(PKG, rel), "utf8")) as Json;
const restFixture = (name: string): unknown => readPkgJson(`tests/fixtures/rest/${name}.json`);

const EN = readPkgJson("i18n/en-US.json") as Record<string, string>;
const PT = readPkgJson("i18n/pt-BR.json") as Record<string, string>;
const ES = readPkgJson("i18n/es-ES.json") as Record<string, string>;
const SCHEMA = readPkgJson("schemas/config.json");
const MANIFEST_VERBS = readPkgJson("manifest.json").verbs as string[];

// A synthetic token (no `pk_<id>_` shape, so secret scanners stay quiet).
const FAKE_TOKEN = "fake-clickup-token-NOT-REAL-9d2e41";

// Ids of the sanitized Task 0a/0b captures.
const WS = "90130000001";
const SPACE = "901310000001";
const LIST_A = "1000400000000002"; // sandbox-a, in the folder pm-tasks-sandbox
const LIST_B = "1000400000000003"; // sandbox-b, same folder
const LIST_C = "901330000001"; // folderless ("List" in the MCP capture, "List 1" in REST)

/** How init names each captured list (MCP capture) in its prompts and warnings. */
const LABEL: Record<string, string> = {
  "sandbox-a": "Space 1 › pm-tasks-sandbox › sandbox-a",
  "sandbox-b": "Space 1 › pm-tasks-sandbox › sandbox-b",
  List: "Space 1 › List",
};

/** The statuses of every captured list, as `getListStatuses` returns them. */
const FIXTURE_PINS = { open: "to do", done: "complete", closed: "cancelled" };
const FIXTURE_CUSTOM = ["planning", "in progress", "at risk", "update required", "on hold"];

const st = (status: string, type: ClickUpStatus["type"], orderindex: number): ClickUpStatus => ({
  status,
  type,
  orderindex,
});

class Exit extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

let dir: string;
let outPath: string;
let output: string[];
let fetchSpy: ReturnType<typeof blockFetch>;

/** A fetch spy that never reaches the network. */
function blockFetch() {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in tests"));
}

// Hermetic by default: a fake token sits in process.env (as in the maintainer's
// shell), fetch never reaches the network, and process.exit throws instead.
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "clk-init-"));
  outPath = path.join(dir, ".clickup.json");
  output = [];
  vi.stubEnv("CLICKUP_API_TOKEN", FAKE_TOKEN);
  vi.stubEnv("LLODEV_PM_TASKS_LOG_DIR", path.join(dir, "logs"));
  fetchSpy = blockFetch();
  for (const method of ["log", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      output.push(args.map(String).join(" "));
    });
  }
  vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
    throw new Exit(code == null ? undefined : Number(code));
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const printed = (): string => output.join("\n");

async function exists(file: string): Promise<boolean> {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function written(): Promise<Json> {
  return JSON.parse(await readFile(outPath, "utf8")) as Json;
}

// ---------------------------------------------------------------------------
// Discovery stubs built from the captures
// ---------------------------------------------------------------------------

function fixtureMcp(overrides: Array<[string, unknown]> = []) {
  return makeMcp(
    new Map<string, unknown>([
      ["clickup_get_workspace_hierarchy", mcpFixture("clickup_get_workspace_hierarchy")],
      ["clickup_get_list", mcpFixture("clickup_get_list.a")],
      ["clickup_get_workspace_members", mcpFixture("clickup_get_workspace_members")],
      ...overrides,
    ]),
  );
}

/** The MCP-backed discovery of the captured workspace, with methods overridden per test. */
function fixtureApi(overrides: Partial<ClickUpInitApi> = {}): ClickUpInitApi {
  return { ...createMcpInitApi(fixtureMcp().mcp), ...overrides };
}

const REST_BASE = "https://api.clickup.com/api/v2";
const REST_ROUTES: Record<string, unknown> = {
  "/team": restFixture("workspaces"),
  [`/team/${WS}/space`]: restFixture("spaces"),
  [`/space/${SPACE}/folder`]: restFixture("folders.populated"),
  [`/space/${SPACE}/list`]: restFixture("folderless-lists"),
  [`/list/${LIST_A}`]: restFixture("list"),
  [`/list/${LIST_B}`]: restFixture("list"),
  [`/list/${LIST_C}`]: restFixture("list"),
};

/** A fake ClickUp REST API serving the Task 0a captures. */
async function restFetch(input: string | URL | Request): Promise<Response> {
  const body = REST_ROUTES[String(input).replace(REST_BASE, "")];
  return body === undefined
    ? new Response("{}", { status: 404 })
    : new Response(JSON.stringify(body), { status: 200 });
}

// ---------------------------------------------------------------------------
// Scripted prompts
// ---------------------------------------------------------------------------

interface Script {
  /** Label prefix of the workspace to pick (default: the prompt's default). */
  workspace?: string;
  /** Names of the lists to select (default: every list). */
  lists?: readonly string[];
  /** wip status per list name (default: the prompt's default); null answers no choice. */
  wip?: Record<string, string | null>;
  /** Estimation strategy; null is the "none" choice (default: the prompt's default). */
  strategy?: string | null;
  target?: "time" | "none";
  members?: boolean;
  autonomous?: boolean;
}

function prompts(script: Script = {}) {
  const asked: string[] = [];
  /** Choice labels offered per prompt label. */
  const offered = new Map<string, string[]>();

  const choose = <T>(choices: Choice<T>[], want: unknown): T | null =>
    choices.find((c) => (c.value as unknown) === want || c.label === want)?.value ?? null;

  const pick: PickFn = async (label, choices, opts) => {
    asked.push(label);
    offered.set(
      label,
      choices.map((c) => c.label),
    );
    const byDefault = choices[opts?.defaultIndex ?? 0]?.value ?? null;
    if (label === EN.workspacePrompt && script.workspace !== undefined) {
      return choices.find((c) => c.label.startsWith(script.workspace as string))?.value ?? null;
    }
    if (label === EN.strategyPrompt && script.strategy !== undefined) {
      return choose(choices, script.strategy);
    }
    if (label === EN.targetPromptTime && script.target !== undefined) {
      return choose(choices, script.target);
    }
    for (const [name, wip] of Object.entries(script.wip ?? {})) {
      if (label === interpolate(EN.wipStatusPrompt, { list: LABEL[name] })) {
        return wip === null ? null : choose(choices, wip);
      }
    }
    return byDefault;
  };

  const multiSelect: MultiSelectFn = async (label, choices) => {
    asked.push(label);
    offered.set(
      label,
      choices.map((c) => c.label),
    );
    const names = script.lists;
    return names === undefined
      ? choices.map((c) => c.value)
      : names.flatMap((n) =>
          choices.filter((c) => (c.value as { name: string }).name === n).map((c) => c.value),
        );
  };

  const yesNo = async (question: string): Promise<boolean> => {
    asked.push(question);
    if (question === EN.membersPrompt) return script.members === true;
    if (question === EN.autonomousPrompt) return script.autonomous === true;
    throw new Error(`unexpected yes/no question: ${question}`);
  };

  return { pick, multiSelect, yesNo, asked, offered };
}

/** Deps for an en-US run on the captured workspace; the real schema, validator and writer. */
function setup(script: Script = {}, overrides: Partial<InitDeps> = {}) {
  const p = prompts(script);
  const deps: InitDeps = {
    api: fixtureApi(),
    locale: "en-US",
    outPath,
    env: {},
    pick: p.pick,
    multiSelect: p.multiSelect,
    yesNo: p.yesNo,
    ...overrides,
  };
  return { ...p, deps };
}

// ---------------------------------------------------------------------------
// The written config
// ---------------------------------------------------------------------------

describe("runInit: the written config", () => {
  it("writes a config that validates and pins statuses per list", async () => {
    const { deps } = setup({ lists: ["sandbox-a"], wip: { "sandbox-a": "in progress" } });
    const out = await runInit(deps);

    const file = await written();
    expect(file).toEqual(out);
    expect(file).toEqual({
      version: "1",
      locale: "en-US",
      workspace: { id: WS, name: "Workspace" },
      lists: [
        {
          id: LIST_A,
          name: "sandbox-a",
          space: "Space 1",
          folder: "pm-tasks-sandbox",
          statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
        },
      ],
      defaultListId: LIST_A,
    });
    expect(await validateConfig(file, SCHEMA)).toEqual({ ok: true });
    for (const key of ["$schema", "sprints", "defaults", "members", "estimation", "autonomous"]) {
      expect(file, key).not.toHaveProperty(key);
    }
    expect(printed()).toContain(interpolate(EN.configWritten, { path: outPath }));
    expect(printed()).toContain(EN.nextDoctor);
  });

  it("offers lists as Space › Folder › List, without ClickUp's hidden container", async () => {
    const { deps, offered } = setup();
    const out = await runInit(deps);
    expect(offered.get(EN.listsPrompt)).toEqual([
      "Space 1 › pm-tasks-sandbox › sandbox-a",
      "Space 1 › pm-tasks-sandbox › sandbox-b",
      "Space 1 › List",
    ]);
    const lists = out.lists as Json[];
    expect(lists.map((l) => l.id)).toEqual([LIST_A, LIST_B, LIST_C]);
    expect(lists[2]).toEqual({
      id: LIST_C,
      name: "List",
      space: "Space 1",
      statuses: { ...FIXTURE_PINS, wip: "planning" },
    });
  });

  it("asks for wip among the custom statuses", async () => {
    const { deps, offered } = setup({ lists: ["sandbox-a"], wip: { "sandbox-a": "on hold" } });
    const out = await runInit(deps);
    expect(offered.get(interpolate(EN.wipStatusPrompt, { list: LABEL["sandbox-a"] }))).toEqual(
      FIXTURE_CUSTOM,
    );
    expect((out.lists as Json[])[0].statuses).toEqual({ ...FIXTURE_PINS, wip: "on hold" });
  });

  it("a list without custom statuses omits wip and warns", async () => {
    const api = fixtureApi({
      getListStatuses: async () => [st("to do", "open", 0), st("complete", "done", 1)],
    });
    const { deps, asked } = setup({ lists: ["sandbox-a"] }, { api });
    const out = await runInit(deps);
    expect((out.lists as Json[])[0].statuses).toEqual({ open: "to do", done: "complete" });
    expect(asked.some((q) => q.startsWith("Select the in-progress status"))).toBe(false);
    expect(printed()).toContain(interpolate(EN.noWipStatus, { list: LABEL["sandbox-a"] }));
  });

  it("done falls back to the closed status", async () => {
    const api = fixtureApi({
      getListStatuses: async () => [st("Open", "open", 0), st("Closed", "closed", 1)],
    });
    const { deps } = setup({ lists: ["sandbox-a"] }, { api });
    const out = await runInit(deps);
    expect((out.lists as Json[])[0].statuses).toEqual({ open: "Open", done: "Closed" });
    expect(await validateConfig(out, SCHEMA)).toEqual({ ok: true });
  });

  it("localized status names are written verbatim", async () => {
    const api = fixtureApi({
      getListStatuses: async () => [
        st("A Fazer", "open", 0),
        st("em andamento", "custom", 1),
        st("Em Revisão", "custom", 2),
        st("concluído", "done", 3),
        st("Arquivado ", "closed", 4),
      ],
    });
    const { deps } = setup({ lists: ["sandbox-a"], wip: { "sandbox-a": "Em Revisão" } }, { api });
    const out = await runInit(deps);
    expect((out.lists as Json[])[0].statuses).toEqual({
      open: "A Fazer",
      wip: "Em Revisão",
      done: "concluído",
      closed: "Arquivado ",
    });
  });

  it("multiple lists keep separate status maps", async () => {
    const localized = {
      id: LIST_B,
      name: "sandbox-b",
      statuses: [
        { status: "Pendente", type: "open", orderindex: 0 },
        { status: "Fazendo", type: "custom", orderindex: 1 },
        { status: "Feito", type: "done", orderindex: 2 },
      ],
    };
    const getList: ResponseFn = (args) =>
      args.list_id === LIST_A ? mcpFixture("clickup_get_list.a") : localized;
    const { mcp, calls } = fixtureMcp([["clickup_get_list", getList]]);
    const { deps } = setup(
      { lists: ["sandbox-a", "sandbox-b"], wip: { "sandbox-a": "in progress" } },
      { api: undefined, mcp },
    );
    const out = await runInit(deps);
    expect(out.lists).toEqual([
      expect.objectContaining({
        id: LIST_A,
        statuses: { ...FIXTURE_PINS, wip: "in progress" },
      }),
      expect.objectContaining({
        id: LIST_B,
        statuses: { open: "Pendente", wip: "Fazendo", done: "Feito" },
      }),
    ]);
    expect(out.defaultListId).toBe(LIST_A);
    expect(calls.filter((c) => c.tool === "clickup_get_list").map((c) => c.args)).toEqual([
      { list_id: LIST_A },
      { list_id: LIST_B },
    ]);
  });

  it.each([
    [
      "no_open_status",
      [st("in progress", "custom", 0), st("complete", "done", 1)],
      "listSkippedNoOpen",
    ],
    [
      "no_done_status",
      [st("to do", "open", 0), st("in progress", "custom", 1)],
      "listSkippedNoDone",
    ],
  ] as const)(
    "a list whose statuses cannot be mapped (%s) is skipped with a warning, never half-pinned",
    async (_reason, broken, key) => {
      const api = fixtureApi({
        getListStatuses: async (id) =>
          id === LIST_A ? [...broken] : createMcpInitApi(fixtureMcp().mcp).getListStatuses(id),
      });
      const { deps } = setup({ lists: ["sandbox-a", "sandbox-b"] }, { api });
      const out = await runInit(deps);
      expect((out.lists as Json[]).map((l) => l.id)).toEqual([LIST_B]);
      expect(out.defaultListId).toBe(LIST_B);
      expect(printed()).toContain(interpolate(EN[key], { list: LABEL["sandbox-a"] }));
    },
  );

  it("exits 1 when no chosen list can be pinned, and writes nothing", async () => {
    const api = fixtureApi({ getListStatuses: async () => [st("to do", "open", 0)] });
    const { deps } = setup({ lists: ["sandbox-a", "List"] }, { api });
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain(EN.noUsableList);
    expect(await exists(outPath)).toBe(false);
  });

  it("a list selected twice is written once", async () => {
    const twice: MultiSelectFn = async (_label, choices) => [choices[0].value, choices[0].value];
    const { deps } = setup({}, { multiSelect: twice });
    const out = await runInit(deps);
    expect((out.lists as Json[]).map((l) => l.id)).toEqual([LIST_A]);
  });
});

// ---------------------------------------------------------------------------
// Workspace and list selection
// ---------------------------------------------------------------------------

describe("runInit: workspace and lists", () => {
  it("a single workspace is selected without asking", async () => {
    const { deps, asked } = setup({ lists: ["sandbox-a"] });
    const out = await runInit(deps);
    expect(out.workspace).toEqual({ id: WS, name: "Workspace" });
    expect(asked).not.toContain(EN.workspacePrompt);
  });

  it("several workspaces are offered in a pick", async () => {
    const base = fixtureApi();
    const getLists = vi.fn(base.getLists);
    const api: ClickUpInitApi = {
      ...base,
      getWorkspaces: async () => [
        { id: "90130000009", name: "Other" },
        { id: WS, name: "Workspace" },
      ],
      getLists,
    };
    const { deps, offered } = setup({ workspace: "Workspace", lists: ["sandbox-a"] }, { api });
    const out = await runInit(deps);
    expect(offered.get(EN.workspacePrompt)).toEqual(["Other (90130000009)", `Workspace (${WS})`]);
    expect(out.workspace).toEqual({ id: WS, name: "Workspace" });
    expect(getLists).toHaveBeenCalledWith(WS);
  });

  it("no workspace picked exits 1 with a message", async () => {
    const api = fixtureApi({
      getWorkspaces: async () => [
        { id: "90130000009", name: "Other" },
        { id: WS, name: "Workspace" },
      ],
    });
    const { deps } = setup({ workspace: "Nope" }, { api });
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain(EN.noWorkspace);
    expect(await exists(outPath)).toBe(false);
  });

  it("credentials that see no workspace exit 1 with a localized message", async () => {
    const { deps } = setup({}, { api: fixtureApi({ getWorkspaces: async () => [] }) });
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain(EN.noWorkspaceFound);
  });

  it("the no-workspace message points at the token only, in every locale", () => {
    expect(EN.noWorkspaceFound).toBe(
      "These credentials see no ClickUp workspace. Check the token, then run init again.",
    );
    for (const strings of [EN, PT, ES]) expect(strings.noWorkspaceFound).not.toMatch(/MCP/);
  });

  it("a workspace with no lists exits 1 with a localized message", async () => {
    const api = fixtureApi({ getLists: async () => [] });
    const { deps } = setup({}, { api, locale: "pt-BR" });
    // pt-BR prompts carry pt-BR labels; none is reached before the exit.
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain(interpolate(PT.noListsFound, { workspace: "Workspace" }));
    expect(await exists(outPath)).toBe(false);
  });

  it("user cancels (empty multiSelect): exit 1 with a message, nothing written", async () => {
    const { deps, asked } = setup({ lists: [] });
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain(EN.noList);
    expect(asked).toEqual([EN.listsPrompt]);
    expect(await exists(outPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Members, estimation, autonomous
// ---------------------------------------------------------------------------

describe("runInit: members", () => {
  it("members are cached only when accepted", async () => {
    const declined = fixtureMcp();
    const first = setup({ lists: ["sandbox-a"] }, { api: undefined, mcp: declined.mcp });
    const without = await runInit(first.deps);
    expect(without).not.toHaveProperty("members");
    expect(declined.calls.map((c) => c.tool)).not.toContain("clickup_get_workspace_members");

    await rm(outPath);
    const accepted = fixtureMcp();
    const second = setup(
      { lists: ["sandbox-a"], members: true },
      { api: undefined, mcp: accepted.mcp },
    );
    const withMembers = await runInit(second.deps);
    expect(withMembers.members).toEqual([
      { id: "100000001", name: "Person 1", email: "user@example.com", alias: "person-1" },
      { id: "100000002", name: "Person 2", email: "user@example.com", alias: "person-2" },
    ]);
    for (const m of withMembers.members as Json[]) expect(typeof m.id).toBe("string");
    expect(await validateConfig(withMembers, SCHEMA)).toEqual({ ok: true });
  });

  it("member aliases are unique lowercase ASCII slugs", async () => {
    const people: ClickUpMember[] = [
      { id: "201", name: "João Silva" },
      { id: "202", name: "Joao  Silva" },
      { id: "203", name: "JOÃO SILVA" },
      { id: "204", name: "Me" },
      { id: "205", name: "日本" },
      { id: "206", name: "007" },
    ];
    const api = fixtureApi({ getMembers: async () => people });
    const { deps } = setup({ lists: ["sandbox-a"], members: true }, { api });
    const out = await runInit(deps);
    const aliases = (out.members as Json[]).map((m) => m.alias);
    expect(aliases).toEqual([
      "joao-silva",
      "joao-silva-2",
      "joao-silva-3",
      "me-2", // "me" is the built-in alias of the caller
      "member-205", // nothing ASCII to slug
      "member-206", // a digit alias would read as a user id
    ]);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect((out.members as Json[]).every((m) => !("email" in m))).toBe(true);
  });
});

describe("runInit: estimation", () => {
  it("the none choice is the default and writes no estimation block", async () => {
    const { deps, offered, asked } = setup({ lists: ["sandbox-a"] });
    const out = await runInit(deps);
    expect(out).not.toHaveProperty("estimation");
    expect(offered.get(EN.strategyPrompt)?.[0]).toBe(EN.noEstimation);
    expect(offered.get(EN.strategyPrompt)).toHaveLength(9);
    expect(asked).not.toContain(EN.targetPromptTime);
  });

  it.each([
    ["ideal_hours", { clickupTarget: "time" }, true],
    ["ideal_days", { clickupTarget: "time" }, true],
    ["fibonacci", { clickupTarget: "none", scale: [1, 2, 3, 5, 8, 13] }, false],
    ["story_points", { clickupTarget: "none", scale: [1, 2, 3, 5, 8, 13] }, false],
    ["t_shirt", { clickupTarget: "none", sizeMap: { XS: 1, S: 2, M: 3, L: 5, XL: 8 } }, false],
    ["three_point", { clickupTarget: "none" }, false],
  ] as const)(
    "estimation target defaults follow the strategy (%s)",
    async (strategy, expected, asksTarget) => {
      const { deps, asked } = setup({ lists: ["sandbox-a"], strategy });
      const out = await runInit(deps);
      expect(out.estimation).toEqual({ strategy, enabled: true, ...expected });
      expect(out.estimation).not.toHaveProperty("hoursPerDay");
      expect(asked.includes(EN.targetPromptTime)).toBe(asksTarget);
      expect(await validateConfig(out, SCHEMA)).toEqual({ ok: true });
    },
  );

  it("the target prompt can keep a time strategy as a tag only", async () => {
    const { deps } = setup({ lists: ["sandbox-a"], strategy: "ideal_hours", target: "none" });
    const out = await runInit(deps);
    expect(out.estimation).toEqual({
      strategy: "ideal_hours",
      clickupTarget: "none",
      enabled: true,
    });
  });
});

describe("runInit: autonomous", () => {
  it("autonomous block defaults to enabled:false with scope.lists", async () => {
    const { deps } = setup({ lists: ["sandbox-a", "List"], autonomous: true });
    const out = await runInit(deps);
    expect(out.autonomous).toEqual({
      enabled: false,
      allow: MANIFEST_VERBS,
      scope: { lists: [LIST_A, LIST_C] },
      rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
      auditLog: "./logs/clickup/audit.log",
    });
    expect(MANIFEST_VERBS).toHaveLength(9);
    expect(printed()).toContain(EN.nextAutonomous);
    expect(await validateConfig(out, SCHEMA)).toEqual({ ok: true });
  });

  it("autonomous is absent when declined", async () => {
    const { deps } = setup({ lists: ["sandbox-a"], autonomous: false });
    const out = await runInit(deps);
    expect(out).not.toHaveProperty("autonomous");
    expect(printed()).not.toContain(EN.nextAutonomous);
  });
});

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

describe("runInit: credentials", () => {
  it("no credentials exits 1 and the message names CLICKUP_API_TOKEN and the MCP", async () => {
    // process.env holds a token (beforeEach); deps.env {} must win, so fetch stays unused.
    expect(process.env.CLICKUP_API_TOKEN).toBe(FAKE_TOKEN);
    const { deps, asked } = setup({}, { api: undefined, env: {} });
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain(EN.noCredentials);
    expect(printed()).toContain("CLICKUP_API_TOKEN");
    expect(printed()).toContain("MCP");
    expect(printed()).not.toContain(FAKE_TOKEN);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(asked).toEqual([]);
    expect(await exists(outPath)).toBe(false);
  });

  it("the pt-BR no-credentials message says em uma sessão", () => {
    expect(PT.noCredentials).toContain("em uma sessão de agente");
    expect(PT.noCredentials).not.toContain("numa");
  });

  it("an injected api wins over mcp and the token", async () => {
    const { mcp, calls } = fixtureMcp();
    const { deps } = setup(
      { lists: ["sandbox-a"] },
      { mcp, env: { CLICKUP_API_TOKEN: FAKE_TOKEN } },
    );
    await runInit(deps);
    expect(calls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("an injected mcp wins over the token and discovers through the ClickUp MCP tools", async () => {
    const { mcp, calls } = fixtureMcp();
    const { deps } = setup(
      { lists: ["sandbox-a"], members: true },
      { api: undefined, mcp, env: { CLICKUP_API_TOKEN: FAKE_TOKEN } },
    );
    const out = await runInit(deps);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(calls.map((c) => c.tool)).toEqual([
      "clickup_get_workspace_hierarchy",
      "clickup_get_workspace_hierarchy",
      "clickup_get_list",
      "clickup_get_workspace_members",
    ]);
    expect(out.workspace).toEqual({ id: WS, name: "Workspace" });
  });

  it("the token path reads CLICKUP_API_TOKEN from deps.env, unquoted, and sends it raw", async () => {
    fetchSpy.mockImplementation(restFetch);
    const { deps } = setup(
      { lists: ["sandbox-a", "List 1"] },
      { api: undefined, env: { CLICKUP_API_TOKEN: ` "${FAKE_TOKEN}" ` } },
    );
    const out = await runInit(deps);
    expect(fetchSpy).toHaveBeenCalled();
    for (const [url, init] of fetchSpy.mock.calls) {
      expect(String(url).startsWith(`${REST_BASE}/`)).toBe(true);
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({ Authorization: FAKE_TOKEN });
    }
    expect(out).toMatchObject({
      workspace: { id: WS, name: "Workspace" },
      lists: [
        { id: LIST_A, name: "sandbox-a", folder: "pm-tasks-sandbox" },
        { id: LIST_C, name: "List 1", space: "Space 1", statuses: FIXTURE_PINS },
      ],
    });
    expect(out.lists as Json[]).toHaveLength(2);
    expect((out.lists as Json[])[1]).not.toHaveProperty("folder");
  });

  it("stripEnvQuotes is the env.ts helper, re-exported", () => {
    expect(stripEnvQuotes).toBe(envStripEnvQuotes);
    expect(stripEnvQuotes('"abc"')).toBe("abc");
  });
});

// ---------------------------------------------------------------------------
// Token hygiene and init errors
// ---------------------------------------------------------------------------

/** Every way an error could surface its text. */
function errorText(e: unknown): string {
  const err = e as Error;
  return [err.message, String(err), err.stack ?? "", JSON.stringify(err)].join("\n");
}

describe("runInit: token hygiene", () => {
  it("the written config and stdout never contain the token value", async () => {
    fetchSpy.mockImplementation(restFetch);
    const { deps } = setup(
      { members: true, strategy: "ideal_hours", autonomous: true },
      { api: undefined, env: { CLICKUP_API_TOKEN: FAKE_TOKEN } },
    );
    await runInit(deps);
    expect(await readFile(outPath, "utf8")).not.toContain(FAKE_TOKEN);
    expect(printed()).not.toContain(FAKE_TOKEN);
    expect(printed()).toContain(interpolate(EN.configWritten, { path: outPath }));
  });

  it.each([
    [
      "a 401 whose body echoes the token",
      async () => new Response(`{"err":"bad token ${FAKE_TOKEN}"}`, { status: 401 }),
      "initErrorAuth",
    ],
    [
      "a 500 whose body echoes the token",
      async () => new Response(`{"err":"${FAKE_TOKEN}"}`, { status: 500 }),
      "initErrorHttp",
    ],
    [
      "a network error whose message echoes the token",
      async () => {
        throw new Error(`connect failed for ${FAKE_TOKEN}`);
      },
      "initErrorNetwork",
    ],
  ] as const)("a token in env never appears in a thrown error: %s", async (_case, answer, key) => {
    fetchSpy.mockImplementation(answer);
    const { deps } = setup({}, { api: undefined, env: { CLICKUP_API_TOKEN: FAKE_TOKEN } });
    const error = await runInit(deps).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(interpolate(EN[key], { status: 500 }));
    expect(errorText(error)).not.toContain(FAKE_TOKEN);
    expect(printed()).not.toContain(FAKE_TOKEN);
    expect(await exists(outPath)).toBe(false);
  });

  it("a malformed token is reported without being echoed and without a request", async () => {
    const malformed = "fake token with spaces 7c1e";
    const { deps } = setup({}, { api: undefined, env: { CLICKUP_API_TOKEN: malformed } });
    const error = await runInit(deps).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect((error as Error).message).toBe(EN.initErrorAuth);
    expect(errorText(error)).not.toContain(malformed);
    expect(printed()).not.toContain(malformed);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("runInit: init errors are localized", () => {
  it("an AUTH init error is reported in the chosen locale, without the token", async () => {
    const api = fixtureApi({
      getWorkspaces: async () => {
        throw new ClickUpInitError("AUTH", "ClickUp init: authentication failed (HTTP 401).", 401);
      },
    });
    const { deps } = setup({}, { api, locale: "pt-BR", env: { CLICKUP_API_TOKEN: FAKE_TOKEN } });
    const error = await runInit(deps).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect((error as Error).message).toBe(PT.initErrorAuth);
    expect(PT.initErrorAuth).toContain("CLICKUP_API_TOKEN");
    expect(errorText(error)).not.toContain(FAKE_TOKEN);
  });

  it.each([
    ["RATE_LIMIT", 429, "initErrorRateLimit"],
    ["HTTP", 502, "initErrorHttp"],
    ["NETWORK", undefined, "initErrorNetwork"],
    ["PARSE", undefined, "initErrorResponse"],
    ["INVALID_ID", undefined, "initErrorResponse"],
    ["NOT_FOUND", undefined, "initErrorWorkspace"],
  ] as const)("%s maps to %s", async (code, status, key) => {
    const api = fixtureApi({
      getMembers: async () => {
        throw new ClickUpInitError(code as ClickUpInitErrorCode, "English detail", status);
      },
    });
    const { deps } = setup({ lists: ["sandbox-a"], members: true }, { api });
    await expect(runInit(deps)).rejects.toThrow(interpolate(EN[key], { status: status ?? "" }));
    expect(await exists(outPath)).toBe(false);
  });

  it("an MCP error that is not an init error is rethrown as is", async () => {
    const { mcp } = fixtureMcp([["clickup_get_workspace_hierarchy", new Error("MCP down")]]);
    const { deps } = setup({}, { api: undefined, mcp });
    await expect(runInit(deps)).rejects.toThrow("MCP down");
  });
});

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

describe("runInit: writing", () => {
  it("existing config uses the core overwrite UX", async () => {
    // Non-interactive (no TTY in tests): core's writeConfig refuses and keeps the file.
    await writeFile(outPath, "{}\n", "utf8");
    const { deps } = setup({ lists: ["sandbox-a"] });
    await expect(runInit(deps)).rejects.toThrow(/already exists/);
    expect(await readFile(outPath, "utf8")).toBe("{}\n");

    // The writer gets the chosen locale, so the overwrite prompt is localized.
    const doWrite = vi.fn<NonNullable<InitDeps["doWrite"]>>(async () => undefined);
    const pt = setup(
      { lists: ["sandbox-a"] },
      { locale: "pt-BR", doWrite, yesNo: async () => false },
    );
    await runInit(pt.deps);
    expect(doWrite).toHaveBeenCalledWith(outPath, expect.objectContaining({ locale: "pt-BR" }), {
      locale: "pt-BR",
    });
  });

  it("refuses to persist a value with a control character", async () => {
    const base = fixtureApi();
    const api: ClickUpInitApi = {
      ...base,
      getLists: async (ws) =>
        (await base.getLists(ws)).map((l) => ({ ...l, name: `${l.name}\u0007` })),
    };
    const { deps } = setup({}, { api });
    await expect(runInit(deps)).rejects.toThrow(/unsafe config value/);
    expect(await exists(outPath)).toBe(false);
  });

  it("a config the schema rejects exits 1 and writes nothing", async () => {
    const { deps } = setup(
      { lists: ["sandbox-a"] },
      { doValidate: async () => ({ ok: false, errors: [{ instancePath: "/lists" }] }) },
    );
    await expect(runInit(deps)).rejects.toMatchObject({ code: 1 });
    expect(printed()).toContain("config validation failed");
    expect(await exists(outPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cross-checks: init → doctor → adapter
// ---------------------------------------------------------------------------

describe("init → doctor → adapter", () => {
  it.each([
    ["a minimal config", { lists: ["List"] }],
    [
      "a config with every optional block",
      { members: true, strategy: "ideal_hours", autonomous: true },
    ],
  ] as const)("%s written by init passes every static doctor check", async (_case, script) => {
    const { deps } = setup(script);
    await runInit(deps);

    let report = "";
    let code: number | undefined;
    await runDoctor(
      { tool: "clickup", argv: ["--config", outPath, "--json"] },
      {
        env: {},
        write: (text) => {
          report = text;
        },
        exit: (c) => {
          code = c;
        },
      },
    );
    const parsed = JSON.parse(report) as { results: Array<{ id: string; ok: boolean }> };
    expect(parsed.results.filter((r) => !r.ok)).toEqual([]);
    expect(parsed.results.map((r) => r.id)).toContain("C-CFG-1");
    expect(parsed.results.map((r) => r.id)).toContain("C-CLK-8");
    expect(code).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  const ALL_STRATEGIES = [
    "story_points",
    "fibonacci",
    "planning_poker",
    "affinity",
    "t_shirt",
    "ideal_days",
    "ideal_hours",
    "three_point",
  ] as const;

  it.each(ALL_STRATEGIES)(
    "init with the %s strategy writes a config the schema accepts and C-CLK-4 passes",
    async (strategy) => {
      const { deps, offered } = setup({ lists: ["sandbox-a"], strategy });
      const out = await runInit(deps);
      // Every strategy init offers is covered here.
      expect(offered.get(EN.strategyPrompt)?.slice(1).sort()).toEqual([...ALL_STRATEGIES].sort());
      expect(out.estimation).toMatchObject({ strategy, enabled: true });
      expect(await validateConfig(out, SCHEMA)).toEqual({ ok: true });

      const ctx: DoctorContext = {
        tool: "clickup",
        configPath: outPath,
        config: out,
        manifest: { tool: "clickup", verbs: MANIFEST_VERBS },
        schema: SCHEMA,
        auditLogPath: path.join(dir, "audit.log"),
        auditRotationMaxBytes: 10 * 1024 * 1024,
      };
      const estimationCheck = makeClickUpChecks().find((c) => c.id === "C-CLK-4");
      expect(await estimationCheck?.run(ctx)).toMatchObject({ ok: true });
    },
  );

  it("an adapter built from the written config moves a task to the pinned wip status", async () => {
    const { deps } = setup({ lists: ["sandbox-a"], wip: { "sandbox-a": "in progress" } });
    await runInit(deps);

    const { mcp, calls } = makeMcp(
      new Map<string, unknown>([
        ["clickup_get_task", mcpFixture("clickup_get_task.parent")],
        ["clickup_update_task", mcpFixture("clickup_update_task")],
      ]),
    );
    const runtime = await createAdapter({ configPath: outPath, mcp });
    expect(calls).toEqual([]);

    const result = await runtime.taskMove({ taskId: "t000000001", targetListOrSectionId: "wip" });
    expect(result).toMatchObject({
      ok: true,
      data: { previousListOrSectionId: "to do", newListOrSectionId: "in progress" },
    });
    const update = calls.find((c) => c.tool === "clickup_update_task");
    expect(update?.args).toMatchObject({
      task_id: "t000000001",
      status: "in progress",
      workspace_id: WS,
    });
  });
});
