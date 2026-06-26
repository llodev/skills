#!/usr/bin/env node
// Filter a package's published versions down to one PR's canaries.
// Used by .github/workflows/canary-cleanup.yml to decide what to unpublish.
//
// This is a real script file (NOT `node -e`): for a script file the first user
// argument is process.argv[2]. The previous inline `node -e "..." -- "$PREFIX"`
// form silently broke because `node -e` has no script-path slot, so the arg
// landed at argv[1] and argv[2] was undefined → every filter matched nothing.
// Keeping the logic in a module makes it unit-testable so that cannot recur.
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Versions matching this PR's canary prefix `0.0.0-pr-<prNumber>-`.
 *
 * The trailing dash anchors the number so PR 42 never matches PR 421's versions
 * (`0.0.0-pr-421-...` does not start with `0.0.0-pr-42-`). `npm view <pkg>
 * versions --json` returns an array (many versions) or a bare string (exactly
 * one) — both are normalised here.
 *
 * @param {string[]|string} versions - parsed output of `npm view ... versions --json`
 * @param {string|number} prNumber
 * @returns {string[]}
 */
export function matchCanaryVersions(versions, prNumber) {
  const prefix = `0.0.0-pr-${prNumber}-`;
  const list = Array.isArray(versions) ? versions : [versions];
  return list.filter((v) => typeof v === "string" && v.startsWith(prefix));
}

// CLI: read `npm view <pkg> versions --json` from stdin, print matches for <prNumber>.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const prNumber = process.argv[2];
  if (!prNumber) {
    console.error("usage: canary-cleanup-filter.mjs <prNumber>  (versions JSON on stdin)");
    process.exit(2);
  }
  let data = "";
  process.stdin.on("data", (c) => (data += c));
  process.stdin.on("end", () => {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      // No / invalid input ⇒ no matches (best-effort cleanup never errors here).
      process.exit(0);
    }
    for (const v of matchCanaryVersions(parsed, prNumber)) console.log(v);
  });
}
