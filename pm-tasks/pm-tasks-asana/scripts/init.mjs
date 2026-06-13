#!/usr/bin/env node
// pm-tasks-asana init — interactive config bootstrapper
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  promptScope,
  promptYesNo,
  multiSelect,
  writeConfig,
  validateConfig,
  probeMCP,
  printInstructions,
} from "@llodev/pm-tasks-core/init-lib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadSchema() {
  const raw = await readFile(path.join(ROOT, "schemas", "config.json"), "utf8");
  return JSON.parse(raw);
}

async function asanaProbe() {
  // The MCP runs in a different process. To probe within this script, call the
  // Asana REST API directly with a Personal Access Token.
  // Used only to enumerate workspaces / projects / sections / custom fields / members.
  const TOKEN = process.env.LLODEV_PM_TASKS_ASANA_PAT;
  if (!TOKEN) throw new Error("auth: LLODEV_PM_TASKS_ASANA_PAT missing");
  const j = async (p) => {
    const r = await fetch(`https://app.asana.com/api/1.0${p}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const body = await r.json();
    return body.data;
  };
  return {
    getMe: () => j("/users/me?opt_fields=gid,name,email"),
    getWorkspaces: () => j("/workspaces?opt_fields=name"),
    getProjects: (workspaceGid) =>
      j(`/projects?workspace=${workspaceGid}&opt_fields=name&limit=100`),
    getSections: (projectGid) =>
      j(`/projects/${projectGid}/sections?opt_fields=name&limit=100`),
    getCustomFields: (projectGid) =>
      j(
        `/projects/${projectGid}/custom_field_settings?opt_fields=custom_field.name,custom_field.gid,custom_field.resource_subtype,custom_field.enum_options.name,custom_field.enum_options.gid&limit=100`,
      ),
    getMembers: (projectGid) =>
      j(`/projects/${projectGid}/members?opt_fields=user.name,user.gid&limit=100`),
  };
}

function aliasOf(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapResourceType(subtype) {
  switch (subtype) {
    case "enum":
      return "enum";
    case "multi_enum":
      return "multi_enum";
    case "number":
      return "number";
    case "date":
      return "date";
    case "people":
      return "people";
    default:
      return "text";
  }
}

async function run() {
  console.log("\n@llodev/pm-tasks-asana init\n");

  const { path: outPath } = await promptScope("asana");

  const probe = await probeMCP({
    tool: "asana",
    probeCommand: async () => {
      const api = await asanaProbe();
      await api.getMe();
      return api;
    },
  });

  if (probe.unauthenticated) {
    printInstructions([
      "Asana MCP detected, but credentials missing for init probe.",
      "Generate a Personal Access Token at https://app.asana.com/0/my-apps,",
      "then set it in your shell and re-run:",
      "  export LLODEV_PM_TASKS_ASANA_PAT=...",
      "(The token is used only by this init script; the MCP itself uses OAuth.)",
    ]);
    return;
  }

  if (!probe.mcpAvailable) {
    printInstructions([
      "Asana MCP not available. Connect your Asana account first:",
      "  In Cursor / Claude Code settings → MCP → enable 'claude.ai Asana'.",
      "Then re-run this init.",
    ]);
    return;
  }

  const api = probe.result;
  const me = await api.getMe();
  const workspaces = await api.getWorkspaces();

  const pickedWorkspaces = await multiSelect(
    "Available workspaces (select 1):",
    workspaces.map((w) => ({ label: `${w.name} (${w.gid})`, value: w })),
  );
  if (!pickedWorkspaces.length) {
    console.error("no workspace selected, aborting");
    process.exit(1);
  }
  const workspace = pickedWorkspaces[0];

  const projects = await api.getProjects(workspace.gid);
  const pickedProjects = await multiSelect(
    `Projects in "${workspace.name}" (select 1+):`,
    projects.map((p) => ({ label: `${p.name} (${p.gid})`, value: p })),
  );
  if (!pickedProjects.length) {
    console.error("no project selected, aborting");
    process.exit(1);
  }

  const out = {
    $schema: "https://llodev.github.io/skills/schemas/pm-tasks-asana.json",
    version: "1",
    workspace: { id: workspace.gid, name: workspace.name },
    projects: [],
    sections: [],
    customFields: [],
    members: [{ id: me.gid, name: me.name, email: me.email, alias: "me" }],
    defaults: {},
  };

  const inheritFieldIds = new Set();

  for (const p of pickedProjects) {
    const alias = aliasOf(p.name);
    out.projects.push({ id: p.gid, name: p.name, alias });

    const sections = await api.getSections(p.gid);
    const pickedSections = await multiSelect(
      `Sections in "${p.name}":`,
      sections.map((s) => ({ label: s.name, value: s })),
    );
    for (const s of pickedSections) {
      out.sections.push({
        projectAlias: alias,
        id: s.gid,
        name: s.name,
        alias: aliasOf(s.name),
      });
    }

    const cfSettings = await api.getCustomFields(p.gid);
    const fields = cfSettings.map((cs) => cs.custom_field).filter(Boolean);
    if (fields.length) {
      const pickedFields = await multiSelect(
        `Custom fields in "${p.name}" (select fields to expose to the adapter):`,
        fields.map((f) => ({ label: `${f.name} [${f.resource_subtype}]`, value: f })),
      );
      for (const f of pickedFields) {
        const entry = {
          projectAlias: alias,
          id: f.gid,
          name: f.name,
          type: mapResourceType(f.resource_subtype),
          alias: aliasOf(f.name),
        };
        if (Array.isArray(f.enum_options) && f.enum_options.length) {
          entry.options = f.enum_options.map((opt) => ({
            id: opt.gid,
            name: opt.name,
            alias: aliasOf(opt.name),
          }));
        }
        out.customFields.push(entry);
      }

      if (pickedFields.length) {
        const inheritPicked = await multiSelect(
          `Of those, which should subtasks inherit from the parent?`,
          pickedFields.map((f) => ({ label: f.name, value: f })),
        );
        for (const f of inheritPicked) inheritFieldIds.add(f.gid);
      }
    }

    try {
      const memberships = await api.getMembers(p.gid);
      const users = memberships.map((m) => m.user).filter(Boolean);
      for (const u of users) {
        if (u.gid === me.gid) continue;
        if (out.members.find((m) => m.id === u.gid)) continue;
        out.members.push({ id: u.gid, name: u.name, alias: aliasOf(u.name) });
      }
    } catch (e) {
      // Project membership listing may require additional scopes; skip silently.
    }
  }

  if (out.projects.length === 1) {
    out.defaults.projectAlias = out.projects[0].alias;
    const backlog = out.sections.find((s) => /backlog|todo|to.do|inbox/i.test(s.name));
    const done = out.sections.find((s) => /done|completed|published|conclu/i.test(s.name));
    if (backlog) out.defaults.sectionAlias = backlog.alias;
    if (done) out.defaults.closeSectionAlias = done.alias;
    out.defaults.assigneeAlias = "me";
  }

  if (inheritFieldIds.size) {
    out.subtaskDefaults = {
      inheritParentFields: [...inheritFieldIds],
      inheritAssignee: true,
    };
  }

  const wantAuto = await promptYesNo(
    "Enable autonomous mode? (adds an autonomous block with conservative defaults)",
  );
  if (wantAuto) {
    out.autonomous = {
      enabled: false,
      allow: ["task.create", "checklist.check", "task.close", "task.comment.add"],
      scope: {
        projects: out.projects.map((p) => p.id),
        sections: out.sections.map((s) => s.id),
      },
      rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
      auditLog: "~/.local/share/llodev/pm-tasks/asana/audit.log",
    };
    printInstructions([
      "autonomous block added with enabled:false.",
      "Review scope.projects and scope.sections in the JSON before enabling.",
    ]);
  }

  const schema = await loadSchema();
  const valid = await validateConfig(out, schema);
  if (!valid.ok) {
    console.error("invalid config:", JSON.stringify(valid.errors, null, 2));
    process.exit(1);
  }

  await writeConfig(outPath, out);
  printInstructions([
    `Config written to ${outPath}.`,
    "Try it in Claude Code: 'create an Asana task from this plan'.",
    "Reminder: the Asana MCP holds OAuth — never put tokens in this JSON.",
    "The LLODEV_PM_TASKS_ASANA_PAT env var is only used by this init script.",
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
