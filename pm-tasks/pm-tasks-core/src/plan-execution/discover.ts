import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DiscoveredTask {
  id: string;
  title: string;
  description?: string;
}

export type PlanRef = string | string[];

export interface DiscoverPlanTasksOptions {
  planRef: PlanRef;
  listOpenTasks: () => Promise<DiscoveredTask[]>;
}

export interface DiscoveryResult {
  found: DiscoveredTask[];
  missing: string[];
  ambiguous: DiscoveredTask[][];
}

/** Triage tasks: exact title match (explicit-titles), or `[plan:<slug>]` marker (bare-slug). */
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

export function parseH3Titles(markdown: string): string[] {
  const titles: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) titles.push(m[1]!);
  }
  return titles;
}

export function filenameToSlug(filePath: string): string {
  return path.basename(filePath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}
