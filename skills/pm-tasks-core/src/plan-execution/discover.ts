import { readFile } from "node:fs/promises";
import path from "node:path";

/** Subset of a PM-tool task that discovery cares about. */
export interface DiscoveredTask {
  id: string;
  title: string;
  description?: string;
}

/**
 * Plan reference forms:
 *  - string ending with ".md" → plan file path; titles parsed from H3 headings;
 *    slug derived from the filename (strips leading YYYY-MM-DD- prefix + .md extension)
 *  - string NOT ending with ".md" → bare plan slug; expectedTitles is empty;
 *    matching falls back to slug-in-description
 *  - string[] → expected titles directly; slug undefined; matching is exact-title-only
 */
export type PlanRef = string | string[];

export interface DiscoverPlanTasksOptions {
  planRef: PlanRef;
  /** Caller-supplied lister. Returns ALL open tasks in scope. */
  listOpenTasks: () => Promise<DiscoveredTask[]>;
}

export interface DiscoveryResult {
  /** Each expected title matched by exactly one task. */
  found: DiscoveredTask[];
  /** Expected titles with zero matches. */
  missing: string[];
  /** Expected titles with multiple matches — caller resolves. Each entry is the match set for one expected title; caller re-correlates via task.title. */
  ambiguous: DiscoveredTask[][];
}

/**
 * Discover existing PM tasks that correspond to entries in a plan.
 *
 * Matching rules (no fuzzy, no case folding, no whitespace normalization):
 *
 * | planRef form     | match strategy                                              |
 * |------------------|-------------------------------------------------------------|
 * | string[]         | exact title equality (case-sensitive) per expected title    |
 * | ".md" path       | parse H3 titles + derive slug; per-title exact equality     |
 * | bare slug (str)  | collect tasks whose description contains `[plan:<slug>]`    |
 *
 * Outcomes (explicit-titles mode):
 *  - 0 matches  → expected title added to `missing`
 *  - 1 match    → task added to `found`
 *  - 2+ matches → match set pushed onto `ambiguous`; caller disambiguates
 *
 * Bare-slug mode (no expected titles): every marker-bearing task lands in
 * `found`; `missing` and `ambiguous` stay empty.
 */
export async function discoverPlanTasks(opts: DiscoverPlanTasksOptions): Promise<DiscoveryResult> {
  const { expectedTitles, slug } = await resolvePlanRef(opts.planRef);
  const tasks = await opts.listOpenTasks();
  const result: DiscoveryResult = { found: [], missing: [], ambiguous: [] };

  if (expectedTitles.length === 0) {
    if (slug !== undefined) {
      for (const t of tasks) {
        if (t.description?.includes(`[plan:${slug}]`)) result.found.push(t);
      }
    }
    return result;
  }

  for (const expected of expectedTitles) {
    const matches = tasks.filter((t) => t.title === expected);
    if (matches.length === 0) result.missing.push(expected);
    else if (matches.length === 1) result.found.push(matches[0]!);
    else result.ambiguous.push(matches);
  }

  return result;
}

/**
 * Resolve a PlanRef into the inputs needed for matching.
 *  - string[] → use as-is, no slug
 *  - string ending in ".md" → read file; parse titles from H3 headings; derive slug
 *  - other string → treat as bare slug; no expected titles
 */
export async function resolvePlanRef(
  ref: PlanRef,
): Promise<{ expectedTitles: string[]; slug?: string }> {
  if (Array.isArray(ref)) return { expectedTitles: ref };
  if (ref.endsWith(".md")) {
    const raw = await readFile(ref, "utf8");
    return { expectedTitles: parseH3Titles(raw), slug: filenameToSlug(ref) };
  }
  return { expectedTitles: [], slug: ref };
}

/** Extract H3 headings (lines starting with "### " exactly, after trim). */
export function parseH3Titles(markdown: string): string[] {
  const titles: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    // Pure string ops — no regex on user-controlled input. Earlier regex
    // forms (`.+?\s*$` then `.+$`) both tripped CodeQL js/redos because
    // `\s+` and `.+` overlap on space chars, opening backtracking paths.
    // Hardcoded "### " prefix + optional tab covers CommonMark H3; trim()
    // handles arbitrary trailing whitespace in O(n).
    if (!line.startsWith("###")) continue;
    const sep = line.charCodeAt(3);
    if (sep !== 0x20 && sep !== 0x09) continue;
    const title = line.slice(4).trim();
    if (title) titles.push(title);
  }
  return titles;
}

/**
 * Convert a filename to a slug: strip leading YYYY-MM-DD- prefix (if present)
 * and the .md extension. Path components other than the basename are dropped.
 *
 * Examples:
 *   "docs/plans/2026-06-19-pm-tasks-v1.9.0-foo.md" → "pm-tasks-v1.9.0-foo"
 *   "/abs/path/2026-06-22-headless-runtime.md"     → "headless-runtime"
 *   "plain-slug.md"                                → "plain-slug"
 */
export function filenameToSlug(filePath: string): string {
  return path.basename(filePath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}
