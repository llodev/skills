import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { requireConfig, ConfigRequiredError } from "../../src/plan-execution/require-config.js";
import { discoverPlanTasks, type DiscoveredTask } from "../../src/plan-execution/discover.js";

let workDir: string;
let configPath: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "plan-execution-integration-"));
  configPath = path.join(workDir, ".trello.json");
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("plan-execution integration (requireConfig + discoverPlanTasks)", () => {
  it("happy path: requireConfig + discoverPlanTasks compose cleanly", async () => {
    const fixture = { boards: [{ id: "b1" }] };
    await writeFile(configPath, JSON.stringify(fixture), "utf8");

    const cfg = await requireConfig({ configPath, tool: "trello" });
    expect(cfg).toEqual(fixture);

    const taskFoo: DiscoveredTask = { id: "1", title: "Foo" };
    const taskBar: DiscoveredTask = { id: "2", title: "Bar" };
    const triage = await discoverPlanTasks({
      planRef: ["Foo", "Bar"],
      listOpenTasks: async () => [taskFoo, taskBar],
    });

    expect(triage.found).toHaveLength(2);
    expect(triage.missing).toHaveLength(0);
    expect(triage.ambiguous).toHaveLength(0);
    expect(triage.found).toEqual([taskFoo, taskBar]);
  });

  it("config error short-circuits the flow (discoverPlanTasks is never called)", async () => {
    // configPath points to nonexistent file in workDir (afterEach removes it)
    let caught: unknown;
    let discoverInvoked = false;
    try {
      await requireConfig({ configPath, tool: "trello" });
      // If requireConfig somehow returned, we would proceed — but we shouldn't.
      discoverInvoked = true;
      await discoverPlanTasks({
        planRef: ["X"],
        listOpenTasks: async () => [],
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigRequiredError);
    expect((caught as ConfigRequiredError).code).toBe("MISSING");
    expect(discoverInvoked).toBe(false);
  });

  it("discovery with mixed bucket outcomes (found + missing + ambiguous)", async () => {
    const fixture = { boards: [{ id: "b1" }] };
    await writeFile(configPath, JSON.stringify(fixture), "utf8");

    const cfg = await requireConfig({ configPath, tool: "trello" });
    expect(cfg).toEqual(fixture);

    const t1: DiscoveredTask = { id: "1", title: "A" };
    const t2: DiscoveredTask = { id: "2", title: "B" };
    const t3: DiscoveredTask = { id: "3", title: "B" };
    const triage = await discoverPlanTasks({
      planRef: ["A", "B", "C"],
      listOpenTasks: async () => [t1, t2, t3],
    });

    expect(triage.found).toEqual([t1]);
    expect(triage.missing).toEqual(["C"]);
    expect(triage.ambiguous).toEqual([[t2, t3]]);
  });

  it(".md plan file end-to-end (path → titles → discovery)", async () => {
    const fixture = { boards: [{ id: "b1" }] };
    await writeFile(configPath, JSON.stringify(fixture), "utf8");

    const planPath = path.join(workDir, "2026-06-22-end-to-end.md");
    await writeFile(planPath, "### Task 1\n\n### Task 2\n", "utf8");

    const cfg = await requireConfig({ configPath, tool: "trello" });
    expect(cfg).toEqual(fixture);

    const t1: DiscoveredTask = { id: "1", title: "Task 1" };
    const t2: DiscoveredTask = { id: "2", title: "Other" };
    const triage = await discoverPlanTasks({
      planRef: planPath,
      listOpenTasks: async () => [t1, t2],
    });

    expect(triage.found).toHaveLength(1);
    expect(triage.found[0]).toEqual(t1);
    expect(triage.missing).toEqual(["Task 2"]);
    expect(triage.ambiguous).toEqual([]);
  });

  it("bare-slug plan reference triggers marker-based collection", async () => {
    const fixture = { boards: [{ id: "b1" }] };
    await writeFile(configPath, JSON.stringify(fixture), "utf8");

    const cfg = await requireConfig({ configPath, tool: "trello" });
    expect(cfg).toEqual(fixture);

    const marked: DiscoveredTask = {
      id: "1",
      title: "X",
      description: "prep [plan:my-plan] body",
    };
    const unmarked: DiscoveredTask = {
      id: "2",
      title: "Y",
      description: "unrelated",
    };
    const triage = await discoverPlanTasks({
      planRef: "my-plan",
      listOpenTasks: async () => [marked, unmarked],
    });

    expect(triage.found).toEqual([marked]);
    expect(triage.missing).toEqual([]);
    expect(triage.ambiguous).toEqual([]);
  });
});
