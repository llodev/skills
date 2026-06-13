// @llodev/pm-tasks-core/init-lib
// Shared init primitives. Node 20+ built-ins + Ajv for schema validation.
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const rl = () => createInterface({ input, output });

export async function promptScope(toolName) {
  const r = rl();
  try {
    console.log(`\nWhere should the ${toolName} config live?\n  1) local   → ./.${toolName}.json\n  2) global  → ~/.config/llodev/pm-tasks/${toolName}.json`);
    const a = (await r.question("Choose [1/2] (default 1): ")).trim() || "1";
    if (a === "1") return { scope: "local", path: path.resolve(`.${toolName}.json`) };
    if (a === "2") return { scope: "global", path: path.join(homedir(), ".config", "llodev", "pm-tasks", `${toolName}.json`) };
    throw new Error(`invalid choice: ${a}`);
  } finally { r.close(); }
}

export async function promptYesNo(question, defaultNo = true) {
  const r = rl();
  try {
    const a = (await r.question(`${question} [y/N]: `)).trim().toLowerCase();
    if (a === "y" || a === "yes") return true;
    return false;
  } finally { r.close(); }
}

export async function multiSelect(label, choices) {
  const r = rl();
  try {
    console.log(`\n${label}`);
    choices.forEach((c, i) => console.log(`  ${i + 1}) ${c.label}`));
    const a = (await r.question("Select (comma-separated, e.g. 1,3,5): ")).trim();
    const picks = a.split(",").map((x) => parseInt(x.trim(), 10) - 1).filter((i) => i >= 0 && i < choices.length);
    return picks.map((i) => choices[i].value);
  } finally { r.close(); }
}

export async function writeConfig(targetPath, data) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  try { await access(targetPath); throw new Error(`config already exists at ${targetPath}, aborting`); } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  await writeFile(targetPath, JSON.stringify(data, null, 2) + "\n");
}

export async function validateConfig(data, schema) {
  // Adapter loads its own schemas/config.json and passes it here for validation.
  const { default: Ajv2020 } = await import("ajv/dist/2020.js");
  const { default: addFormats } = await import("ajv-formats");
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    return { ok: false, errors: validate.errors };
  }
  return { ok: true };
}

export async function probeMCP({ tool, probeCommand }) {
  // Caller-supplied async probe function; library only sequences UX.
  try {
    const result = await probeCommand();
    return { mcpAvailable: true, result };
  } catch (e) {
    if (/^auth\b|\b(unauthorized|forbidden)\b|\b40[13]\b/i.test(e.message)) {
      return { mcpAvailable: true, unauthenticated: true, error: e.message };
    }
    return { mcpAvailable: false, error: e.message };
  }
}

export function printInstructions(lines) {
  console.log(`\n${lines.join("\n")}\n`);
}

export async function readJsonIfExists(p) {
  try {
    const src = await readFile(p, "utf8");
    return JSON.parse(src);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
