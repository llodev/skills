#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKAGES = ["pm-tasks-core", "pm-tasks-asana", "pm-tasks-trello", "pm-tasks-testkit"];

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", encoding: "utf8", ...opts });
}

// 1. Pack each package into /tmp
const tarballs = {};
for (const pkg of PACKAGES) {
  const dir = path.join(ROOT, "pm-tasks", pkg);
  const pkgJson = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  const version = pkgJson.version;
  run("pnpm pack --pack-destination /tmp", { cwd: dir, stdio: "pipe" });
  tarballs[pkg] = path.join("/tmp", `llodev-${pkg}-${version}.tgz`);
}

// 2. Create tmpdir, write minimal package.json, npm install all tarballs at once
const sandbox = mkdtempSync(path.join(tmpdir(), "pm-tasks-canary-"));
console.log(`sandbox: ${sandbox}`);
writeFileSync(
  path.join(sandbox, "package.json"),
  JSON.stringify({ name: "canary", version: "0.0.0", private: true }, null, 2),
);

const installArgs = Object.values(tarballs).join(" ");
run(`npm install --no-save --no-audit --no-fund ${installArgs}`, { cwd: sandbox });

// 3. Smoke checks
let failures = 0;

// 3a. pm-tasks-core: import init-lib, verify interpolate is a function
const coreSmoke = spawnSync(
  process.execPath,
  [
    "-e",
    `import('@llodev/pm-tasks-core/init-lib').then(m => {
      if (typeof m.interpolate !== 'function') { console.error('core:fail interpolate not a function'); process.exit(1); }
      console.log('core:ok interpolate=' + typeof m.interpolate);
    }).catch(e => { console.error('core:fail', e.message); process.exit(1); })`,
  ],
  { cwd: sandbox, encoding: "utf8", timeout: 10000 },
);
process.stdout.write(coreSmoke.stdout || "");
if (coreSmoke.status !== 0) {
  console.error("core smoke FAILED:", coreSmoke.stderr);
  failures++;
}

// 3b. pm-tasks-asana bin: verify dist/bin/init.js has shebang
const asanaBinPath = path.join(
  sandbox,
  "node_modules",
  "@llodev",
  "pm-tasks-asana",
  "dist",
  "bin",
  "init.js",
);
const asanaHead = readFileSync(asanaBinPath, "utf8").slice(0, 20);
if (!asanaHead.startsWith("#!/usr/bin/env node")) {
  console.error(`asana bin missing shebang: ${JSON.stringify(asanaHead)}`);
  failures++;
} else {
  console.log("asana bin: shebang ok");
}

// 3c. pm-tasks-trello bin: same shebang check
const trelloBinPath = path.join(
  sandbox,
  "node_modules",
  "@llodev",
  "pm-tasks-trello",
  "dist",
  "bin",
  "init.js",
);
const trelloHead = readFileSync(trelloBinPath, "utf8").slice(0, 20);
if (!trelloHead.startsWith("#!/usr/bin/env node")) {
  console.error(`trello bin missing shebang: ${JSON.stringify(trelloHead)}`);
  failures++;
} else {
  console.log("trello bin: shebang ok");
}

// 3d. pm-tasks-testkit: import createFakeAdapter and exercise task.create
const testkitSmoke = spawnSync(
  process.execPath,
  [
    "-e",
    `import('@llodev/pm-tasks-testkit').then(async m => {
      const fake = m.createFakeAdapter();
      const r = await fake['task.create']({ title: 'canary task' });
      if (!r.ok) { console.error('testkit:fail', JSON.stringify(r)); process.exit(1); }
      console.log('testkit:ok id=' + r.ref.id);
    }).catch(e => { console.error('testkit:fail', e.message); process.exit(1); })`,
  ],
  { cwd: sandbox, encoding: "utf8", timeout: 10000 },
);
process.stdout.write(testkitSmoke.stdout || "");
if (testkitSmoke.status !== 0) {
  console.error("testkit smoke FAILED:", testkitSmoke.stderr);
  failures++;
}

// 4. Result
if (failures === 0) {
  run(`rm -rf ${sandbox}`);
  console.log("\nE2E canary OK");
  process.exit(0);
} else {
  console.error(
    `\nE2E canary FAILED (${failures} issue(s); sandbox preserved at ${sandbox})`,
  );
  process.exit(1);
}
