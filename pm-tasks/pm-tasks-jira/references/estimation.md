# Jira estimation (v1)

Estimation strategy configuration and normalization contract for `@llodev/pm-tasks-jira`. The `task.estimate.set` verb records **effort** — never a calendar deadline. No date fields are read or written.

## Strategy taxonomy

The `strategy` field in `EstimationConfig` (`.jira.json` `estimation.strategy`) controls how `normalizeEstimate` interprets the raw input value:

| `strategy` value | Description                                             | `jiraTarget` produced |
| ---------------- | ------------------------------------------------------- | --------------------- |
| `fibonacci`      | Fibonacci sequence (1, 2, 3, 5, 8, 13, 21, ...)         | `story_points`        |
| `story_points`   | Raw numeric story points                                | `story_points`        |
| `planning_poker` | Planning poker deck (½, 1, 2, 3, 5, 8, 13, 20, 40, 100) | `story_points`        |
| `affinity`       | Relative affinity (XS/S/M/L/XL mapped via `sizeMap`)    | `story_points`        |
| `t_shirt`        | T-shirt sizes (XS/S/M/L/XL mapped via `sizeMap`)        | `story_points`        |
| `ideal_days`     | Ideal working days (numeric)                            | `time`                |
| `ideal_hours`    | Ideal working hours (numeric)                           | `time`                |
| `three_point`    | PERT formula: `(O + 4M + P) / 6`                        | `time`                |

## `jiraTarget` values

`normalizeEstimate` resolves the input + strategy into a `NormalizedEstimate` with a `jiraTarget` that drives the transport write path:

| `jiraTarget`   | Native field written                                           | Label written |
| -------------- | -------------------------------------------------------------- | ------------- |
| `story_points` | `req.config.fieldId` (e.g. `"customfield_10016"`) = `n.points` | `est:<slug>`  |
| `time`         | `timetracking.originalEstimate` = `n.timeString`               | `est:<slug>`  |
| `none`         | None — no native field write                                   | `est:<slug>`  |

`jiraTarget: "none"` occurs when the strategy does not map to a Jira native field, or when `fieldId` is absent for a strategy that would produce `story_points` (in which case the `story_points` guard fires first — see § `story_points` guard below). The `est:<slug>` label is **always** written regardless of `jiraTarget`.

## `normalizeEstimate` core helper

```ts
import { normalizeEstimate } from "@llodev/pm-tasks-core/estimation";

// Signature (never throws; returns a Result):
function normalizeEstimate(
  input: EstimateInput,
  config: EstimationConfig,
): Result<NormalizedEstimate>;

// NormalizedEstimate shape:
interface NormalizedEstimate {
  humanReadable: string; // e.g. "5 story points", "2 ideal days"
  jiraTarget: "story_points" | "time" | "none";
  points?: number; // present when jiraTarget === "story_points"
  timeString?: string; // present when jiraTarget === "time" (e.g. "2d", "4h")
}
```

Returns `{ ok: false, error: string }` on invalid input (e.g. unrecognized size label, negative number). The transport converts this to `INVALID_REQUEST`.

## `sizeMap` — T-shirt / affinity → points

Default conversion used by `t_shirt` and `affinity` strategies:

| Size | Points |
| ---- | ------ |
| XS   | 1      |
| S    | 2      |
| M    | 3      |
| L    | 5      |
| XL   | 8      |

Override via `.jira.json` `estimation.sizeMap` (map of `{ XS, S, M, L, XL }` numeric values).

## `est:<slug>` label strategy

The human-readable original is preserved via an idempotent `est:<slug>` label on the issue. This is **not** a description footer — Jira descriptions are ADF and fragile to programmatic modification; the transport does not touch them.

Labels are plain strings: robust, idempotent, searchable.

`slug = slugify(normalized.humanReadable)` where `slugify` lowercases and replaces runs of non-`[a-z0-9]` characters with `"-"`, stripping leading/trailing hyphens.

Examples:

| `humanReadable`    | `est:` label         |
| ------------------ | -------------------- |
| `"5 story points"` | `est:5-story-points` |
| `"2 ideal days"`   | `est:2-ideal-days`   |
| `"L (5 points)"`   | `est:l-5-points`     |

On each `task.estimate.set` call the transport reads current labels via `getJiraIssue`, strips all prior `est:*` labels, appends the new one, and writes the full updated label array back in a single `editJiraIssue` call → re-run safe.

## `story_points` guard (fieldId required)

When `jiraTarget === "story_points"` and `req.config.fieldId` is empty or absent, the transport returns immediately — **no MCP calls made**:

```json
{
  "ok": false,
  "code": "INVALID_REQUEST",
  "details": {
    "message": "estimation.fieldId is not set — cannot write story points",
    "hint": "estimation.fieldId not set — enable \"Story Points\" (Board → ⋯ → Board settings → Estimation → Story points) then re-run pm-tasks-jira init"
  }
}
```

To resolve: enable Story Points in Jira board settings, then run `npx @llodev/pm-tasks-jira init` to detect `customfield_10016` and write `fieldId` to `.jira.json`.

## `.jira.json` estimation config

```json
{
  "estimation": {
    "strategy": "fibonacci",
    "fieldId": "customfield_10016",
    "sizeMap": { "XS": 1, "S": 2, "M": 3, "L": 5, "XL": 8 }
  }
}
```

`fieldId` is detected automatically by `npx @llodev/pm-tasks-jira init` via `getJiraIssueTypeMetaWithFields`. If the Story Points field is not enabled on the board, `fieldId` is omitted from `.jira.json` and any point-based strategy write returns `INVALID_REQUEST` (see guard above).
