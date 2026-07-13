// @llodev/pm-tasks-core/init-lib
// Shared init primitives. Node 20+ built-ins + Ajv for schema validation.
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

import { registerI18nRoot, listLocales, loadStrings, interpolate } from "./i18n/registry.js";
import type { StringsTable } from "./i18n/registry.js";
export { registerI18nRoot, listLocales, loadStrings, interpolate };
export type { StringsTable };

// ---------------------------------------------------------------------------
// Types & interfaces
// ---------------------------------------------------------------------------

export interface Choice<T = string> {
  label: string;
  value: T;
}

export interface PromptLocaleOptions {
  defaultLocale?: string;
}

export interface PromptScopeOptions {
  strings?: StringsTable;
}

export interface ScopeResult {
  scope: "local" | "global";
  path: string;
}

export interface PromptYesNoOptions {
  defaultNo?: boolean;
  strings?: StringsTable;
}

export interface WriteConfigOptions {
  /** Overwrite without prompting. */
  force?: boolean;
  /** Locale strings for the overwrite prompt. Falls back to en-US. */
  strings?: StringsTable;
  /** Injectable confirm fn (for tests). Defaults to promptYesNo when stdin is a TTY. */
  confirmOverwrite?: () => Promise<boolean>;
}

export interface MultiSelectOptions<T = string> {
  strings?: StringsTable;
}

export interface PromptPickOptions<T = string> {
  defaultIndex?: number;
  allowSkip?: boolean;
  strings?: StringsTable;
}

export interface AttributionConfig {
  enabled?: boolean;
  autonomousOnly?: boolean;
  includeAgentName?: boolean;
}

export interface ConfigWithAttribution {
  attribution?: AttributionConfig;
}

export interface GetAttributionParams {
  locale: string;
  tool: string;
  agent: string;
  autonomous: boolean;
  config: ConfigWithAttribution | undefined | null;
}

export interface AttributionResult {
  commentPrefix: string | null;
  descriptionFooter: string | null;
}

export interface ValidationResult {
  ok: boolean;
  errors?: unknown[] | null;
}

export interface ProbeMCPParams {
  tool: string;
  probeCommand: () => Promise<unknown>;
}

export interface ProbeMCPResult {
  mcpAvailable: boolean;
  result?: unknown;
  unauthenticated?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function promptLocale(
  adapterPkg = "core",
  { defaultLocale = "en-US" }: PromptLocaleOptions = {},
): Promise<string> {
  const locales = await listLocales(adapterPkg);
  const r = rl();
  try {
    const probe = await loadStrings("core", defaultLocale);
    console.log(`\n${probe.localePromptHeader}`);
    locales.forEach((l, i) => console.log(`  ${i + 1}) ${l}`));
    const defaultIndex = Math.max(0, locales.indexOf(defaultLocale));
    const a = (await r.question(probe.localePromptQuestion)).trim();
    if (a === "") return locales[defaultIndex];
    const i = parseInt(a, 10) - 1;
    if (i < 0 || i >= locales.length) throw new Error(`invalid choice: ${a}`);
    return locales[i];
  } finally {
    r.close();
  }
}

const rl = () => createInterface({ input, output });

export function resolveGlobalConfigDir(): string {
  if (process.env.LLODEV_PM_TASKS_CONFIG_HOME) {
    return path.resolve(process.env.LLODEV_PM_TASKS_CONFIG_HOME);
  }
  if (platform() === "win32" && process.env.APPDATA) {
    return path.join(process.env.APPDATA, "llodev", "pm-tasks");
  }
  const base = process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config");
  return path.join(base, "llodev", "pm-tasks");
}

export async function promptScope(
  toolName: string,
  { strings }: PromptScopeOptions = {},
): Promise<ScopeResult> {
  const s = strings ?? (await loadStrings("core", "en-US"));
  const r = rl();
  try {
    const localPath = path.resolve(`.${toolName}.json`);
    const globalPath = path.join(resolveGlobalConfigDir(), `${toolName}.json`);
    console.log(
      `\n${interpolate(s.scopePromptHeader, { tool: toolName })}\n${interpolate(s.scopePromptLocal, { localPath })}\n${interpolate(s.scopePromptGlobal, { globalPath })}`,
    );
    console.log(s.scopePromptOverrideHint);
    const a = (await r.question(s.scopePromptQuestion)).trim() || "1";
    if (a === "1") return { scope: "local", path: localPath };
    if (a === "2") return { scope: "global", path: globalPath };
    throw new Error(`invalid choice: ${a}`);
  } finally {
    r.close();
  }
}

export async function promptYesNo(
  question: string,
  { defaultNo: _defaultNo = true, strings }: PromptYesNoOptions = {},
): Promise<boolean> {
  const s = strings ?? (await loadStrings("core", "en-US"));
  const r = rl();
  try {
    const yesShort = s.yesNoYes;
    const noShort = s.yesNoNo;
    const a = (await r.question(`${question} [${yesShort}/${noShort.toUpperCase()}]: `))
      .trim()
      .toLowerCase();
    // Cross-locale tolerance: accept the locale-native short answer (`s.yesNoYes`)
    // AND the three canonical short forms (`yes`/`sim`/`si`). Deliberate so users
    // can answer prompts in their own language even if the wrong locale was picked.
    if (a === yesShort || a === "yes" || a === "sim" || a === "si") return true;
    return false;
  } finally {
    r.close();
  }
}

export async function multiSelect<T = string>(
  label: string,
  choices: Choice<T>[],
  { strings }: MultiSelectOptions<T> = {},
): Promise<T[]> {
  const s = strings ?? (await loadStrings("core", "en-US"));
  const r = rl();
  try {
    console.log(`\n${label}`);
    choices.forEach((c, i) => console.log(`  ${i + 1}) ${c.label}`));
    const a = (await r.question(s.multiSelectQuestion)).trim();
    if (a === "") return choices.map((c) => c.value);
    const picks = a
      .split(",")
      .map((x) => parseInt(x.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < choices.length);
    return picks.map((i) => choices[i].value);
  } finally {
    r.close();
  }
}

export async function promptPick<T = string>(
  label: string,
  choices: Choice<T>[],
  { defaultIndex = -1, allowSkip = false, strings }: PromptPickOptions<T> = {},
): Promise<T | null> {
  const s = strings ?? (await loadStrings("core", "en-US"));
  const r = rl();
  try {
    console.log(`\n${label}`);
    choices.forEach((c, i) => console.log(`  ${i + 1}) ${c.label}`));
    const hint = [
      defaultIndex >= 0 ? `default ${defaultIndex + 1}` : null,
      allowSkip ? s.promptPickSkip : null,
    ]
      .filter(Boolean)
      .join(", ");
    const suffix = hint ? ` (${hint})` : "";
    const a = (await r.question(`${s.promptPickQuestion}${suffix}: `)).trim();
    if (allowSkip && (a === "s" || a === "skip")) return null;
    if (a === "") {
      if (defaultIndex >= 0) return choices[defaultIndex].value;
      throw new Error("no choice and no default");
    }
    const i = parseInt(a, 10) - 1;
    if (i < 0 || i >= choices.length) throw new Error(`invalid choice: ${a}`);
    return choices[i].value;
  } finally {
    r.close();
  }
}

export function aliasOf(name: unknown): string {
  return String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function writeConfig(
  targetPath: string,
  data: unknown,
  opts?: WriteConfigOptions,
): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  try {
    await writeFile(targetPath, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      // force: overwrite without prompting
      if (opts?.force === true) {
        await writeFile(targetPath, JSON.stringify(data, null, 2) + "\n", { flag: "w" });
        return;
      }

      // Determine confirm source: injected fn, or TTY-default, or neither (non-interactive)
      let confirm: (() => Promise<boolean>) | undefined = opts?.confirmOverwrite;
      if (confirm === undefined && process.stdin.isTTY) {
        confirm = async () => {
          const s = opts?.strings ?? (await loadStrings("core", "en-US"));
          return promptYesNo(s.configExistsPrompt, { defaultNo: true, strings: opts?.strings });
        };
      }

      if (confirm !== undefined) {
        const yes = await confirm();
        if (yes) {
          await writeFile(targetPath, JSON.stringify(data, null, 2) + "\n", { flag: "w" });
          return;
        }
        // User declined (or injected confirm returned false)
        const s = opts?.strings ?? (await loadStrings("core", "en-US"));
        throw new Error(s.configExistsKept);
      }

      // Non-interactive: no TTY and no injected confirm — preserve original behavior
      throw new Error(`config already exists at ${targetPath}, aborting`);
    }
    throw e;
  }
}

// Schemas in this list are pre-registered on the Ajv instance before any
// adapter schema is compiled. Adapter configs ($id under llodev.github.io)
// declare $ref to these schemas via their stable llodev.com $id; Ajv must
// know about them up front or compilation throws MissingRefError.
const CORE_REF_SCHEMAS = ["attribution.schema.json", "adapter-manifest.schema.json"];

export async function validateConfig(data: unknown, schema: unknown): Promise<ValidationResult> {
  // Adapter loads its own schemas/config.json and passes it here for validation.
  // Dynamic imports use `as unknown as` casts because ajv's CJS default export
  // types don't surface construct/call signatures through NodeNext dynamic import.
  const { default: Ajv2020Ctor } = (await import("ajv/dist/2020.js")) as unknown as {
    default: new (opts: { allErrors: boolean; strict: boolean }) => {
      compile: (schema: unknown) => ((data: unknown) => boolean) & { errors?: unknown[] | null };
      addSchema: (schema: unknown) => void;
    };
  };
  const { default: addFormatsFn } = (await import("ajv-formats")) as unknown as {
    default: (ajv: unknown) => void;
  };
  const ajv = new Ajv2020Ctor({ allErrors: true, strict: false });
  addFormatsFn(ajv);

  const schemasDir = path.resolve(HERE, "..", "schemas");
  for (const name of CORE_REF_SCHEMAS) {
    try {
      const raw = await readFile(path.join(schemasDir, name), "utf8");
      ajv.addSchema(JSON.parse(raw));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }

  const validate = ajv.compile(schema);
  if (!validate(data)) {
    return { ok: false, errors: validate.errors };
  }
  return { ok: true };
}

export async function probeMCP({
  tool: _tool,
  probeCommand,
}: ProbeMCPParams): Promise<ProbeMCPResult> {
  // Caller-supplied async probe function; library only sequences UX.
  try {
    const result = await probeCommand();
    return { mcpAvailable: true, result };
  } catch (e) {
    const err = e as Error;
    if (/^auth\b|\b(unauthorized|forbidden)\b|\b40[13]\b/i.test(err.message)) {
      return { mcpAvailable: true, unauthenticated: true, error: err.message };
    }
    return { mcpAvailable: false, error: err.message };
  }
}

export function printInstructions(lines: string[]): void {
  console.log(`\n${lines.join("\n")}\n`);
}

export async function readJsonIfExists(p: string): Promise<unknown> {
  try {
    const src = await readFile(p, "utf8");
    return JSON.parse(src) as unknown;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function getAttribution({
  locale,
  tool,
  agent,
  autonomous,
  config,
}: GetAttributionParams): Promise<AttributionResult> {
  const att = config?.attribution;
  if (!att?.enabled) return { commentPrefix: null, descriptionFooter: null };
  if (att.autonomousOnly && !autonomous) return { commentPrefix: null, descriptionFooter: null };

  const s = await loadStrings("core", locale);
  const agentName = att.includeAgentName === false ? "agent" : agent;
  const prefixKey = autonomous
    ? "attribution.autonomousCommentPrefix"
    : "attribution.commentPrefix";
  return {
    commentPrefix: interpolate(s[prefixKey], { agent: agentName }),
    descriptionFooter: interpolate(s["attribution.descriptionFooter"], { agent: agentName, tool }),
  };
}
