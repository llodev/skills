# v1.10.0 Final Review Fixes Report

## Fix 1 — Tarball manifest guard (canary-publish.yml)

**File:** `.github/workflows/canary-publish.yml`  
**Placement:** Pass-2 loop, after `[ -f "$tarball" ]` check and Guards 3 & 4, immediately before `npm publish`.

**Guard snippet inserted:**

```yaml
# Guard 5 — tarball manifest: verify that every @llodev/pm-tasks-*
# dep in the packed manifest was rewritten to a canary version range.
# The --from-canary E2E pins exact versions and cannot detect a bad
# workspace:^→canary rewrite; only inspecting the packed manifest
# catches that regression before the tarball reaches the registry.
tar -xzO -f "$tarball" package/package.json | node -e "
  let d = '';
  process.stdin.on('data', c => (d += c));
  process.stdin.on('end', () => {
    const pkg = JSON.parse(d);
    const scopes = ['dependencies', 'peerDependencies', 'optionalDependencies'];
    let failed = false;
    for (const scope of scopes) {
      const deps = pkg[scope] || {};
      for (const [dep, range] of Object.entries(deps)) {
        if (dep.startsWith('@llodev/pm-tasks-') && !range.includes('0.0.0-pr-')) {
          process.stderr.write(
            'TARBALL GUARD FAILED: ' + pkg.name + ' ' + scope + '.' + dep + ' = \"' + range + '\" (expected 0.0.0-pr- canary rewrite)\n'
          );
          failed = true;
        }
      }
    }
    if (failed) process.exit(1);
  });
" || { echo "refusing: tarball manifest guard failed for $name"; exit 1; }
```

- Reads manifest from stdin via `tar -xzO` pipe — no shell var interpolation in node source.
- Inspects `dependencies`, `peerDependencies`, `optionalDependencies` (skips `devDependencies`).
- Packages with no `@llodev/pm-tasks-*` deps pass trivially.
- Names the offending package + dep + range in stderr before `exit 1`.

## Fix 2 — Docs: install core alongside adapter

**Files:** `docs/publishing-guide.md` (§ 12 Installing a canary build), `CONTRIBUTING.md` (canary section)

**publishing-guide.md:** Added a blockquote caution before the install snippet explaining that installing an adapter alone can resolve a different PR's core canary due to the non-PR-scoped `^` prerelease caret range. Changed snippet to show single-command install of adapter + core together.

**CONTRIBUTING.md:** Reversed install order — adapter listed first, core installed alongside it in one command. Added inline comment "always pair them so npm dedupes core to this PR's canary".

## Fix 3 — canary-cleanup.yml: PREFIX via argv not interpolation

**File:** `.github/workflows/canary-cleanup.yml`

Changed `list.filter(v => v.startsWith('$PREFIX'))` (shell-interpolated into node source) to `list.filter(v => v.startsWith(process.argv[2]))` with `-- "$PREFIX"` appended to the node invocation. Behavior identical — same trailing-dash prefix match. Added inline comment "PREFIX is passed as process.argv[2] — not interpolated into source."

## Fix 4 — canary-version.mjs: shape-duplication comment

**File:** `scripts/checks/canary-version.mjs`

Added one-line comment immediately before `const version = \`0.0.0-pr-${n}-${sha}\``:

```js
// Shape also detected (not generated) in: canary-cleanup.yml (startsWith prefix), doctor.ts (/-pr-(\d+)-/), pre-release-version.mjs — edit the prefix in all sites if it changes.
```

## Validation results

| Check                                                | Result                                    |
| ---------------------------------------------------- | ----------------------------------------- |
| `python3 yaml.safe_load` — canary-publish.yml        | VALID                                     |
| `python3 yaml.safe_load` — canary-cleanup.yml        | VALID                                     |
| `node --test scripts/checks/canary-version.test.mjs` | 16/16 pass                                |
| `prettier --check` (all 5 touched files)             | All matched files use Prettier code style |

## Files changed

- `.github/workflows/canary-publish.yml` — Guard 5 tarball manifest block added
- `.github/workflows/canary-cleanup.yml` — PREFIX via process.argv[2]
- `scripts/checks/canary-version.mjs` — shape comment + prettier reformat
- `docs/publishing-guide.md` — caution + corrected install snippet
- `CONTRIBUTING.md` — adapter-first install snippet with paired core
