## 3. Phase 2 — Compute the story

Every title sentence and every annotation comes from a number computed in code or SQL. Never estimate by eye.

### 3.1 The ChartStory contract

Each chart is specified by a library-agnostic contract. Fill the contract with the numbers first; then any adapter ([`SKILL.md`](../SKILL.md)) draws it.

```ts
export type ChartStory = {
  title: string; // the conclusion, with the number that matters
  subtitle: string; // what is measured, the unit, the period, and how to read it
  source?: string; // "SOURCE: …"
  form:
    | "time-bars"
    | "line"
    | "category-bars"
    | "units"
    | "slope"
    | "distribution"
    | "scatter"
    | "heatmap"
    | "funnel"
    | "map"
    | "table"
    | "kpi";
  highlight: { key: string | number; label: string; value: string }; // the protagonist
  reference?: { value: number; label: string }; // median, target, previous year
  annotations?: Array<{ key: string | number; text: string }>; // crossings, events
};
```

### 3.2 Story functions (TypeScript)

```ts
export const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Peak value versus the baseline (median). */
export function peakVsBaseline<T>(rows: T[], value: (r: T) => number) {
  const vals = rows.map(value);
  const index = vals.reduce((best, v, i) => (v > vals[best] ? i : best), 0);
  const baseline = median(vals);
  return { index, row: rows[index], peak: vals[index], baseline, factor: vals[index] / baseline };
}

/** Each item's share of the total, sorted from largest to smallest. */
export function shares<T>(rows: T[], value: (r: T) => number) {
  const total = rows.reduce((acc, r) => acc + value(r), 0);
  return rows
    .map((row) => ({ row, value: value(row), share: total ? value(row) / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Relative change; null when the baseline is zero. */
export const growth = (current: number, previous: number) =>
  previous === 0 ? null : (current - previous) / previous;

/** First index where `a` moves above `b` (after being equal or below). */
export function firstCrossing(a: number[], b: number[]): number {
  for (let i = 1; i < Math.min(a.length, b.length); i++) {
    if (a[i - 1] <= b[i - 1] && a[i] > b[i]) return i;
  }
  return -1;
}
```

### 3.3 Formatting and language (project locale)

Use `Intl` (or the project's i18n) — never concatenate separators by hand in JS/TS.

```ts
export function makeFormat(locale = "pt-BR", currency = "BRL") {
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const moneyFull = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const deltaFmt = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  });
  const delta = { format: (v: number) => deltaFmt.format(v).replace("-", "−") }; // "−15%"
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const month = (d: Date) => monthFmt.format(d).replace(".", "").toUpperCase(); // "MAI"
  const day = (d: Date) => `${d.getUTCDate()} ${month(d).toLowerCase()}`; // "28 nov"
  return { money, moneyFull, num, pct, delta, month, day };
}

/** "5 times", "5,7 times": rounds to an integer only when it is within 0.15 of one. */
export const times = (factor: number, f = makeFormat()) =>
  Math.abs(factor - Math.round(factor)) < 0.15
    ? `${Math.round(factor)} times`
    : `${f.num.format(factor)} times`;
```

Writing conventions (adapt them to the project's language):

- Compact values in annotations (`R$ 78,4 mil`, `R$ 1,3 mi`), the full value in the tooltip.
- Deltas with a sign (`+203%`, `−8%`) and **always with the baseline** ("vs. 2024", "vs. a normal month").
- Short dates (`28 nov`, `week 26`); axis months abbreviated in uppercase (`JAN FEV MAR`).
- 2–3 significant figures in text; do not show `R$ 78.412,37` in an annotation.

### 3.4 Conclusion titles computed from the data

Titles on dashboards with a filter **must be functions of the data**, with an honest fallback:

```ts
export function peakTitle(factor: number, eventName: string | undefined, f = makeFormat()) {
  if (factor >= 1.5)
    return `${eventName ?? "The peak"} sold ${times(factor, f)} more than a normal day`;
  return "Daily sales stayed flat over the period";
}

export function overtakeTitle(
  name: string,
  rival: string,
  factor: number,
  crossingLabel: string | null,
  f = makeFormat(),
) {
  const grew = `${name} grew ${times(factor, f)}`;
  return crossingLabel ? `${grew} and passed ${rival} in ${crossingLabel}` : grew;
}
```

Rules: the title contains the subject and the number; it is true for the current slice; it rounds honestly (5.09 → "5 times"; 5.6 → "5,6 times"); if there is no strong pattern, it states what is there (stability, a typical range) instead of falling back to a descriptive label. Also check **qualitative** claims ("the largest channel", "tripled", "driven by the app"): each one needs a calculation that supports it, the same as the numbers.

### Values the functions return that you must not print

`median([])` is `NaN`. On no rows, `peakVsBaseline` still returns index `0` and a `factor` of `NaN` (`reduce` keeps the initial `0`, and `vals[0]` is missing). A zero baseline makes `factor` `Infinity` when the peak is not zero, and `NaN` when the peak is also zero. `growth` already returns `null` when the previous value is zero. Do not pass `NaN` or `Infinity` to `times` or `peakTitle` — `Infinity >= 1.5` is true, so the title would say the peak sold infinity times more.

- **Empty slice**: do not call the chart. No highlight and no median line. The title says why this slice is empty, not the previous conclusion.
- **Zero baseline**: do not write "times" and do not claim the series "stayed flat." State the absolute peak and that the baseline was zero.
- **Tie**: the `>` reduction keeps the earliest row. Name one day only when its value is strictly greater than every other row. When several rows share the max, the title states the tie count, not a single date.

### 3.5 SQL for the story (compute in the database when the volume is large)

PostgreSQL — complete daily series (days with no sales become zero), median, factor, and peak flag:

```sql
WITH days AS (
  SELECT d::date AS day
  FROM generate_series(DATE '2025-01-01', DATE '2025-12-31', INTERVAL '1 day') AS d
), daily AS (
  SELECT days.day, COALESCE(SUM(o.amount), 0) AS revenue
  FROM days
  LEFT JOIN orders o
    ON o.created_at >= days.day AND o.created_at < days.day + 1
  GROUP BY days.day
), base AS (
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY revenue) AS median_revenue FROM daily
)
SELECT daily.day,
       daily.revenue,
       base.median_revenue,
       daily.revenue / NULLIF(base.median_revenue, 0)  AS factor_vs_median,
       daily.revenue = MAX(daily.revenue) OVER ()        AS is_peak
FROM daily CROSS JOIN base
ORDER BY daily.day;
```

Share and growth by category (current year vs. previous):

```sql
SELECT channel,
       SUM(amount) FILTER (WHERE created_at >= DATE '2025-01-01')                              AS revenue_2025,
       SUM(amount) FILTER (WHERE created_at <  DATE '2025-01-01')                              AS revenue_2024,
       SUM(amount) FILTER (WHERE created_at >= DATE '2025-01-01')
         / NULLIF(SUM(SUM(amount) FILTER (WHERE created_at >= DATE '2025-01-01')) OVER (), 0)  AS share_2025,
       SUM(amount) FILTER (WHERE created_at >= DATE '2025-01-01')
         / NULLIF(SUM(amount) FILTER (WHERE created_at < DATE '2025-01-01'), 0) - 1            AS growth
FROM orders
WHERE created_at >= DATE '2024-01-01' AND created_at < DATE '2026-01-01'
GROUP BY channel
ORDER BY revenue_2025 DESC;
```

First week in which one series passes the other:

```sql
WITH w AS (
  SELECT week,
         SUM(users) FILTER (WHERE plan = 'pro')   AS pro,
         SUM(users) FILTER (WHERE plan = 'basic') AS basic
  FROM weekly_active_users
  GROUP BY week
), x AS (
  SELECT week, pro, basic,
         LAG(pro) OVER (ORDER BY week) AS prev_pro, LAG(basic) OVER (ORDER BY week) AS prev_basic
  FROM w
)
SELECT MIN(week) AS crossing_week FROM x WHERE prev_pro <= prev_basic AND pro > basic;
```

Median equivalents by dialect: ClickHouse `median(x)` / `quantileExact(0.5)(x)`; SQL Server `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) OVER ()`; Db2, Oracle, and Snowflake `MEDIAN(x)`; BigQuery `PERCENTILE_CONT(x, 0.5) OVER ()`; MySQL 8 has no native median (use `ROW_NUMBER`/`COUNT` or compute in the application). For complete series: ClickHouse `WITH FILL`, SQL Server/Db2 a calendar table or a recursive CTE.

---
