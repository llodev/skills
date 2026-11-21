import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "@llodev/pm-tasks-core/init-lib";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, "..");

type Json = Record<string, unknown>;

async function readJson(rel: string): Promise<Json> {
  return JSON.parse(await readFile(path.join(PKG, rel), "utf8")) as Json;
}

function minimalConfig(): Json {
  return {
    version: "1",
    workspace: { id: "9013000001", name: "Workspace" },
    lists: [
      {
        id: "901300000101",
        name: "Backlog",
        statuses: { open: "to do", done: "complete" },
      },
    ],
  };
}

async function validate(config: unknown): Promise<boolean> {
  const result = await validateConfig(config, await readJson("schemas/config.json"));
  return result.ok;
}

describe("schemas/config.json", () => {
  it("accepts a minimal valid config", async () => {
    expect(await validate(minimalConfig())).toBe(true);
  });

  it("accepts a full config with every optional block", async () => {
    const config = {
      ...minimalConfig(),
      locale: "pt-BR",
      lists: [
        {
          id: "901300000101",
          name: "Backlog",
          space: "Engineering",
          folder: "Product",
          statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
        },
        {
          id: "901300000102",
          name: "Bugs",
          statuses: { open: "to do", done: "done" },
        },
      ],
      defaultListId: "901300000101",
      members: [{ id: "30200001", name: "Member", email: "user@example.com", alias: "me" }],
      estimation: {
        enabled: true,
        strategy: "ideal_days",
        clickupTarget: "time",
        hoursPerDay: 6,
        scale: [1, 2, 3],
        sizeMap: { S: 1 },
      },
      defaults: { assigneeAlias: "me", escalateToAlias: "lead" },
      autonomous: {
        enabled: false,
        allow: ["task.create", "task.comment.add"],
        scope: { lists: ["901300000101"] },
        rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
        auditLog: ".pm-tasks/audit.jsonl",
      },
      attribution: { enabled: false },
    };
    expect(await validate(config)).toBe(true);
  });

  it("rejects a config without lists", async () => {
    const { lists: _lists, ...withoutLists } = minimalConfig();
    expect(await validate(withoutLists)).toBe(false);
    expect(await validate({ ...minimalConfig(), lists: [] })).toBe(false);
  });

  it("rejects a list without statuses.done", async () => {
    const config = minimalConfig();
    config.lists = [{ id: "901300000101", name: "Backlog", statuses: { open: "to do" } }];
    expect(await validate(config)).toBe(false);
  });

  it("rejects a list without statuses.open", async () => {
    const config = minimalConfig();
    config.lists = [{ id: "901300000101", name: "Backlog", statuses: { done: "complete" } }];
    expect(await validate(config)).toBe(false);
  });

  it("rejects an unknown key in lists[].statuses", async () => {
    const config = minimalConfig();
    config.lists = [
      {
        id: "901300000101",
        name: "Backlog",
        statuses: { open: "to do", done: "complete", review: "in review" },
      },
    ];
    expect(await validate(config)).toBe(false);
  });

  it.each(["workspace", "version"])("rejects a config without %s", async (key) => {
    const config = minimalConfig();
    delete config[key];
    expect(await validate(config)).toBe(false);
  });

  it("rejects unknown root keys", async () => {
    expect(await validate({ ...minimalConfig(), team: { id: "1" } })).toBe(false);
  });

  it("rejects autonomous.allow with a non-canonical verb", async () => {
    const config = {
      ...minimalConfig(),
      autonomous: { enabled: true, allow: ["task.create", "task.delete"] },
    };
    expect(await validate(config)).toBe(false);
  });

  // task.sprint.set was dropped from v1.0.0 (plan-limited Tasks in Multiple Lists).
  it("rejects a sprints block", async () => {
    expect(await validate({ ...minimalConfig(), sprints: { enabled: false, lists: [] } })).toBe(
      false,
    );
  });

  it("rejects task.sprint.set in autonomous.allow", async () => {
    const config = {
      ...minimalConfig(),
      autonomous: { enabled: true, allow: ["task.create", "task.sprint.set"] },
    };
    expect(await validate(config)).toBe(false);
  });

  it('rejects clickupTarget "points"', async () => {
    const config = {
      ...minimalConfig(),
      estimation: { strategy: "story_points", clickupTarget: "points" },
    };
    expect(await validate(config)).toBe(false);
  });

  it("accepts hoursPerDay 6 and rejects 0 and 25", async () => {
    const withHours = (hoursPerDay: number): Json => ({
      ...minimalConfig(),
      estimation: { strategy: "ideal_days", clickupTarget: "time", hoursPerDay },
    });
    expect(await validate(withHours(6))).toBe(true);
    expect(await validate(withHours(0))).toBe(false);
    expect(await validate(withHours(25))).toBe(false);
  });

  it("schema declares no defaults for enabled flags", async () => {
    const schema = await readJson("schemas/config.json");
    const defaults: string[] = [];
    const walk = (node: unknown, at: string): void => {
      if (node === null || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node)) {
        if (key === "default") defaults.push(at);
        walk(value, `${at}/${key}`);
      }
    };
    walk(schema, "#");
    expect(defaults).toEqual([]);

    const props = schema.properties as Record<string, { properties: Record<string, Json> }>;
    for (const block of ["autonomous", "estimation"]) {
      expect(props[block].properties.enabled, `${block}.enabled`).toEqual({ type: "boolean" });
    }
  });

  it("autonomous.allow accepts exactly the manifest verbs", async () => {
    const schema = await readJson("schemas/config.json");
    const manifest = await readJson("manifest.json");
    const props = schema.properties as Record<string, Json>;
    const autonomous = props.autonomous as { properties: { allow: { items: { enum: string[] } } } };
    expect([...autonomous.properties.allow.items.enum].sort()).toEqual(
      [...(manifest.verbs as string[])].sort(),
    );
  });
});
