#!/usr/bin/env node
// pm-tasks-trello init — interactive config bootstrapper
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
import type { StringsTable } from "@llodev/pm-tasks-core/init-lib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function loadSchema(): Promise<unknown> {
  const raw = await readFile(path.join(ROOT, "schemas", "config.json"), "utf8");
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Trello REST API types
// ---------------------------------------------------------------------------

interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

interface TrelloList {
  id: string;
  name: string;
}

interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
}

interface TrelloMe {
  id: string;
  username: string;
  fullName: string;
}

interface TrelloApi {
  getBoards: () => Promise<TrelloBoard[]>;
  getLists: (boardId: string) => Promise<TrelloList[]>;
  getLabels: (boardId: string) => Promise<TrelloLabel[]>;
  getMembers: (boardId: string) => Promise<TrelloMember[]>;
  getMe: () => Promise<TrelloMe>;
}

// ---------------------------------------------------------------------------
// Config output types
// ---------------------------------------------------------------------------

interface MemberEntry {
  id: string;
  username: string;
  fullName: string;
  alias: string;
}

interface BoardEntry {
  id: string;
  name: string;
  alias: string;
  url: string;
}

interface ListEntry {
  boardAlias: string;
  id: string;
  name: string;
  alias: string;
}

interface LabelEntry {
  boardAlias: string;
  id: string;
  name: string;
  color: string;
  alias: string;
}

interface ConfigDefaults {
  boardAlias?: string;
  assigneeAlias?: string;
  listAlias?: string;
  closeListAlias?: string;
  escalateToAlias?: string;
}

interface AutonomousConfig {
  enabled: boolean;
  allow: string[];
  scope: { boards: string[]; lists: string[] };
  rateLimit: { writesPerMinute: number; commentsPerMinute: number };
  auditLog: string;
}

interface TrelloConfig {
  $schema: string;
  version: string;
  locale: string;
  boards: BoardEntry[];
  lists: ListEntry[];
  labels: LabelEntry[];
  members: MemberEntry[];
  defaults: ConfigDefaults;
  autonomous?: AutonomousConfig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function trelloProbe(): Promise<TrelloApi> {
  // The MCP runs in a different process. To probe within this script, call the
  // Trello REST API directly with env vars TRELLO_API_KEY + TRELLO_TOKEN.
  // We use this only to enumerate boards/lists/labels/members for the user.
  const { TRELLO_API_KEY: KEY, TRELLO_TOKEN: TOKEN } = process.env;
  if (!KEY || !TOKEN) throw new Error("auth: TRELLO_API_KEY or TRELLO_TOKEN missing");
  const url = (p: string): string => {
    const sep = p.includes("?") ? "&" : "?";
    return `https://api.trello.com/1${p}${sep}key=${KEY}&token=${TOKEN}`;
  };
  const j = async <T>(p: string): Promise<T> => {
    const r = await fetch(url(p));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  };
  return {
    getBoards: () => j<TrelloBoard[]>("/members/me/boards?filter=open&fields=id,name,url"),
    getLists: (boardId: string) =>
      j<TrelloList[]>(`/boards/${boardId}/lists?filter=open&fields=id,name`),
    getLabels: (boardId: string) =>
      j<TrelloLabel[]>(`/boards/${boardId}/labels?fields=id,name,color`),
    getMembers: (boardId: string) =>
      j<TrelloMember[]>(`/boards/${boardId}/members?fields=id,username,fullName`),
    getMe: () => j<TrelloMe>("/members/me?fields=id,username,fullName"),
  };
}

async function promptManualMember(trelloStrings: StringsTable): Promise<MemberEntry | null> {
  const { createInterface } = await import("node:readline/promises");
  const { stdin: input, stdout: output } = await import("node:process");
  const r = createInterface({ input, output });
  try {
    const id = (await r.question(trelloStrings.manualMemberId)).trim();
    if (!id) return null;
    const username = (await r.question(trelloStrings.manualMemberUsername)).trim();
    const fullName = (await r.question(trelloStrings.manualMemberFullName)).trim();
    const alias = (await r.question(trelloStrings.manualMemberAlias)).trim() || "owner";
    return { id, username, fullName, alias };
  } finally {
    r.close();
  }
}

async function collectEscalationMember(
  out: TrelloConfig,
  { coreStrings, trelloStrings }: { coreStrings: StringsTable; trelloStrings: StringsTable },
): Promise<void> {
  const candidates = out.members.filter((m) => m.alias !== "me");
  if (candidates.length) {
    const choices = candidates.map((m) => ({
      label: `${m.fullName || m.username} (${m.alias})`,
      value: m,
    }));
    const picked = await promptPick(trelloStrings.escalationPrompt, choices, {
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
  const add = await promptYesNo(trelloStrings.noMembersPrompt, { strings: coreStrings });
  if (!add) return;
  const manual = await promptManualMember(trelloStrings);
  if (!manual) return;
  out.members.push(manual);
  out.defaults.escalateToAlias = manual.alias;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--doctor")) {
    const { runDoctor } = await import("../doctor-cli.js");
    await runDoctor({ tool: "trello", argv });
    return;
  }

  registerI18nRoot("trello", path.join(ROOT, "i18n"));
  const locale = await promptLocale("core", { defaultLocale: "en-US" });
  const coreStrings = await loadStrings("core", locale);
  const trelloStrings = await loadStrings("trello", locale);
  console.log(`\n${trelloStrings.header}\n`);

  const { path: outPath } = await promptScope("trello", { strings: coreStrings });

  const probe = await probeMCP({
    tool: "trello",
    probeCommand: async () => {
      const api = await trelloProbe();
      await api.getMe();
      return api;
    },
  });

  if (probe.unauthenticated) {
    printInstructions([trelloStrings.credsMissingTitle, trelloStrings.credsMissingBody]);
    return;
  }

  if (!probe.mcpAvailable) {
    printInstructions([trelloStrings.mcpMissingTitle, trelloStrings.mcpMissingBody]);
    return;
  }

  const api = probe.result as TrelloApi;
  const me = await api.getMe();
  const boards = await api.getBoards();

  const pickedBoards = await multiSelect(
    trelloStrings.boardsPrompt,
    boards.map((b) => ({ label: `${b.name} (${b.id})`, value: b })),
    { strings: coreStrings },
  );
  if (!pickedBoards.length) {
    console.error(trelloStrings.noBoard);
    process.exit(1);
  }

  const out: TrelloConfig = {
    $schema: "https://llodev.github.io/skills/schemas/pm-tasks-trello.json",
    version: "1",
    locale,
    boards: [],
    lists: [],
    labels: [],
    members: [{ id: me.id, username: me.username, fullName: me.fullName, alias: "me" }],
    defaults: {},
  };

  for (const b of pickedBoards) {
    const alias = aliasOf(b.name);
    out.boards.push({ id: b.id, name: b.name, alias, url: b.url });
    const lists = await api.getLists(b.id);
    const pickedLists = await multiSelect(
      interpolate(trelloStrings.listsPrompt, { board: b.name }),
      lists.map((l) => ({ label: l.name, value: l })),
      { strings: coreStrings },
    );
    for (const l of pickedLists) {
      out.lists.push({ boardAlias: alias, id: l.id, name: l.name, alias: aliasOf(l.name) });
    }
    const labels = (await api.getLabels(b.id)).filter((x) => x.name);
    for (const l of labels) {
      out.labels.push({
        boardAlias: alias,
        id: l.id,
        name: l.name,
        color: l.color,
        alias: aliasOf(l.name),
      });
    }
    try {
      const members = await api.getMembers(b.id);
      for (const m of members) {
        if (m.id === me.id) continue;
        if (out.members.find((x) => x.id === m.id)) continue;
        out.members.push({
          id: m.id,
          username: m.username,
          fullName: m.fullName,
          alias: aliasOf(m.username || m.fullName || m.id),
        });
      }
    } catch (_e) {
      // Board membership listing may require additional scopes; skip silently.
    }
  }

  if (out.boards.length === 1) {
    out.defaults.boardAlias = out.boards[0].alias;
    out.defaults.assigneeAlias = "me";
    const listChoices = out.lists.map((l) => ({ label: `${l.name} (${l.alias})`, value: l }));
    if (listChoices.length) {
      const open = await promptPick(trelloStrings.openListPrompt, listChoices, {
        defaultIndex: 0,
        allowSkip: true,
        strings: coreStrings,
      });
      if (open) out.defaults.listAlias = open.alias;
      const close = await promptPick(trelloStrings.closeListPrompt, listChoices, {
        defaultIndex: listChoices.length - 1,
        allowSkip: true,
        strings: coreStrings,
      });
      if (close) out.defaults.closeListAlias = close.alias;
    }
  }

  await collectEscalationMember(out, { coreStrings, trelloStrings });

  const wantAuto = await promptYesNo(coreStrings.autonomousPromptQuestion, {
    strings: coreStrings,
  });
  if (wantAuto) {
    out.autonomous = {
      enabled: false,
      allow: ["task.create", "checklist.check", "task.close", "task.comment.add"],
      scope: { boards: out.boards.map((b) => b.id), lists: out.lists.map((l) => l.id) },
      rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
      auditLog: "~/.local/share/llodev/pm-tasks/trello/audit.log",
    };
    printInstructions([coreStrings.autonomousAddedTitle, coreStrings.autonomousReviewBody]);
  }

  const schema = await loadSchema();
  const valid = await validateConfig(out, schema);
  if (!valid.ok) {
    console.error(`${coreStrings.errInvalidConfig}:`, JSON.stringify(valid.errors, null, 2));
    process.exit(1);
  }

  await writeConfig(outPath, out);
  printInstructions([
    interpolate(coreStrings.configWritten, { path: outPath }),
    trelloStrings.tryItTitle,
    trelloStrings.tokenReminderTitle,
  ]);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
