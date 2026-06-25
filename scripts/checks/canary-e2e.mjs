#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canaryVersion, listCanaryPackages } from "./canary-version.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKAGES = ["pm-tasks-core", "pm-tasks-asana", "pm-tasks-trello", "pm-tasks-testkit"];

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", encoding: "utf8", ...opts });
}

/**
 * Returns exact-pinned install specs for all canary packages at the given PR/sha.
 * Each entry is "@llodev/<pkg>@<version>" — no ranges, no dist-tags.
 *
 * WHY exact pins: published adapters declare core as "^0.0.0-pr-<N>-<sha>".
 * A "^"-range on a "0.0.0-pr-*" prerelease is NOT constrained to this PR —
 * npm may resolve a different PR's canary that sorts higher. Installing every
 * package at the same EXACT canary version in one command ensures this PR's
 * packages are installed and keeps the smoke test hermetic.
 *
 * @param {number|string} pr
 * @param {string} sha
 * @returns {string[]}
 */
export function canaryInstallSpecs(pr, sha) {
  const version = canaryVersion(pr, sha);
  return listCanaryPackages().map((pkg) => `${pkg.name}@${version}`);
}

/**
 * Parse PR number and SHA from argv or env.
 * Returns { pr, sha } strings, or throws with a descriptive message.
 *
 * @param {string[]} argv - process.argv.slice(2) style
 * @param {Record<string, string|undefined>} env - process.env style
 * @returns {{ pr: string, sha: string }}
 */
export function resolveCanaryInputs(argv, env) {
  let pr, sha;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--pr" && argv[i + 1]) pr = argv[++i];
    else if (argv[i] === "--sha" && argv[i + 1]) sha = argv[++i];
  }

  if (!pr) pr = env.CANARY_PR_NUMBER;
  if (!sha) sha = env.CANARY_SHA;

  if (!pr || !sha) {
    const missing = [!pr && "--pr / CANARY_PR_NUMBER", !sha && "--sha / CANARY_SHA"]
      .filter(Boolean)
      .join(", ");
    throw new Error(`--from-canary mode requires: ${missing}`);
  }
  return { pr, sha };
}

/**
 * Runs all smoke checks against an installed sandbox.
 * Returns the number of failures (0 = all OK). Logs each result.
 *
 * @param {string} sandbox - path to sandbox directory containing node_modules
 * @returns {number} failure count
 */
export function runSmoke(sandbox) {
  let failures = 0;

  // Smoke 1: pm-tasks-core — interpolate is a function
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

  // Smoke 2: pm-tasks-asana bin shebang
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

  // Smoke 3: pm-tasks-trello bin shebang
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

  // Smoke 4: pm-tasks-testkit — createFakeAdapter + task.create
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

  return failures;
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const fromCanary = args.includes("--from-canary");

  if (fromCanary) {
    // ── --from-canary mode ─────────────────────────────────────────────────────
    // Installs packages from the npm registry at their exact canary version,
    // then runs the same smoke checks as local-pack mode.
    let pr, sha;
    try {
      ({ pr, sha } = resolveCanaryInputs(args, process.env));
    } catch (e) {
      process.stderr.write(`Error: ${e.message}\n`);
      process.exit(1);
    }

    const specs = canaryInstallSpecs(pr, sha);
    const version = canaryVersion(pr, sha);
    console.log(`\nFrom-canary mode: version=${version}`);

    const sandbox = mkdtempSync(path.join(tmpdir(), "pm-tasks-canary-"));
    console.log(`sandbox: ${sandbox}`);
    writeFileSync(
      path.join(sandbox, "package.json"),
      JSON.stringify({ name: "canary", version: "0.0.0", private: true }, null, 2),
    );

    // Install ALL packages at their EXACT canary version in one command.
    // WHY exact pins: see canaryInstallSpecs() docstring above.
    // Retry up to 3 times to tolerate registry propagation lag after a fresh publish.
    const installCmd = `npm install --no-save --no-audit --no-fund ${specs.join(" ")}`;
    const MAX_RETRIES = 3;
    let installOk = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        run(installCmd, { cwd: sandbox });
        installOk = true;
        break;
      } catch {
        if (attempt < MAX_RETRIES) {
          console.error(`npm install attempt ${attempt}/${MAX_RETRIES} failed; retrying in 5s...`);
          execSync("sleep 5");
        }
      }
    }
    if (!installOk) {
      console.error(`npm install failed after ${MAX_RETRIES} attempts`);
      process.exit(1);
    }

    const failures = runSmoke(sandbox);
    if (failures === 0) {
      run(`rm -rf ${sandbox}`);
      console.log("\nE2E canary (--from-canary) OK");
      process.exit(0);
    } else {
      console.error(
        `\nE2E canary (--from-canary) FAILED (${failures} issue(s); sandbox preserved at ${sandbox})`,
      );
      process.exit(1);
    }
  } else {
    // ── default local-pack mode (unchanged) ────────────────────────────────────

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

    // 3. Smoke checks (shared)
    const failures = runSmoke(sandbox);

    // 4. Result
    if (failures === 0) {
      run(`rm -rf ${sandbox}`);
      console.log("\nE2E canary OK");
      process.exit(0);
    } else {
      console.error(`\nE2E canary FAILED (${failures} issue(s); sandbox preserved at ${sandbox})`);
      process.exit(1);
    }
  }
}
