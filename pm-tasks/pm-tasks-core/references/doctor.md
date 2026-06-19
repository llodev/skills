# `pm-tasks-core-doctor` — check catalog + exit codes

`pm-tasks-core-doctor` validates a workspace's tool config, autonomous allowlist, audit writability, and (when auth env vars are present) network/MCP reach before any publish attempt.

---

## Check matrix

| ID      | Severity | Label                                                  | Trigger                               | Pass condition                                                                                                            | Fix hint                                                                                       |
| ------- | -------- | ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| C-FS-1  | error    | Config file exists                                     | always                                | `.<tool>.json` exists and is readable                                                                                     | Run `pnpm --filter @llodev/pm-tasks-<tool> init` to bootstrap.                                 |
| C-FS-2  | error    | Audit log directory writable                           | always                                | Parent dir of audit log exists or can be created and is writable                                                          | Check `LLODEV_PM_TASKS_LOG_DIR`; default is `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. |
| C-FS-3  | warn     | Audit log size under rotation threshold                | always                                | Log file size < 80% of `auditRotationMaxBytes` (default 10 MB)                                                            | Run `node scripts/rotate-audit.mjs --tool <tool>` to rotate.                                   |
| C-CFG-1 | error    | Config validates against schema                        | always                                | Ajv 2020 validates `.<tool>.json` against `schemas/config.json`                                                           | See `pm-tasks-<tool>/schemas/config.json` for the schema.                                      |
| C-CFG-2 | error    | autonomous.allow ⊆ manifest.verbs                      | `autonomous.allow` present            | Every verb in `autonomous.allow` appears in `manifest.verbs`                                                              | Remove unknown verbs from `autonomous.allow` or extend `manifest.json` if a new verb landed.   |
| C-CFG-3 | error    | autonomous.scope IDs declared in boards/lists/sections | `autonomous.scope` present            | Every scope board/list/section ID exists in the corresponding config array                                                | Ensure `autonomous.scope` IDs match the IDs in `boards`/`lists`/`sections` in the config.      |
| C-CFG-4 | error    | Default aliases resolve                                | `defaults` present                    | Each `defaults.<field>Alias` resolves to an alias in the corresponding array (`"me"` is always valid for `assigneeAlias`) | Ensure the alias exists in the corresponding `boards`/`lists`/`sections`/`members` array.      |
| C-TRL-1 | error    | Trello REST members/me returns 200                     | `TRELLO_API_KEY` + `TRELLO_TOKEN` set | GET `https://api.trello.com/1/members/me` returns HTTP 200                                                                | Re-generate the token at https://trello.com/app-key.                                           |
| C-TRL-2 | error    | Configured boards resolve                              | env set                               | All `config.boards[].id` resolve via Trello REST                                                                          | Verify the board ID still exists or remove from config.                                        |
| C-TRL-3 | error    | Configured lists reachable                             | env set                               | All `config.lists[].id` resolve via Trello REST                                                                           | Verify the list ID still exists or remove from config.                                         |
| C-ASN-1 | error    | Asana REST /users/me returns 200                       | `LLODEV_PM_TASKS_ASANA_PAT` set       | GET `https://app.asana.com/api/1.0/users/me` returns HTTP 200                                                             | Re-generate your Asana personal access token.                                                  |
| C-ASN-2 | error    | Configured projects resolve                            | env set                               | All `config.projects[].id` resolve via Asana REST                                                                         | Verify the project GID still exists or remove from config.                                     |
| C-ASN-3 | error    | Configured sections reachable                          | env set                               | All `config.sections[].id` resolve via Asana REST                                                                         | Verify the section GID still exists or remove from config.                                     |

> **Env-missing downgrade.** When auth env vars are absent, C-TRL-1..3 and C-ASN-1..3 return `ok: true` with a skip message rather than failing — the check is advisory only when credentials are not available.

---

## Exit code convention

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| 0    | All checks pass, or the only non-passing checks have `severity: "warn"` |
| 1    | At least one `severity: "error"` check returned `ok: false`             |
| 2    | Usage error (unknown tool, missing flags, config not found)             |

---

## CLI flags

| Flag               | Description                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `--tool <name>`    | Target a specific tool (`trello` or `asana`). If omitted, scans cwd for `.trello.json` and `.asana.json`. |
| `--json`           | Emit machine-readable JSON instead of a markdown table.                                                   |
| `--fix-hints-only` | In markdown mode, suppress passing rows — show only checks that need attention.                           |
| `--config <path>`  | Override the config file path (useful in CI or for testing a staged file).                                |

---

## Use cases

### Pre-publish guard

```sh
pm-tasks-core-doctor --tool trello && pnpm publish
```

### After editing a config

```sh
pm-tasks-core-doctor --tool trello
```

### Debug "autonomous mode silently does nothing"

```sh
pm-tasks-core-doctor --tool trello --fix-hints-only
```

Only failing and warning rows are shown, making it easy to spot the root cause (e.g. `autonomous.allow` containing a verb no longer in the manifest).

### Adapter `--doctor` shortcut

```sh
node pm-tasks/pm-tasks-trello/dist/bin/init.js --doctor
node pm-tasks/pm-tasks-asana/dist/bin/init.js --doctor
```

Each adapter delegates to `doctor-cli.ts`, which runs core checks + adapter-specific checks (C-TRL-_/C-ASN-_) and renders the same table/JSON output.

---

## Probe injection (advanced)

`DoctorContext` carries an optional `probes` extension point (future). Adapters that need to verify MCP or network reach beyond the core filesystem checks implement `DoctorCheck` objects and pass them as the `extra` parameter to `runChecks(ctx, ADAPTER_CHECKS)`. The core orchestrator runs `CORE_CHECKS` first, then `extra`, in declaration order. Each check's thrown errors are caught and surfaced as a failed result so one check crashing never aborts the entire run.

See `src/doctor.ts` for the `DoctorCheck` interface and `src/doctor-cli.ts` in each adapter for the Trello/Asana implementations.
