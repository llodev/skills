/**
 * Estimate helpers for `task.estimate.set`: the whole minutes ClickUp's native
 * `time_estimate` takes, and the slug of the `est:<slug>` tag.
 */
import type { EstimationStrategy } from "@llodev/pm-tasks-core/estimation";

/** Hours in one ideal day when `estimation.hoursPerDay` is unset (core's focused day). */
export const DEFAULT_HOURS_PER_DAY = 6;

/**
 * Core's normalizeEstimate yields a time only for these strategies, so only they
 * can target ClickUp's native time estimate; every other strategy yields points.
 */
export const TIME_STRATEGIES: ReadonlySet<unknown> = new Set<EstimationStrategy>([
  "ideal_hours",
  "ideal_days",
]);

/** The time strings core's normalizeEstimate emits (`<n>h`, `<n>d`), plus minutes. */
const TIME_STRING = /^(\d+(?:\.\d+)?)([mhd])$/;

const UNIT_MINUTES = { m: 1, h: 60 } as const;

/**
 * Minutes in `<n>m`, `<n>h` or `<n>d` (one day is `hoursPerDay` hours), rounded to a
 * whole minute: `"2h"` → 120, `"1.5d"` at 6 hours a day → 540. NaN for any other form
 * (a negative, NaN, Infinity or an exponent such as `1e-9h`); the caller rejects a
 * result that is not a positive whole number.
 */
export function toMinutes(timeString: string, hoursPerDay: number): number {
  const match = TIME_STRING.exec(timeString);
  if (!match) return Number.NaN;
  const unit = match[2] as "m" | "h" | "d";
  const perUnit = unit === "d" ? hoursPerDay * 60 : UNIT_MINUTES[unit];
  return Math.round(Number(match[1]) * perUnit);
}

/**
 * A tag-safe slug: lowercase, runs of anything but [a-z0-9] become one "-", no
 * leading or trailing "-". `"1.5 ideal days"` → `"1-5-ideal-days"`.
 */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      // The previous replace already collapsed runs to one dash, so no `+` here
      // (avoids polynomial ReDoS).
      .replace(/^-|-$/g, "")
  );
}
