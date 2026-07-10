// @llodev/pm-tasks-core/estimation
// Pure adapter-agnostic estimation module. No I/O, no MCP imports.

export type EstimationStrategy =
  | "story_points"
  | "fibonacci"
  | "planning_poker"
  | "affinity"
  | "t_shirt"
  | "ideal_days"
  | "ideal_hours"
  | "three_point";

export type JiraTarget = "story_points" | "time" | "none";

export interface EstimationConfig {
  strategy: EstimationStrategy;
  /** Valid values for point-like strategies; when absent, raw value is used. */
  scale?: number[];
  jiraTarget: JiraTarget;
  /** Required when jiraTarget = "story_points" */
  fieldId?: string;
  /** Required when strategy = "t_shirt" */
  sizeMap?: Record<string, number>;
}

export interface ThreePointEstimate {
  optimistic: number;
  likely: number;
  pessimistic: number;
}

export type EstimateInput = number | string | ThreePointEstimate;

export interface NormalizedEstimate {
  /** Numeric; set for point-like and three_point strategies. */
  points?: number;
  /** Jira originalEstimate string (e.g. "3d", "4h"); set for time-like strategies. */
  timeString?: string;
  /** Original preserved for description footer. */
  humanReadable: string;
  jiraTarget: JiraTarget;
}

export type NormalizeResult =
  { ok: true; value: NormalizedEstimate } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const POINT_LIKE: ReadonlySet<EstimationStrategy> = new Set([
  "story_points",
  "fibonacci",
  "planning_poker",
  "affinity",
]);

/**
 * Snap `n` to the nearest value in `scale`.
 * Exact tie (equidistant) → the **higher** value wins.
 */
export function snapToScale(n: number, scale: number[]): number {
  let best = scale[0];
  let bestDist = Math.abs(n - scale[0]);
  for (const v of scale) {
    const dist = Math.abs(n - v);
    if (dist < bestDist || (dist === bestDist && v > best)) {
      best = v;
      bestDist = dist;
    }
  }
  return best;
}

function isThreePoint(v: EstimateInput): v is ThreePointEstimate {
  return (
    typeof v === "object" && v !== null && "optimistic" in v && "likely" in v && "pessimistic" in v
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize an estimation input into a canonical form.
 *
 * Never throws — all errors are returned as `{ ok: false, error }`.
 * `jiraTarget` is always copied verbatim from `config`; the adapter decides
 * whether/where to write the value.
 */
export function normalizeEstimate(input: EstimateInput, config: EstimationConfig): NormalizeResult {
  const { strategy, jiraTarget, scale, sizeMap } = config;

  try {
    // ── Point-like strategies ─────────────────────────────────────────────
    if (POINT_LIKE.has(strategy)) {
      if (typeof input !== "number") {
        return {
          ok: false,
          error: `Strategy "${strategy}" requires a number input, got ${typeof input}`,
        };
      }
      const points = scale ? snapToScale(input, scale) : input;
      return {
        ok: true,
        value: { points, humanReadable: String(input), jiraTarget },
      };
    }

    // ── T-shirt sizing ────────────────────────────────────────────────────
    if (strategy === "t_shirt") {
      if (typeof input !== "string") {
        return {
          ok: false,
          error: `Strategy "t_shirt" requires a string input, got ${typeof input}`,
        };
      }
      if (!sizeMap || !(input in sizeMap)) {
        return { ok: false, error: `Unknown t-shirt size: "${input}"` };
      }
      return {
        ok: true,
        value: { points: sizeMap[input], humanReadable: input, jiraTarget },
      };
    }

    // ── Three-point (PERT) ────────────────────────────────────────────────
    if (strategy === "three_point") {
      if (!isThreePoint(input)) {
        return {
          ok: false,
          error: `Strategy "three_point" requires a ThreePointEstimate object, got ${typeof input}`,
        };
      }
      const { optimistic: o, likely: m, pessimistic: p } = input;
      const pert = (o + 4 * m + p) / 6;
      const points = scale ? snapToScale(pert, scale) : Math.round(pert);
      return {
        ok: true,
        value: {
          points,
          humanReadable: `o=${o}, m=${m}, p=${p}`,
          jiraTarget,
        },
      };
    }

    // ── Time-based strategies ─────────────────────────────────────────────
    if (strategy === "ideal_days") {
      if (typeof input !== "number") {
        return {
          ok: false,
          error: `Strategy "ideal_days" requires a number input, got ${typeof input}`,
        };
      }
      return {
        ok: true,
        value: {
          timeString: `${input}d`,
          humanReadable: `${input} ideal days`,
          jiraTarget,
        },
      };
    }

    if (strategy === "ideal_hours") {
      if (typeof input !== "number") {
        return {
          ok: false,
          error: `Strategy "ideal_hours" requires a number input, got ${typeof input}`,
        };
      }
      return {
        ok: true,
        value: {
          timeString: `${input}h`,
          humanReadable: `${input} ideal hours`,
          jiraTarget,
        },
      };
    }

    // Exhaustive guard — catches unknown strategies at runtime.
    return { ok: false, error: `Unknown strategy: ${strategy as string}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
