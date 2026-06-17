// @llodev/pm-tasks-core/i18n/registry
// Adapter-scoped i18n primitives: root registration, locale listing, string loading, interpolation.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StringsTable = Record<string, string>;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));

const ADAPTER_I18N_ROOTS: Record<string, string> = {
  core: path.resolve(HERE, "..", "..", "i18n"),
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function registerI18nRoot(adapterPkg: string, absRoot: string): void {
  ADAPTER_I18N_ROOTS[adapterPkg] = absRoot;
}

export async function listLocales(adapterPkg: string): Promise<string[]> {
  const root = ADAPTER_I18N_ROOTS[adapterPkg];
  if (!root) throw new Error(`unknown adapterPkg for i18n: ${adapterPkg}`);
  const files = await readdir(root);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export async function loadStrings(adapterPkg: string, locale: string): Promise<StringsTable> {
  const root = ADAPTER_I18N_ROOTS[adapterPkg];
  if (!root) throw new Error(`unknown adapterPkg for i18n: ${adapterPkg}`);
  const target = path.join(root, `${locale}.json`);
  try {
    return JSON.parse(await readFile(target, "utf8")) as StringsTable;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return JSON.parse(await readFile(path.join(root, "en-US.json"), "utf8")) as StringsTable;
  }
}

export function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
