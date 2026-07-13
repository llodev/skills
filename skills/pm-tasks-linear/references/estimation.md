# Linear estimation (v1)

Estimation config and flow for `@llodev/pm-tasks-linear`. All verbs return the core result envelope; see [`../../pm-tasks-core/references/contract.md`](../../pm-tasks-core/references/contract.md).

## Strategy taxonomy

Estimation strategies are configured during `pm-tasks-linear init` and stored in `.linear.json`:

| Strategy         | Output                                | Notes                                                     |
| ---------------- | ------------------------------------- | --------------------------------------------------------- |
| `fibonacci`      | points (1, 2, 3, 5, 8, 13, …)         | Default; matches Linear's built-in Fibonacci scale        |
| `planning_poker` | points (1, 2, 3, 5, 8, 13, 21, 34, …) | Larger Fibonacci                                          |
| `linear_points`  | points (numeric)                      | Direct point input                                        |
| `affinity`       | points (from scale)                   | Custom scale configured at init                           |
| `t_shirt`        | points via sizeMap                    | XS/S/M/L/XL → numeric points; `sizeMap` written to config |
| `ideal_days`     | numeric (as points)                   | Maps days → points                                        |
| `ideal_hours`    | numeric (as points)                   | Maps hours → points                                       |
| `three_point`    | points (average/PERT)                 | (optimistic + 4×likely + pessimistic) / 6                 |

`none` strategy → `normalizeEstimate` returns a label-only result; `linearTarget` is forced to `"none"`.

## `linearTarget` values

`normalizeEstimate` resolves the input + strategy into a `NormalizedEstimate`. `linearTarget` drives the transport write path:

| `linearTarget` | Native field written                | Label written |
| -------------- | ----------------------------------- | ------------- |
| `points`       | `save_issue { estimate: n.points }` | `est:<slug>`  |
| `none`         | None — no native field write        | `est:<slug>`  |

The `est:<slug>` label is **always** written regardless of `linearTarget`. Unlike Jira's `story_points`/`time` split, Linear has a single numeric `estimate` field — there is no time-tracking equivalent.

## `normalizeEstimate` core helper

```ts
import { normalizeEstimate } from "@llodev/pm-tasks-core/estimation";

const n = normalizeEstimate(req.input, req.config);
// n.points      — numeric or null
// n.humanReadable — "5 story points" / "L (5 points)" / etc.
// n.slug        — slugified humanReadable (used for est: label)
```

Never throws. When the strategy produces no points and `linearTarget === "points"`, the transport returns `INVALID_REQUEST` before calling any MCP tool.

## `sizeMap` — T-shirt → points

Default size map (written to config at init when `strategy === "t_shirt"`):

| Size | Points |
| ---- | ------ |
| `XS` | 1      |
| `S`  | 2      |
| `M`  | 3      |
| `L`  | 5      |
| `XL` | 8      |

Override by editing `estimation.sizeMap` in `.linear.json` after init.

## `est:<slug>` label strategy

The human-readable original is preserved via an idempotent `est:<slug>` label on the issue. Linear labels are plain strings: robust, idempotent, searchable.

`slug = slugify(normalized.humanReadable)` where `slugify` lowercases and replaces runs of non-`[a-z0-9]` characters with `"-"`, stripping leading/trailing hyphens.

Examples:

| `humanReadable`    | `est:` label         |
| ------------------ | -------------------- |
| `"5 story points"` | `est:5-story-points` |
| `"2 ideal days"`   | `est:2-ideal-days`   |
| `"L (5 points)"`   | `est:l-5-points`     |

### Replace-set trap

**Linear labels are a replace-set** — writing `labelIds` overwrites the full label array. The transport always:

1. Reads current label ids via `get_issue { id }`.
2. Strips all prior `est:*` labels from the list.
3. Appends the new `est:<slug>` label id.
4. Writes the complete merged array in a single `save_issue` call.

This is the idempotent read-modify-write discipline. NEVER write labels without reading first.

### Label create-on-demand (M1)

If the `est:<slug>` label does not exist in `config.labels[]` (and therefore has no known id), the transport calls `create_issue_label { name: estLabelName, teamId }` to create it, then uses the returned id. This is the M1 resolution — labels are created lazily and idempotently.

## `linearTarget: "points"` guard

Guard fires when `config.estimation.linearTarget === "points"` but `n.points === null` (strategy does not produce points — e.g. a string-output strategy like raw `t_shirt` without `sizeMap`):

→ return `INVALID_REQUEST`:

```json
{
  "ok": false,
  "code": "INVALID_REQUEST",
  "details": {
    "message": "estimation.strategy \"<strategy>\" does not produce points, but linearTarget is \"points\"",
    "hint": "Set estimation.linearTarget to \"none\", or pick a point-based strategy, then re-run pm-tasks-linear init"
  }
}
```

No MCP calls are made before this guard.

## `.linear.json` estimation config

Fields in the `estimation` block:

```jsonc
{
  "estimation": {
    "strategy": "fibonacci", // one of the strategy names above
    "linearTarget": "points", // "points" | "none"
    "enabled": true, // M2: always written explicitly by init
    "scale": [1, 2, 3, 5, 8, 13], // optional; present when strategy = "affinity"
    "sizeMap": {
      // optional; present when strategy = "t_shirt"
      "XS": 1,
      "S": 2,
      "M": 3,
      "L": 5,
      "XL": 8,
    },
  },
}
```

`enabled: false` → `task.estimate.set` returns `NOT_APPLICABLE`. Set to `true` only when the Linear team has estimation enabled (checked by init via `get_team { issueEstimationType }`).
