# Security policy

## Supported versions

We support the latest published minor version of each `@llodev/pm-tasks-*` package. Semver carets on earlier patch versions remain supported until the next minor release.

| Package                    | Supported Version |
| -------------------------- | ----------------- |
| `@llodev/pm-tasks-core`    | Latest minor      |
| `@llodev/pm-tasks-asana`   | Latest minor      |
| `@llodev/pm-tasks-trello`  | Latest minor      |
| `@llodev/pm-tasks-testkit` | Latest minor      |
| `@llodev/pm-tasks` (meta)  | Latest minor      |

For the exact versions, see the [Catalog](README.md#catalog).

## Reporting a vulnerability

**Preferred:** Report via [GitHub Security Advisory](https://github.com/llodev/skills/security/advisories/new) (private channel).

**Fallback email:** `<TBD-email>`

Do not file security issues in the public Issues tab — we'll redirect them to the private advisory process.

## Response targets

- **Acknowledge** within **72 hours**
- **Patch and release** within **14 days** when feasible

## Out of scope

- Workspace user-config files (`.trello.json`, `.asana.json`) — these carry user secrets and IDs, not ours
- Generated artifacts (`CHANGELOG.md`, `dist/`, `.tsbuildinfo`, tarball outputs)
- Skill-judge baseline JSON drift — a quality gate, not a security boundary
- Issues filed in the public Issues tab — those will be redirected to a Security Advisory
