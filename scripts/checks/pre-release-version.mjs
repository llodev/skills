import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Returns the subset of packages whose version contains "-pr-".
 * PURE — no I/O; takes an array of { name, version } objects.
 * @param {Array<{ name: string, version: string }>} packages
 * @returns {Array<{ name: string, version: string }>}
 */
export function findCanaryVersions(packages) {
  return packages.filter((p) => p.version.includes("-pr-"));
}

/**
 * Scans every workspace package.json under skills/ and packages/ (all dirs,
 * including private ones — a -pr- version anywhere is a mistake).
 * @param {string} [root]
 * @returns {Array<{ name: string, version: string }>}
 */
const WORKSPACE_ROOTS = ["skills", "packages"];

export function scanWorkspace(root = ROOT) {
  const packages = [];
  for (const wsRoot of WORKSPACE_ROOTS) {
    const baseDir = path.join(root, wsRoot);
    if (!existsSync(baseDir)) continue;
    const entries = readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = path.join(baseDir, entry.name, "package.json");
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (!pkg.name || !pkg.version) continue;
      packages.push({ name: pkg.name, version: pkg.version });
    }
  }

  return findCanaryVersions(packages);
}

// CLI direct-run guard
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const offenders = scanWorkspace();
  if (offenders.length > 0) {
    for (const { name, version } of offenders) {
      process.stderr.write(`  canary version detected: ${name}@${version}\n`);
    }
    process.stderr.write(
      "error: canary -pr- versions must not reach a release. " +
        "Run the release workflow to reset versions first.\n",
    );
    process.exit(1);
  } else {
    process.stdout.write("pre-release-version: ok — no canary -pr- versions detected\n");
    process.exit(0);
  }
}
