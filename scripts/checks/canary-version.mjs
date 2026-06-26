import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Strict semver pre-release regex — 0.0.0-<identifiers>
const SEMVER_PRERELEASE_RE = /^0\.0\.0-[a-zA-Z0-9._-]+$/;

/**
 * Returns a canary version string of the form "0.0.0-pr-<N>-<sha>".
 * @param {number|string} prNumber - positive integer or all-digit string
 * @param {string} shortSha - hex string of length 7–40 (normalized to lowercase)
 * @returns {string}
 */
export function canaryVersion(prNumber, shortSha) {
  // Validate prNumber
  let n;
  if (typeof prNumber === "number") {
    if (isNaN(prNumber) || !Number.isInteger(prNumber) || prNumber <= 0) {
      throw new RangeError(`prNumber must be a positive integer, got: ${prNumber}`);
    }
    n = prNumber;
  } else if (typeof prNumber === "string") {
    if (!/^\d+$/.test(prNumber)) {
      throw new TypeError(`prNumber must be an all-digit string, got: "${prNumber}"`);
    }
    n = parseInt(prNumber, 10);
    if (n <= 0) {
      throw new RangeError(`prNumber must be positive, got: ${n}`);
    }
  } else {
    throw new TypeError(`prNumber must be a number or string, got: ${typeof prNumber}`);
  }

  // Validate shortSha — normalize to lowercase first, then check
  if (typeof shortSha !== "string" || shortSha.length === 0) {
    throw new TypeError(`shortSha must be a non-empty string`);
  }
  const sha = shortSha.toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(sha)) {
    throw new TypeError(`shortSha must be a hex string of length 7–40, got: "${shortSha}"`);
  }

  // Shape also detected (not generated) in: canary-cleanup.yml (startsWith prefix), doctor.ts (/-pr-(\d+)-/), pre-release-version.mjs — edit the prefix in all sites if it changes.
  const version = `0.0.0-pr-${n}-${sha}`;

  // Defensive: verify the produced string is a valid semver pre-release
  if (!SEMVER_PRERELEASE_RE.test(version)) {
    throw new Error(`Produced version "${version}" is not a valid semver pre-release`);
  }

  return version;
}

/**
 * Enumerates publishable pm-tasks packages from the workspace catalog.
 * Scans immediate subdirectories of <repoRoot>/pm-tasks/, reads each package.json,
 * and includes only entries where private !== true AND name starts with "@llodev/pm-tasks-".
 *
 * This enumeration IS the auto-enrollment mechanism — a new pm-tasks/<adapter> with a
 * public package.json automatically joins the canary loop.
 *
 * @returns {Array<{name: string, dir: string, packageJsonPath: string, version: string}>}
 */
export function listCanaryPackages() {
  const pmTasksDir = path.join(ROOT, "pm-tasks");
  const entries = readdirSync(pmTasksDir, { withFileTypes: true });

  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(pmTasksDir, entry.name);
    const packageJsonPath = path.join(dir, "package.json");
    if (!existsSync(packageJsonPath)) continue;

    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    if (pkg.private === true) continue;
    if (!pkg.name || !pkg.name.startsWith("@llodev/pm-tasks-")) continue;

    packages.push({
      name: pkg.name,
      dir,
      packageJsonPath,
      version: pkg.version,
    });
  }

  // Deterministic order — sort by name
  packages.sort((a, b) => a.name.localeCompare(b.name));
  return packages;
}

// CLI mode — single source of truth for the canary workflows
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args[0] === "--list") {
    for (const pkg of listCanaryPackages()) {
      process.stdout.write(pkg.name + "\n");
    }
  } else if (args.length >= 2) {
    try {
      process.stdout.write(canaryVersion(args[0], args[1]) + "\n");
    } catch (e) {
      process.stderr.write(`Error: ${e.message}\n`);
      process.exit(1);
    }
  } else {
    process.stderr.write("Usage: canary-version.mjs <prNumber> <shortSha> | --list\n");
    process.exit(1);
  }
}
