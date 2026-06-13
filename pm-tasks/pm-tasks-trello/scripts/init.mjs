#!/usr/bin/env node
// pm-tasks-trello init — interactive config bootstrapper
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

async function trelloProbe() {
  // The MCP runs in a different process. To probe within this script, call the
  // Trello REST API directly with env vars TRELLO_API_KEY + TRELLO_TOKEN.
  // We use this only to enumerate boards/lists/labels/members for the user.
  const { TRELLO_API_KEY: KEY, TRELLO_TOKEN: TOKEN } = process.env;
  if (!KEY || !TOKEN) throw new Error("auth: TRELLO_API_KEY or TRELLO_TOKEN missing");
  const url = (p) => `https://api.trello.com/1${p}?key=${KEY}&token=${TOKEN}`;
  const j = async (p) => {
    const r = await fetch(url(p));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  return {
    getBoards: () => j("/members/me/boards?filter=open&fields=id,name,url"),
    getLists: (boardId) => j(`/boards/${boardId}/lists?filter=open&fields=id,name`),
    getLabels: (boardId) => j(`/boards/${boardId}/labels?fields=id,name,color`),
    getMembers: (boardId) => j(`/boards/${boardId}/members?fields=id,username,fullName`),
    getMe: () => j("/members/me?fields=id,username,fullName"),
  };
}

function aliasOf(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function run() {
  console.log("\n@llodev/pm-tasks-trello init\n");

  const { path: outPath } = await promptScope("trello");

  const probe = await probeMCP({
    tool: "trello",
    probeCommand: async () => {
      const api = await trelloProbe();
      await api.getMe();
      return api;
    },
  });

  if (probe.unauthenticated) {
    printInstructions([
      "MCP do Trello detectado, mas credenciais ausentes.",
      "Defina no shell e rode novamente:",
      "  export TRELLO_API_KEY=...",
      "  export TRELLO_TOKEN=...",
    ]);
    return;
  }

  if (!probe.mcpAvailable) {
    printInstructions([
      "MCP do Trello não disponível. Configure primeiro:",
      "  claude mcp add trello -s project -- npx -y atlassian-trello-mcp",
      "Detalhes em references/mcp-config.md. Re-rode este init depois.",
    ]);
    return;
  }

  const api = probe.result;
  const me = await api.getMe();
  const boards = await api.getBoards();

  const pickedBoards = await multiSelect(
    "Boards disponíveis (selecione 1+):",
    boards.map((b) => ({ label: `${b.name} (${b.id})`, value: b })),
  );
  if (!pickedBoards.length) {
    console.error("nenhum board selecionado, abortando");
    process.exit(1);
  }

  const out = {
    $schema: "https://llodev.github.io/skills/schemas/pm-tasks-trello.json",
    version: "1",
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
      `Listas de "${b.name}":`,
      lists.map((l) => ({ label: l.name, value: l })),
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
  }

  if (out.boards.length === 1) {
    out.defaults.boardAlias = out.boards[0].alias;
    const backlog = out.lists.find((l) => /backlog|todo|to.do/i.test(l.name));
    const done = out.lists.find((l) => /done|published|concluído/i.test(l.name));
    if (backlog) out.defaults.listAlias = backlog.alias;
    if (done) out.defaults.closeListAlias = done.alias;
  }

  const wantAuto = await promptYesNo(
    "Habilitar modo autônomo? (cria bloco autonomous com defaults conservadores)",
  );
  if (wantAuto) {
    out.autonomous = {
      enabled: false,
      allow: ["task.create", "checklist.check", "task.close", "task.comment.add"],
      scope: { boards: out.boards.map((b) => b.id), lists: out.lists.map((l) => l.id) },
      rateLimit: { writesPerMinute: 30, commentsPerMinute: 10 },
      auditLog: "~/.local/share/llodev/pm-tasks/trello/audit.log",
    };
    printInstructions([
      "Bloco autonomous adicionado com enabled:false.",
      "Revise scope.boards e scope.lists no JSON antes de ativar.",
    ]);
  }

  const schema = await loadSchema();
  const valid = await validateConfig(out, schema);
  if (!valid.ok) {
    console.error("config inválido:", JSON.stringify(valid.errors, null, 2));
    process.exit(1);
  }

  await writeConfig(outPath, out);
  printInstructions([
    `Config criado em ${outPath}.`,
    "Teste rodando no Claude Code: 'crie um card no Trello a partir desse plano'.",
    "Lembre: segredos vão em env vars ou OS keychain — nunca neste JSON.",
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
