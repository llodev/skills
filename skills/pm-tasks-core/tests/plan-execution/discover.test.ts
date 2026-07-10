import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  discoverPlanTasks,
  resolvePlanRef,
  parseH3Titles,
  filenameToSlug,
  type DiscoveredTask,
} from "../../src/plan-execution/discover.js";

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "discover-test-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("resolvePlanRef", () => {
  it("returns input as expectedTitles with no slug when given string[]", async () => {
    const result = await resolvePlanRef(["Foo", "Bar", "Baz"]);
    expect(result.expectedTitles).toEqual(["Foo", "Bar", "Baz"]);
    expect(result.slug).toBeUndefined();
  });

  it("reads file, parses H3 titles, derives slug for .md path with date prefix", async () => {
    const planPath = path.join(workDir, "2026-06-22-test-plan.md");
    await writeFile(planPath, "### Foo\n\n### Bar\n", "utf8");
    const result = await resolvePlanRef(planPath);
    expect(result.expectedTitles).toEqual(["Foo", "Bar"]);
    expect(result.slug).toBe("test-plan");
  });

  it("returns empty titles + the slug when given a bare slug (no .md)", async () => {
    const result = await resolvePlanRef("my-bare-slug");
    expect(result.expectedTitles).toEqual([]);
    expect(result.slug).toBe("my-bare-slug");
  });

  it("derives slug as full basename when .md path lacks date prefix", async () => {
    const planPath = path.join(workDir, "plain-slug.md");
    await writeFile(planPath, "### Only\n", "utf8");
    const result = await resolvePlanRef(planPath);
    expect(result.expectedTitles).toEqual(["Only"]);
    expect(result.slug).toBe("plain-slug");
  });
});

describe("parseH3Titles", () => {
  it("extracts all H3 titles in order of appearance", () => {
    const md = "### Alpha\n\n### Beta\n\nsome body\n\n### Gamma\n";
    expect(parseH3Titles(md)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("ignores H1, H2, H4 headings", () => {
    const md = "# heading-one\n## heading-two\n### keep-me\n#### heading-four\n";
    expect(parseH3Titles(md)).toEqual(["keep-me"]);
  });

  it("handles trailing whitespace and CRLF line endings", () => {
    const md = "### First   \r\n### Second\t\r\n### Third\r\n";
    expect(parseH3Titles(md)).toEqual(["First", "Second", "Third"]);
  });
});

describe("filenameToSlug", () => {
  it("strips leading YYYY-MM-DD- prefix and .md extension", () => {
    expect(filenameToSlug("2026-06-19-pm-tasks-v1.9.0-foo.md")).toBe("pm-tasks-v1.9.0-foo");
  });

  it("handles absolute paths via path.basename", () => {
    expect(filenameToSlug("/abs/path/to/2026-06-22-headless-runtime.md")).toBe("headless-runtime");
  });

  it("returns full basename when there is no date prefix", () => {
    expect(filenameToSlug("docs/plans/plain-slug.md")).toBe("plain-slug");
  });
});

describe("discoverPlanTasks", () => {
  it("populates `found` when all expected titles match exactly one task each", async () => {
    const taskA: DiscoveredTask = { id: "1", title: "A" };
    const taskB: DiscoveredTask = { id: "2", title: "B" };
    const taskC: DiscoveredTask = { id: "3", title: "C" };
    const result = await discoverPlanTasks({
      planRef: ["A", "B"],
      listOpenTasks: async () => [taskA, taskB, taskC],
    });
    expect(result.found).toEqual([taskA, taskB]);
    expect(result.missing).toEqual([]);
    expect(result.ambiguous).toEqual([]);
    // Task "C" was not expected — it must not appear in the result.
    expect(result.found.find((t) => t.id === "3")).toBeUndefined();
  });

  it("adds expected titles with zero matches to `missing`", async () => {
    const taskA: DiscoveredTask = { id: "1", title: "A" };
    const result = await discoverPlanTasks({
      planRef: ["A", "X"],
      listOpenTasks: async () => [taskA],
    });
    expect(result.found).toEqual([taskA]);
    expect(result.missing).toEqual(["X"]);
    expect(result.ambiguous).toEqual([]);
  });

  it("pushes match sets onto `ambiguous` when an expected title hits multiple tasks", async () => {
    const dup1: DiscoveredTask = { id: "1", title: "A" };
    const dup2: DiscoveredTask = { id: "2", title: "A" };
    const result = await discoverPlanTasks({
      planRef: ["A"],
      listOpenTasks: async () => [dup1, dup2],
    });
    expect(result.found).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.ambiguous).toEqual([[dup1, dup2]]);
  });

  it("bare-slug mode collects tasks bearing [plan:<slug>] marker into `found`", async () => {
    const marked: DiscoveredTask = {
      id: "1",
      title: "A",
      description: "foo [plan:my-plan] bar",
    };
    const unmarked: DiscoveredTask = {
      id: "2",
      title: "B",
      description: "no marker",
    };
    const result = await discoverPlanTasks({
      planRef: "my-plan",
      listOpenTasks: async () => [marked, unmarked],
    });
    expect(result.found).toEqual([marked]);
    expect(result.missing).toEqual([]);
    expect(result.ambiguous).toEqual([]);
    expect(result.found.find((t) => t.id === "2")).toBeUndefined();
  });
});
