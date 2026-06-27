// pm-tasks-jira init flow — library surface (no CLI side effects).
// The bin entry (bin/init.ts) is a thin shim that imports runFlow from here.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  promptPick,
  promptYesNo,
  writeConfig,
  validateConfig,
  printInstructions,
  type Choice,
  type PromptPickOptions,
  type ValidationResult,
} from "@llodev/pm-tasks-core/init-lib";

// dist/init-flow.js → package root is one level up.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadSchema(): Promise<unknown> {
  const raw = await readFile(path.join(ROOT, "schemas", "config.json"), "utf8");
  return JSON.parse(raw) as unknown;
}

// ---------------------------------------------------------------------------
// Atlassian MCP / REST response types
// ---------------------------------------------------------------------------

export interface AtlassianResource {
  id: string;
  name: string;
  url: string;
}

export interface JiraProject {
  key: string;
  name: string;
  simplified?: boolean;
}

export interface JiraIssueType {
  id: string;
  name: string;
}

export interface JiraFieldMeta {
  fields: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Dependency injection interface — enables unit testing with stubs
// ---------------------------------------------------------------------------

export interface JiraInitApi {
  getResources(): Promise<AtlassianResource[]>;
  getProjects(cloudId: string): Promise<JiraProject[]>;
  getIssueTypes(cloudId: string, projectKey: string): Promise<JiraIssueType[]>;
  getFieldMeta(cloudId: string, projectKey: string, issueTypeId: string): Promise<JiraFieldMeta>;
  getMe(cloudId: string): Promise<{ accountId: string; displayName: string }>;
}

export type PickFn = <T>(
  label: string,
  choices: Choice<T>[],
  opts?: PromptPickOptions<T>,
) => Promise<T | null>;

export interface InitDeps {
  /** Injected MCP/REST API implementation (required in tests via stubs) */
  api?: JiraInitApi;
  pick?: PickFn;
  yesNo?: (question: string) => Promise<boolean>;
  doWrite?: (targetPath: string, data: unknown) => Promise<void>;
  doValidate?: (data: unknown, schema: unknown) => Promise<ValidationResult>;
  doLoadSchema?: () => Promise<unknown>;
  outPath?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANONICAL_ISSUE_TYPES = ["epic", "story", "task", "subtask", "bug"] as const;

const JIRA_9_VERBS = [
  "task.create",
  "task.move",
  "checklist.check",
  "task.close",
  "task.due-date.set",
  "task.assignee.add",
  "task.comment.add",
  "task.parent.set",
  "task.estimate.set",
] as const;

const DEFAULT_FIBONACCI_SCALE = [1, 2, 3, 5, 8, 13];

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
// Production REST API (ATLASSIAN_API_TOKEN + ATLASSIAN_EMAIL env vars)
// ---------------------------------------------------------------------------

function createRestApi(token: string, email: string): JiraInitApi {
  const auth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

  async function atlFetch<T>(url: string): Promise<T> {
    const res = await globalThis.fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Atlassian API HTTP ${res.status} at ${url}`);
    return res.json() as Promise<T>;
  }

  return {
    getResources: async () => {
      return atlFetch<AtlassianResource[]>(
        "https://api.atlassian.com/oauth/token/accessible-resources",
      );
    },
    getProjects: async (cloudId) => {
      const data = await atlFetch<{ values: JiraProject[] }>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
      );
      return data.values;
    },
    getIssueTypes: async (cloudId, projectKey) => {
      return atlFetch<JiraIssueType[]>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issuetype/project?projectKey=${encodeURIComponent(projectKey)}`,
      );
    },
    getFieldMeta: async (cloudId, projectKey, issueTypeId) => {
      return atlFetch<JiraFieldMeta>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`,
      );
    },
    getMe: async (cloudId) => {
      return atlFetch<{ accountId: string; displayName: string }>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Main init flow (exported for testing)
// ---------------------------------------------------------------------------

export async function runFlow(deps: InitDeps = {}): Promise<Record<string, unknown>> {
  const outPath = deps.outPath ?? path.resolve(process.cwd(), ".jira.json");
  const doLoadSchema = deps.doLoadSchema ?? loadSchema;
  const doWrite = deps.doWrite ?? writeConfig;
  const doValidate = deps.doValidate ?? validateConfig;
  const doPick: PickFn = deps.pick ?? promptPick;
  const doYesNo = deps.yesNo ?? ((q: string) => promptYesNo(q));

  // Resolve API — injected (tests) or production REST
  let api: JiraInitApi;
  if (deps.api) {
    api = deps.api;
  } else {
    const token = process.env.ATLASSIAN_API_TOKEN;
    const email = process.env.ATLASSIAN_EMAIL;
    if (!token || !email) {
      printInstructions([
        "pm-tasks-jira init requires Atlassian credentials.",
        "Set ATLASSIAN_API_TOKEN and ATLASSIAN_EMAIL environment variables,",
        "or run this init from within a Claude Code session with the Atlassian MCP configured.",
        "Atlassian MCP endpoint: https://mcp.atlassian.com/v1/mcp",
      ]);
      process.exit(1);
    }
    api = createRestApi(token, email);
  }

  // -------------------------------------------------------------------------
  // Step 1: Discover cloudId
  // -------------------------------------------------------------------------
  const resources = await api.getResources();
  if (resources.length === 0) {
    printInstructions([
      "No Atlassian resources found.",
      "Ensure ATLASSIAN_API_TOKEN / ATLASSIAN_EMAIL are valid and the account has site access.",
      "Atlassian MCP endpoint: https://mcp.atlassian.com/v1/mcp",
    ]);
    process.exit(1);
  }

  let resource: AtlassianResource;
  if (resources.length === 1) {
    resource = resources[0];
  } else {
    const picked = await doPick(
      "Select Atlassian site:",
      resources.map((r) => ({ label: `${r.name} (${r.url})`, value: r })),
    );
    if (!picked) {
      process.stderr.write("No site selected. Exiting.\n");
      process.exit(1);
    }
    resource = picked;
  }
  const cloudId = resource.id;
  const siteUrl = resource.url;

  // -------------------------------------------------------------------------
  // Step 1b: Resolve authenticated user → seed members
  // -------------------------------------------------------------------------
  let members: Array<{ accountId: string; displayName: string; alias: string }> = [];
  try {
    const me = await api.getMe(cloudId);
    members = [{ accountId: me.accountId, displayName: me.displayName, alias: "me" }];
  } catch {
    // User-info unavailable; leave members empty rather than failing init
    members = [];
  }

  // -------------------------------------------------------------------------
  // Step 2: Pick project
  // -------------------------------------------------------------------------
  const projects = await api.getProjects(cloudId);
  const pickedProject = await doPick(
    "Select Jira project:",
    projects.map((p) => ({ label: `${p.key} — ${p.name}`, value: p })),
    { defaultIndex: 0 },
  );
  if (!pickedProject) {
    process.stderr.write("No project selected. Exiting.\n");
    process.exit(1);
  }
  const projectKey = pickedProject.key;
  const style: "team-managed" | "company-managed" =
    pickedProject.simplified === true ? "team-managed" : "company-managed";

  // -------------------------------------------------------------------------
  // Step 3: Resolve local issue-type names
  // -------------------------------------------------------------------------
  const issueTypesList = await api.getIssueTypes(cloudId, projectKey);
  const issueTypeMap: Record<string, string> = {};
  for (const canonical of CANONICAL_ISSUE_TYPES) {
    const exactMatch = issueTypesList.find((t) => t.name.toLowerCase() === canonical);
    const fuzzyMatch = issueTypesList.find((t) => t.name.toLowerCase().includes(canonical));
    issueTypeMap[canonical] = exactMatch?.name ?? fuzzyMatch?.name ?? canonical;
  }

  // -------------------------------------------------------------------------
  // Step 4: Detect Story Points / time-tracking fields
  // -------------------------------------------------------------------------
  let hasStoryPoints = false;
  let hasTimeTracking = false;

  const taskLocalName = issueTypeMap["task"];
  const taskIssueType = issueTypesList.find((t) => t.name === taskLocalName) ?? issueTypesList[0];

  if (taskIssueType) {
    try {
      const meta = await api.getFieldMeta(cloudId, projectKey, taskIssueType.id);
      const fieldKeys = Object.keys(meta.fields ?? {});
      hasStoryPoints = fieldKeys.includes("customfield_10016");
      hasTimeTracking = fieldKeys.includes("timetracking");
    } catch {
      // Field detection failed; proceed without SP detection
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: Prompt estimation strategy + jiraTarget
  // -------------------------------------------------------------------------
  const strategy =
    (await doPick("Select estimation strategy:", STRATEGY_CHOICES, { defaultIndex: 0 })) ??
    "fibonacci";

  const usesFibonacciScale = ["fibonacci", "story_points", "planning_poker"].includes(strategy);
  const scale = usesFibonacciScale ? DEFAULT_FIBONACCI_SCALE : undefined;

  let jiraTarget: string;
  let fieldId: string | undefined;

  if (hasStoryPoints) {
    jiraTarget =
      (await doPick(
        "Story Points field detected. Jira write target:",
        [
          { label: "story_points (recommended)", value: "story_points" },
          { label: "none — skip writing estimates to Jira", value: "none" },
        ],
        { defaultIndex: 0 },
      )) ?? "story_points";
    if (jiraTarget === "story_points") {
      fieldId = "customfield_10016";
    }
  } else if (hasTimeTracking) {
    jiraTarget =
      (await doPick(
        "Time tracking field detected. Jira write target:",
        [
          { label: "time", value: "time" },
          { label: "none — skip writing estimates to Jira", value: "none" },
        ],
        { defaultIndex: 0 },
      )) ?? "time";
  } else {
    jiraTarget = "none";
    process.stderr.write(
      "Story Points field not found in this project. To enable: " +
        "Project Settings → Issue types → [type] → drag 'Story points' from Available fields. " +
        "Re-run init after enabling.\n",
    );
  }

  const estimation: Record<string, unknown> = { strategy, jiraTarget };
  if (scale) estimation.scale = scale;
  if (fieldId) estimation.fieldId = fieldId;

  // -------------------------------------------------------------------------
  // Step 6: Autonomous block
  // -------------------------------------------------------------------------
  const locale = (process.env.LANG ?? "").split(".")[0].replace(/_/g, "-") || "en-US";

  const wantAuto = await doYesNo(
    "Enable autonomous mode? (agent can write to Jira without per-action confirmation)",
  );

  let autonomous: Record<string, unknown> | undefined;
  if (wantAuto) {
    autonomous = {
      enabled: false,
      allow: [...JIRA_9_VERBS],
      scope: { projects: [projectKey] },
      rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
      auditLog: "./logs/jira/audit.log",
    };
  }

  // -------------------------------------------------------------------------
  // Step 7: Assemble, validate, and write config
  // -------------------------------------------------------------------------
  const out: Record<string, unknown> = {
    version: "1",
    locale,
    site: { cloudId, url: siteUrl },
    project: { key: projectKey, style },
    issueTypes: issueTypeMap,
    members,
    estimation,
  };
  if (autonomous !== undefined) out.autonomous = autonomous;

  const schema = await doLoadSchema();
  const valid = await doValidate(out, schema);
  if (!valid.ok) {
    console.error(
      "pm-tasks-jira init: config validation failed:",
      JSON.stringify(valid.errors, null, 2),
    );
    process.exit(1);
  }

  await doWrite(outPath, out);
  printInstructions([
    `Config written to ${outPath}`,
    "Next: pm-tasks-jira init --doctor",
    "Atlassian MCP endpoint: https://mcp.atlassian.com/v1/mcp",
  ]);

  return out;
}
