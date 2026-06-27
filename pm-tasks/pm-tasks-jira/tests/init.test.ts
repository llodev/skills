import { describe, it, expect, vi } from "vitest";
import {
  runFlow,
  type InitDeps,
  type JiraInitApi,
  type AtlassianResource,
  type JiraProject,
  type JiraIssueType,
} from "../src/init-flow.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RESOURCE_A: AtlassianResource = {
  id: "cloud-aaa",
  name: "Acme Corp",
  url: "https://acme.atlassian.net",
};

const RESOURCE_B: AtlassianResource = {
  id: "cloud-bbb",
  name: "Beta Co",
  url: "https://beta.atlassian.net",
};

const PROJECT: JiraProject = {
  key: "ACME",
  name: "Acme Project",
  simplified: false,
};

const ISSUE_TYPES: JiraIssueType[] = [
  { id: "10001", name: "Epic" },
  { id: "10002", name: "Story" },
  { id: "10003", name: "Task" },
  { id: "10004", name: "Subtask" },
  { id: "10005", name: "Bug" },
];

/** Stub API with Story Points present */
function makeApiWithSP(): JiraInitApi {
  return {
    getResources: async () => [RESOURCE_A],
    getProjects: async () => [PROJECT],
    getIssueTypes: async () => ISSUE_TYPES,
    getFieldMeta: async () => ({
      fields: [
        { key: "customfield_10016", name: "Story Points" },
        { key: "summary", name: "Summary" },
        { key: "description", name: "Description" },
      ],
    }),
    getMe: async () => ({ accountId: "user-123", displayName: "Alice Acme" }),
  };
}

/** Stub API with no Story Points field and no time tracking (bare fields only) */
function makeApiNoSP(): JiraInitApi {
  return {
    getResources: async () => [RESOURCE_A],
    getProjects: async () => [PROJECT],
    getIssueTypes: async () => ISSUE_TYPES,
    getFieldMeta: async () => ({
      fields: [
        { key: "summary", name: "Summary" },
        { key: "description", name: "Description" },
        { key: "assignee", name: "Assignee" },
      ],
    }),
    getMe: async () => ({ accountId: "user-123", displayName: "Alice Acme" }),
  };
}

/** Stub API with time tracking but no Story Points (basic team-managed board) */
function makeApiTimeTracking(): JiraInitApi {
  return {
    getResources: async () => [RESOURCE_A],
    getProjects: async () => [PROJECT],
    getIssueTypes: async () => ISSUE_TYPES,
    getFieldMeta: async () => ({
      fields: [
        { key: "summary", name: "Summary" },
        { key: "timetracking", name: "Time tracking" },
      ],
    }),
    getMe: async () => ({ accountId: "user-123", displayName: "Alice Acme" }),
  };
}

/** Pick stub: always returns first choice */
function makePick() {
  return vi.fn(
    async <T>(_label: string, choices: Array<{ label: string; value: T }>) => choices[0].value,
  );
}

/** Minimal deps for a non-writing test run */
function baseDeps(api: JiraInitApi, pick = makePick()): InitDeps {
  return {
    api,
    pick,
    yesNo: async () => false,
    doWrite: async () => undefined,
    doValidate: async () => ({ ok: true }),
    doLoadSchema: async () => ({}),
    outPath: "/dev/null",
  };
}

// ---------------------------------------------------------------------------
// Test (a): happy path — Story Points present → story_points / fieldId
// ---------------------------------------------------------------------------

describe("runFlow — happy path (Story Points present)", () => {
  it("sets jiraTarget=story_points and fieldId=customfield_10016", async () => {
    const out = await runFlow(baseDeps(makeApiWithSP()));
    const est = out["estimation"] as Record<string, unknown>;
    expect(est["jiraTarget"]).toBe("story_points");
    expect(est["fieldId"]).toBe("customfield_10016");
    expect(est["strategy"]).toBe("fibonacci");
    expect(est["scale"]).toEqual([1, 2, 3, 5, 8, 13]);
  });

  it("writes site + project block correctly", async () => {
    const out = await runFlow(baseDeps(makeApiWithSP()));
    expect(out["site"]).toEqual({ cloudId: "cloud-aaa", url: "https://acme.atlassian.net" });
    expect(out["project"]).toEqual({ key: "ACME", style: "company-managed" });
  });

  it("simplified=true → team-managed style", async () => {
    const api: JiraInitApi = {
      ...makeApiWithSP(),
      getProjects: async () => [{ ...PROJECT, simplified: true }],
    };
    const out = await runFlow(baseDeps(api));
    expect((out["project"] as Record<string, unknown>)["style"]).toBe("team-managed");
  });

  it("builds issueTypes map from returned types", async () => {
    const out = await runFlow(baseDeps(makeApiWithSP()));
    const it_ = out["issueTypes"] as Record<string, string>;
    expect(it_["task"]).toBe("Task");
    expect(it_["story"]).toBe("Story");
    expect(it_["epic"]).toBe("Epic");
    expect(it_["bug"]).toBe("Bug");
  });
});

// ---------------------------------------------------------------------------
// Test (a2): time tracking present, no Story Points → jiraTarget=time
// ---------------------------------------------------------------------------

describe("runFlow — time tracking present (no Story Points)", () => {
  it("sets jiraTarget=time and omits fieldId", async () => {
    const out = await runFlow(baseDeps(makeApiTimeTracking()));
    const est = out["estimation"] as Record<string, unknown>;
    expect(est["jiraTarget"]).toBe("time");
    expect(est["fieldId"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test (b): no Story Points → jiraTarget=none, no fieldId
// ---------------------------------------------------------------------------

describe("runFlow — no Story Points field", () => {
  it("sets jiraTarget=none and omits fieldId", async () => {
    const out = await runFlow(baseDeps(makeApiNoSP()));
    const est = out["estimation"] as Record<string, unknown>;
    expect(est["jiraTarget"]).toBe("none");
    expect(est["fieldId"]).toBeUndefined();
  });

  it("prints Phase-0 click-path message to stderr", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      await runFlow(baseDeps(makeApiNoSP()));
      const calls = stderrSpy.mock.calls.map((c) => String(c[0]));
      const combined = calls.join("");
      expect(combined).toContain("Story Points field not found");
      expect(combined).toContain("Project Settings");
    } finally {
      stderrSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Test (c): multi-resource disambiguation → promptPick called for site
// ---------------------------------------------------------------------------

describe("runFlow — multiple Atlassian resources", () => {
  it("calls pick for site selection when multiple resources exist", async () => {
    const pick = makePick();
    const api: JiraInitApi = {
      ...makeApiWithSP(),
      getResources: async () => [RESOURCE_A, RESOURCE_B],
    };
    await runFlow({ ...baseDeps(api, pick), pick });

    // pick must have been called at least once with the two resources
    const siteCalls = pick.mock.calls.filter(([label]) => String(label).includes("Atlassian site"));
    expect(siteCalls.length).toBeGreaterThanOrEqual(1);
    const choices = siteCalls[0][1] as Array<{ value: AtlassianResource }>;
    expect(choices.map((c) => c.value.id)).toContain("cloud-aaa");
    expect(choices.map((c) => c.value.id)).toContain("cloud-bbb");
  });

  it("single resource → pick NOT called for site selection", async () => {
    const pick = makePick();
    await runFlow({ ...baseDeps(makeApiWithSP(), pick), pick });

    const siteCalls = pick.mock.calls.filter(([label]) => String(label).includes("Atlassian site"));
    expect(siteCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test (d): members — authenticated user populated from getMe
// ---------------------------------------------------------------------------

describe("runFlow — members block", () => {
  it("populates members[0] with alias=me from getMe", async () => {
    const out = await runFlow(baseDeps(makeApiWithSP()));
    const members = out["members"] as Array<Record<string, unknown>>;
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThanOrEqual(1);
    expect(members[0]["alias"]).toBe("me");
    expect(members[0]["accountId"]).toBe("user-123");
    expect(members[0]["displayName"]).toBe("Alice Acme");
  });

  it("falls back to members=[] when getMe throws", async () => {
    const apiFailing: JiraInitApi = {
      ...makeApiWithSP(),
      getMe: async () => {
        throw new Error("unauthorized");
      },
    };
    const out = await runFlow(baseDeps(apiFailing));
    const members = out["members"] as Array<Record<string, unknown>>;
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(0);
  });
});
