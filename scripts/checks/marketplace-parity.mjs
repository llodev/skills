#!/usr/bin/env node
// Validates that every plugin entry in .claude-plugin/marketplace.json
// matches the corresponding package.json version. The package directory is
// resolved from the entry's source.path (family-agnostic), falling back to
// the legacy pm-tasks/<name> layout for entries without one.
// Exit 0: all match. Exit 1: any drift or missing package.json.
import { readFileSync, existsSync } from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

const marketplacePath = `${ROOT}/.claude-plugin/marketplace.json`;
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

let failed = false;

for (const plugin of marketplace.plugins) {
  const dir = plugin.source?.path ?? `pm-tasks/${plugin.name}`;
  const pkgPath = `${ROOT}/${dir}/package.json`;

  if (!existsSync(pkgPath)) {
    process.stderr.write(`FAIL ${plugin.name}: no package.json found at ${dir}/package.json\n`);
    failed = true;
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const pkgVersion = pkg.version;
  const marketplaceVersion = plugin.version;

  if (marketplaceVersion === pkgVersion) {
    process.stdout.write(`ok   ${plugin.name}@${pkgVersion}\n`);
  } else {
    process.stderr.write(
      `FAIL ${plugin.name}: marketplace=${marketplaceVersion} package=${pkgVersion}\n`,
    );
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
