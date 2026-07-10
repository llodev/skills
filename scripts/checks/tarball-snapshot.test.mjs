import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = ["pm-tasks-core", "pm-tasks-asana", "pm-tasks-trello", "pm-tasks-testkit", "pm-tasks-jira"];

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
// testkit is a non-skill workspace package; every other entry is a skill.
const dirFor = (pkg) => join(ROOT, pkg === "pm-tasks-testkit" ? "packages" : "skills", pkg);
const golden = JSON.parse(
  readFileSync(join(ROOT, "scripts/snapshots/tarball-snapshot.json"), "utf8"),
);

for (const pkg of PACKAGES) {
  test(`${pkg} tarball contents match golden`, () => {
    const pkgJson = JSON.parse(readFileSync(join(dirFor(pkg), "package.json"), "utf8"));
    const version = pkgJson.version;
    // pnpm flattens @llodev/<pkg> → llodev-<pkg>-<version>.tgz
    const tarball = `/tmp/llodev-${pkg}-${version}.tgz`;

    execSync("pnpm pack --pack-destination /tmp", {
      cwd: dirFor(pkg),
      encoding: "utf8",
    });

    const list = execSync(`tar -tzf ${tarball}`, { encoding: "utf8" }).trim().split("\n").sort();

    assert.deepEqual(list, golden[pkg].sort(), `tarball drift in ${pkg}`);
  });
}
