#!/usr/bin/env node
// pm-tasks-asana init — interactive config bootstrapper
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  promptScope,
  promptYesNo,
  multiSelect,
  promptPick,
  aliasOf,
  writeConfig,
  validateConfig,
  probeMCP,
  printInstructions,
  promptLocale,
  loadStrings,
  registerI18nRoot,
  interpolate,
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
    getSections: (projectGid) => j(`/projects/${projectGid}/sections?opt_fields=name&limit=100`),
    getCustomFields: (projectGid) =>
      j(
        `/projects/${projectGid}/custom_field_settings?opt_fields=custom_field.name,custom_field.gid,custom_field.resource_subtype,custom_field.enum_options.name,custom_field.enum_options.gid&limit=100`,
      ),
    getMembers: (projectGid) =>
      j(`/projects/${projectGid}/members?opt_fields=user.name,user.gid&limit=100`),
  };
}

async function promptManualMember(asanaStrings) {
  const { createInterface } = await import("node:readline/promises");
  const { stdin: input, stdout: output } = await import("node:process");
  const r = createInterface({ input, output });
  try {
    const gid = (await r.question(asanaStrings.manualMemberGid)).trim();
    if (!gid) return null;
    const name = (await r.question(asanaStrings.manualMemberName)).trim() || "owner";
    const alias = (await r.question(asanaStrings.manualMemberAlias)).trim() || "owner";
    return { id: gid, name, alias };
  } finally {
    r.close();
  }
}

async function collectEscalationMember(out, { coreStrings, asanaStrings }) {
  const candidates = out.members.filter((m) => m.alias !== "me");
  if (candidates.length) {
    const choices = candidates.map((m) => ({ label: `${m.name} (${m.alias})`, value: m }));
    const picked = await promptPick(asanaStrings.escalationPrompt, choices, {
      defaultIndex: 0,
      allowSkip: true,
      strings: coreStrings,
    });
    if (picked) {
      if (picked.alias !== "owner") {
        if (!out.members.find((m) => m.alias === "owner")) picked.alias = "owner";
      }
      out.defaults.escalateToAlias = picked.alias;
    }
    return;
  }
  const add = await promptYesNo(asanaStrings.noMembersPrompt, { strings: coreStrings });
  if (!add) return;
  const manual = await promptManualMember(asanaStrings);
  if (!manual) return;
  out.members.push(manual);
  out.defaults.escalateToAlias = manual.alias;
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
  registerI18nRoot("asana", path.join(ROOT, "i18n"));
  const locale = await promptLocale("core", { defaultLocale: "en-US" });
  const coreStrings = await loadStrings("core", locale);
  const asanaStrings = await loadStrings("asana", locale);
  console.log(`\n${asanaStrings.header}\n`);

  const { path: outPath } = await promptScope("asana", { strings: coreStrings });

  const probe = await probeMCP({
    tool: "asana",
    probeCommand: async () => {
      const api = await asanaProbe();
      await api.getMe();
      return api;
    },
  });

  if (probe.unauthenticated) {
    printInstructions([asanaStrings.patMissingTitle, asanaStrings.patMissingBody]);
    return;
  }

  if (!probe.mcpAvailable) {
    printInstructions([asanaStrings.mcpMissingTitle, asanaStrings.mcpMissingBody]);
    return;
  }

  const api = probe.result;
  const me = await api.getMe();
  const workspaces = await api.getWorkspaces();

  const pickedWorkspaces = await multiSelect(
    asanaStrings.workspacePrompt,
    workspaces.map((w) => ({ label: `${w.name} (${w.gid})`, value: w })),
    { strings: coreStrings },
  );
  if (!pickedWorkspaces.length) {
    console.error(asanaStrings.noWorkspace);
    process.exit(1);
  }
  const workspace = pickedWorkspaces[0];

  const projects = await api.getProjects(workspace.gid);
  const pickedProjects = await multiSelect(
    interpolate(asanaStrings.projectsPrompt, { workspace: workspace.name }),
    projects.map((p) => ({ label: `${p.name} (${p.gid})`, value: p })),
    { strings: coreStrings },
  );
  if (!pickedProjects.length) {
    console.error(asanaStrings.noProject);
    process.exit(1);
  }

  const out = {
    $schema: "https://llodev.github.io/skills/schemas/pm-tasks-asana.json",
    version: "1",
    locale,
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
      interpolate(asanaStrings.sectionsPrompt, { project: p.name }),
      sections.map((s) => ({ label: s.name, value: s })),
      { strings: coreStrings },
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
        interpolate(asanaStrings.customFieldsPrompt, { project: p.name }),
        fields.map((f) => ({ label: `${f.name} [${f.resource_subtype}]`, value: f })),
        { strings: coreStrings },
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
          asanaStrings.inheritPrompt,
          pickedFields.map((f) => ({ label: f.name, value: f })),
          { strings: coreStrings },
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
    out.defaults.assigneeAlias = "me";
    const sectionChoices = out.sections.map((s) => ({
      label: `${s.name} (${s.alias})`,
      value: s,
    }));
    if (sectionChoices.length) {
      const open = await promptPick(asanaStrings.openSectionPrompt, sectionChoices, {
        defaultIndex: 0,
        allowSkip: true,
        strings: coreStrings,
      });
      if (open) out.defaults.sectionAlias = open.alias;
      const close = await promptPick(asanaStrings.closeSectionPrompt, sectionChoices, {
        defaultIndex: sectionChoices.length - 1,
        allowSkip: true,
        strings: coreStrings,
      });
      if (close) out.defaults.closeSectionAlias = close.alias;
    }
  }

  await collectEscalationMember(out, { coreStrings, asanaStrings });

  if (inheritFieldIds.size) {
    out.subtaskDefaults = {
      inheritParentFields: [...inheritFieldIds],
      inheritAssignee: true,
    };
  }

  const wantAuto = await promptYesNo(
    "Enable autonomous mode? (adds an autonomous block with conservative defaults)",
    { strings: coreStrings },
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
    asanaStrings.tryItTitle,
    asanaStrings.tokenReminderTitle,
    asanaStrings.tokenReminderBody,
  ]);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
