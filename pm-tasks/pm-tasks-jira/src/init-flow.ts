// pm-tasks-jira init flow — library surface (no CLI side effects).
// The bin entry (bin/init.ts) is a thin shim that imports runFlow from here.
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
  id: string;
  name: string;
  simplified?: boolean;
}

export interface JiraIssueType {
  id: string;
  name: string;
  /** createmeta flags: subtask=true and hierarchyLevel (1=Epic, 0=std, -1=Subtask). */
  subtask?: boolean;
  hierarchyLevel?: number;
}

export interface JiraFieldMeta {
  fields: Array<{ key: string; name: string }>;
}

export interface JiraStatus {
  id: string;
  name: string;
  category: "new" | "indeterminate" | "done";
}

// ---------------------------------------------------------------------------
// Dependency injection interface — enables unit testing with stubs
// ---------------------------------------------------------------------------

export interface JiraInitApi {
  getResources(): Promise<AtlassianResource[]>;
  getProjects(cloudId: string): Promise<JiraProject[]>;
  getIssueTypes(cloudId: string, projectKey: string): Promise<JiraIssueType[]>;
  getFieldMeta(cloudId: string, projectKey: string, issueTypeId: string): Promise<JiraFieldMeta>;
  getStatuses(cloudId: string, projectKey: string): Promise<JiraStatus[]>;
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
  /** Pre-resolved locale (tests pass this to avoid the interactive promptLocale stdin read). */
  locale?: string;
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
// Production REST API (ATLASSIAN_API_TOKEN + ATLASSIAN_EMAIL env vars)
// ---------------------------------------------------------------------------

function createRestApi(token: string, email: string, site: string): JiraInitApi {
  const auth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  // Accept a full URL or a bare host (e.g. "team.atlassian.net").
  const siteHost = site.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  async function atlFetch<T>(url: string): Promise<T> {
    const res = await globalThis.fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Atlassian API HTTP ${res.status} at ${url}`);
    return res.json() as Promise<T>;
  }

  return {
    // Scoped API tokens (Basic auth) cannot call the OAuth-only
    // accessible-resources endpoint, so resolve the cloudId from the site's
    // public tenant_info instead. Returns the single given site.
    getResources: async () => {
      const info = await atlFetch<{ cloudId: string }>(`https://${siteHost}/_edge/tenant_info`);
      return [{ id: info.cloudId, name: siteHost, url: `https://${siteHost}` }];
    },
    getProjects: async (cloudId) => {
      const data = await atlFetch<{ values: JiraProject[] }>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
      );
      return data.values;
    },
    // Use the createmeta issue-types endpoint (projectKey-based, array under
    // `issueTypes`). The /issuetype/project endpoint needs a numeric projectId.
    getIssueTypes: async (cloudId, projectKey) => {
      const data = await atlFetch<{ issueTypes: JiraIssueType[] }>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`,
      );
      return data.issueTypes;
    },
    getFieldMeta: async (cloudId, projectKey, issueTypeId) => {
      return atlFetch<JiraFieldMeta>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`,
      );
    },
    // Board statuses ≈ move/close targets. project/statuses returns one entry
    // per issue type; dedupe by status id into a flat list.
    getStatuses: async (cloudId, projectKey) => {
      const data = await atlFetch<
        Array<{
          statuses: Array<{ id: string; name: string; statusCategory: { key: string } }>;
        }>
      >(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${encodeURIComponent(projectKey)}/statuses`,
      );
      const seen = new Set<string>();
      const out: JiraStatus[] = [];
      for (const type of data) {
        for (const s of type.statuses ?? []) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          out.push({
            id: s.id,
            name: s.name,
            category: s.statusCategory.key as JiraStatus["category"],
          });
        }
      }
      return out;
    },
    getMe: async (cloudId) => {
      return atlFetch<{ accountId: string; displayName: string }>(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Issue-type mapping (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Map localized issue types onto the 5 canonical keys via structural flags +
 * locale aliases (never substring matching). Subtask/epic resolve by flag;
 * task/story/bug by alias from the standard pool. Unmatched keys fall back to
 * the task type (schema requires all 5). Values are `{ id, name }` verbatim.
 */
export function mapIssueTypes(
  types: JiraIssueType[],
): Record<string, { id: string; name: string }> {
  const val = (t: JiraIssueType) => ({ id: t.id, name: t.name });

  const subtaskType =
    types.find((t) => t.subtask === true || t.hierarchyLevel === -1) ??
    types.find((t) => /sub-?task|subtarefa|subtarea/i.test(t.name));

  const epicType =
    types.find((t) => t.hierarchyLevel === 1) ??
    types.find((t) => /^(epic|épico|epico)$/i.test(t.name));

  const standardPool = types.filter((t) => t !== subtaskType && t !== epicType);

  const taskAlias = standardPool.find((t) => /^(task|tarefa|tarea|tâche|aufgabe)$/i.test(t.name));
  const storyAlias = standardPool.find((t) =>
    /^(story|user story|história|historia|historia de usuario)$/i.test(t.name),
  );
  const bugAlias = standardPool.find((t) =>
    /^(bug|erro|error|defect|defeito|fehler)$/i.test(t.name),
  );

  const taskType = taskAlias ?? standardPool[0] ?? types[0];

  return {
    epic: epicType ? val(epicType) : val(taskType),
    story: storyAlias ? val(storyAlias) : val(taskType),
    task: val(taskType),
    subtask: subtaskType ? val(subtaskType) : val(taskType),
    bug: bugAlias ? val(bugAlias) : val(taskType),
  };
}

// Persisted-config sanitization (defense-in-depth for network-derived data).

const MAX_CONFIG_STRING_LEN = 1024;

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Reject network-derived config strings carrying control characters or an
 * unbounded length before they are persisted, and rebuild from guard-checked
 * primitives — severing the network→file flow (CodeQL js/http-to-file-access).
 */
export function sanitizePersistedConfig<T>(value: T): T {
  if (typeof value === "string") {
    if (value.length > MAX_CONFIG_STRING_LEN || hasControlChar(value)) {
      throw new Error(
        `pm-tasks-jira init: refusing to persist unsafe config value ${JSON.stringify(
          value.slice(0, 40),
        )}`,
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
    const site = process.env.ATLASSIAN_SITE;
    if (!token || !email || !site) {
      printInstructions([
        "pm-tasks-jira init requires Atlassian credentials.",
        "Set ATLASSIAN_API_TOKEN, ATLASSIAN_EMAIL and ATLASSIAN_SITE environment variables",
        "(ATLASSIAN_SITE = your Jira host, e.g. your-team.atlassian.net),",
        "or run this init from within a Claude Code session with the Atlassian MCP configured.",
        "Atlassian MCP endpoint: https://mcp.atlassian.com/v1/mcp",
      ]);
      process.exit(1);
    }
    api = createRestApi(token, email, site);
  }

  // -------------------------------------------------------------------------
  // Step 0: Locale FIRST — every subsequent prompt renders in this language.
  // -------------------------------------------------------------------------
  registerI18nRoot("jira", path.join(ROOT, "i18n"));
  const locale = deps.locale ?? (await promptLocale("core", { defaultLocale: "en-US" }));
  const strings: StringsTable = await loadStrings("jira", locale);
  console.log(`\n${strings.header}\n`);

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
      strings.sitePrompt,
      resources.map((r) => ({ label: `${r.name} (${r.url})`, value: r })),
    );
    if (!picked) {
      process.stderr.write(`${strings.noSite}\n`);
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
    strings.projectPrompt,
    projects.map((p) => ({ label: `${p.key} — ${p.name}`, value: p })),
    { defaultIndex: 0 },
  );
  if (!pickedProject) {
    process.stderr.write(`${strings.noProject}\n`);
    process.exit(1);
  }
  const projectKey = pickedProject.key;
  const projectId = pickedProject.id;
  const style: "team-managed" | "company-managed" =
    pickedProject.simplified === true ? "team-managed" : "company-managed";

  // -------------------------------------------------------------------------
  // Step 3: Map localized issue types onto canonical keys (flags + aliases)
  // -------------------------------------------------------------------------
  const issueTypesList = await api.getIssueTypes(cloudId, projectKey);
  const issueTypeMap = mapIssueTypes(issueTypesList);

  // -------------------------------------------------------------------------
  // Step 4: Detect Story Points / time-tracking fields
  // -------------------------------------------------------------------------
  let hasStoryPoints = false;
  let hasTimeTracking = false;
  let storyPointsFieldId: string | undefined;

  const taskLocalName = issueTypeMap["task"]?.name;
  const taskIssueType = issueTypesList.find((t) => t.name === taskLocalName) ?? issueTypesList[0];

  if (taskIssueType) {
    try {
      const meta = await api.getFieldMeta(cloudId, projectKey, taskIssueType.id);
      const fields = meta.fields ?? [];
      // Story Points field id varies by site (default customfield_10016; team-
      // managed boards differ). Match the known id OR the field name (locale-aware).
      const spField = fields.find(
        (f) => f.key === "customfield_10016" || /story\s*point|pontos?\s+de\s+hist/i.test(f.name),
      );
      hasStoryPoints = Boolean(spField);
      storyPointsFieldId = spField?.key;
      hasTimeTracking = fields.some((f) => f.key === "timetracking");
    } catch {
      // Field detection failed; proceed without SP detection
    }
  }

  // -------------------------------------------------------------------------
  // Step 4b: Board statuses (move/close targets) + valid fields per type
  // -------------------------------------------------------------------------
  let statuses: JiraStatus[] = [];
  try {
    statuses = await api.getStatuses(cloudId, projectKey);
  } catch {
    // Statuses endpoint unavailable; leave empty rather than failing init.
    statuses = [];
  }

  const fieldsByType: Record<string, string[]> = {};
  for (const canonical of CANONICAL_ISSUE_TYPES) {
    const mapped = issueTypeMap[canonical];
    if (!mapped) continue;
    try {
      const meta = await api.getFieldMeta(cloudId, projectKey, mapped.id);
      fieldsByType[canonical] = (meta.fields ?? []).map((f) => f.key).sort();
    } catch {
      // Field meta unavailable for this type; omit it.
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: Prompt estimation strategy + jiraTarget (coherent: a point-based
  // strategy never targets time and a time-based strategy never targets points)
  // -------------------------------------------------------------------------
  const strategy =
    (await doPick(strings.strategyPrompt, STRATEGY_CHOICES, { defaultIndex: 0 })) ?? "fibonacci";

  const usesFibonacciScale = ["fibonacci", "story_points", "planning_poker"].includes(strategy);
  const scale = usesFibonacciScale ? DEFAULT_FIBONACCI_SCALE : undefined;
  const timeStrategy = strategy === "ideal_days" || strategy === "ideal_hours";

  let jiraTarget: string;
  let fieldId: string | undefined;

  if (timeStrategy) {
    if (hasTimeTracking) {
      jiraTarget =
        (await doPick(
          strings.targetPromptTime,
          [
            { label: strings.targetTime, value: "time" },
            { label: strings.targetNone, value: "none" },
          ],
          { defaultIndex: 0 },
        )) ?? "time";
    } else {
      jiraTarget = "none";
      process.stderr.write(`${strings.noTimeTracking}\n`);
    }
  } else {
    // Point-based strategy.
    if (hasStoryPoints) {
      jiraTarget =
        (await doPick(
          strings.targetPromptStoryPoints,
          [
            { label: strings.targetStoryPoints, value: "story_points" },
            { label: strings.targetNone, value: "none" },
          ],
          { defaultIndex: 0 },
        )) ?? "story_points";
      if (jiraTarget === "story_points") {
        fieldId = storyPointsFieldId ?? "customfield_10016";
      }
    } else {
      jiraTarget = "none";
      process.stderr.write(`${strings.noStoryPoints}\n`);
    }
  }

  const estimation: Record<string, unknown> = { strategy, jiraTarget };
  if (scale) estimation.scale = scale;
  if (fieldId) estimation.fieldId = fieldId;
  if (strategy === "t_shirt") estimation.sizeMap = { ...DEFAULT_SIZE_MAP };

  // -------------------------------------------------------------------------
  // Step 6: Autonomous block
  // -------------------------------------------------------------------------
  const wantAuto = await doYesNo(strings.autonomousPrompt);

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
    project: { key: projectKey, id: projectId, style },
    issueTypes: issueTypeMap,
    members,
    estimation,
  };
  if (statuses.length > 0) out.statuses = statuses;
  if (Object.keys(fieldsByType).length > 0) out.fieldsByType = fieldsByType;
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

  // Sanitize the network-derived metadata before it reaches the filesystem.
  const safeConfig = sanitizePersistedConfig(out);
  await doWrite(outPath, safeConfig);
  printInstructions([
    `Config written to ${outPath}`,
    strings.nextDoctor,
    "Atlassian MCP endpoint: https://mcp.atlassian.com/v1/mcp",
  ]);

  return safeConfig;
}
