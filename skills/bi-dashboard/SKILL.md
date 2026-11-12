---
name: bi-dashboard
description: >-
  Designs dashboards, charts, and KPI cards that state one conclusion in
  seconds: a conclusion title, a single highlight, and the explanation
  written on the mark. Use when creating, refactoring, or reviewing
  dashboards and charts in any stack — React and shadcn, Recharts, ECharts,
  Vega-Lite, Altair, Plotly, matplotlib, ggplot2, SQL, Power BI, Looker
  Studio, Metabase, Superset, or Grafana. Discover the project design
  system before picking a color. Triggers include dashboard, chart, KPI,
  gráfico, storytelling, conclusion title, annotation, and BI.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - bi
    - dashboard
    - chart
  family: bi
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# Dashboards that explain themselves

This skill guides the design and implementation of dashboards and charts that communicate **one conclusion in seconds**. The quality bar is: a glance reads the title, sees the highlight, and understands the message before reading a single axis.

It applies to any project and stack. The visual (colors, fonts, radii, light/dark theme, components) **is not fixed**: it comes from the project's design system, discovered during exploration, or from the direction of whoever invoked the skill. What is fixed are the communication principles and the process.

## How to use this skill

Follow the phases in order. Do not skip exploration or the story calculation.

| Phase                  | Output                                                      |
| ---------------------- | ----------------------------------------------------------- |
| 0. Project exploration | Technical context + token map (section 1)                   |
| 1. Brief               | Question, audience, decisions, metrics (section 2)          |
| 2. Story calculation   | Verified numbers and one `ChartStory` per chart (section 3) |
| 3. Design              | Form of each chart + page layout (sections 4–7)             |
| 4. Implementation      | Code in the project's pattern (sections 8–9)                |
| 5. Verification        | Real render + tests + checklist (sections 10–11)            |

If the user asks for only one chart, the phases shrink, but they stay in the same order. If they ask for a review of an existing dashboard, run exploration and the checklist (section 11) on it and propose prioritized changes.

---

## 1. Phase 0 — Explore the project

Before writing code, find out what already exists. The precedence rule is:

**explicit user direction > the project's design system > libraries/patterns already used in the project > this skill's patterns.**

### 1.1 Stack and where the dashboard lives

Search and read (when they exist):

- **JS/TS**: `package.json` (React, Next.js, Vue, Svelte, Angular; chart libs: `recharts`, `echarts`, `@nivo/*`, `chart.js`, `highcharts`, `@visx/*`, `vega-lite`, `plotly.js`), `components.json` (shadcn/ui), `tsconfig.json` (aliases such as `@/`), the `components/ui/` folder (is there a `chart.tsx`? a `card.tsx`?).
- **Python**: `pyproject.toml`, `requirements*.txt`, notebooks (`plotly`, `matplotlib`, `seaborn`, `altair`, `streamlit`, `dash`, `panel`), `.streamlit/config.toml`, `matplotlibrc`.
- **R**: `DESCRIPTION`, `renv.lock`, `*.Rmd`/`*.qmd` (`ggplot2`, `shiny`, `plotly`).
- **BI**: `.pbix`/`.pbip`/TMDL files (Power BI), exported dashboards from Metabase, Superset, Looker Studio, Grafana (JSON).
- **Data**: where it comes from (SQL directly, ORM, API, CSV/Parquet, warehouse), SQL dialect, granularity, time zone, currency.
- **Conventions**: folder structure, naming, lint/format, existing tests, i18n (`next-intl`, `i18next`, `locale` in config).

Use the chart library **the project already uses**. Introduce a new one only if there is none or the user asks; in that case, choose by stack (section 9.0) and justify it in one line.

### 1.2 Design system → token map

Find the visual sources of truth:

| Ecosystem                    | Where to look                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| shadcn/ui + Tailwind v4      | `globals.css`/`app.css`: `:root` and `.dark` with `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--chart-1…5`, `--radius`; `@theme inline` |
| Tailwind v3                  | `tailwind.config.*` (`theme.extend.colors`, `fontFamily`, `borderRadius`) + HSL variables in CSS (`hsl(var(--chart-1))`)                                                                         |
| MUI / Chakra / Mantine / Ant | theme object (`createTheme`, `extendTheme`, `MantineProvider`, `ConfigProvider`)                                                                                                                 |
| Dedicated tokens             | `tokens.json`, Style Dictionary, Figma tokens, `design-tokens/`                                                                                                                                  |
| Python/R                     | Plotly theme (`pio.templates`), `matplotlibrc`/styles, ggplot `theme_*()`, Streamlit `config.toml`                                                                                               |
| BI                           | Power BI JSON theme, Metabase/Superset theme, corporate palette                                                                                                                                  |

Also identify: the dark-theme mechanism (`.dark` class, `data-theme`, `prefers-color-scheme`), the interface font and whether it has tabular numerals, the default radius and spacing, and existing card/table/filter components.

Translate what you found into **roles**. Chart code uses the roles, never the raw colors:

| Role                    | What it is                             | How to infer                                                                                                                                            |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ink`                   | titles and values                      | project foreground                                                                                                                                      |
| `muted`                 | subtitles, axes, context labels        | muted-foreground / secondary text                                                                                                                       |
| `context`               | marks that serve as comparison         | a system gray (or `muted-foreground` at 30–45% opacity)                                                                                                 |
| `reference`             | median/target lines                    | `muted` with a dashed stroke                                                                                                                            |
| `highlight`             | the protagonist mark                   | a **saturated** brand color: `--chart-1` or `--primary` if it is chromatic; if the primary is neutral (black/gray), use the first saturated chart color |
| `highlight-text`        | annotation text in the highlight color | `highlight` if it has contrast ≥ 4.5:1 against the card background; otherwise a darker variant (light theme) or a lighter one (dark theme)              |
| `highlight-soft`        | shaded bands, areas                    | `highlight` at 10–15% opacity                                                                                                                           |
| `positive` / `negative` | unambiguous good/bad signal            | system semantic tokens (success/destructive)                                                                                                            |
| `surface` / `page`      | card and page background               | card / background                                                                                                                                       |

Map rules:

- `highlight` **must not** be the semantic error color (red) unless the highlight is something bad. If the brand is red, say so and prefer another system color or the less semantic brand tone.
- Validate contrast: text ≥ 4.5:1 (≥ 3:1 if large/bold), essential graphical marks ≥ 3:1 against the background. `context` may have low contrast on purpose, as long as the essential information is in the highlight and the annotations.
- Do not assume `--chart-1` (or the first chart token) is the best highlight color: in several themes it is a light, low-contrast tone. Choose the saturated chart token that passes contrast.
- Validate both themes if the project has a dark theme.
- **Fallback** (only if there is no design system and no user direction): `ink #1A1A1A`, `muted #6B6B6B`, `context #C4C4C4`, `reference #8A8A8A`, `highlight #E8590C`, `highlight-text #C2410C`, `surface #FFFFFF`, `page #F4F4F2`; dark: `ink #F2F2F2`, `muted #A0A3A8`, `context #4A4D52`, `highlight #FF7A1A`, `surface #1C1E22`, `page #0F1115`. Font: the system sans-serif (`Inter`, `system-ui`).

### 1.3 Exploration output

Record a few lines (in the chat or in the PR) before implementing:

```
Stack: Next.js 15 + shadcn/ui (Tailwind v4) + Recharts 3 — use components/ui/chart.tsx
Data: Postgres via Drizzle; daily sales in orders.amount (BRL, America/Sao_Paulo)
Tokens: highlight=var(--chart-1) · context=var(--muted-foreground)/35% · surface=var(--card) · dark via .dark
Locale: pt-BR · currency BRL · Geist font (tabular-nums available)
Decisions: reuse <Card>; filters in components/filters/date-range.tsx
```

If something essential cannot be discovered (audience, main question, data source), ask **once**, concretely. Assume the rest and state the assumption.

---

## 2. Phase 1 — Brief

Answer before choosing charts:

1. **What decision or question** does the dashboard support? (e.g. "was the November campaign worth the investment?")
2. **Who reads it** and how often? (weekly leadership, real-time operations, end customer)
3. **Which metrics** answer the question, with an exact definition (formula, filter, time zone, currency).
4. **What is the comparison baseline** for each metric (period median, target, same period last year, peer average).
5. **Granularity and period** (day/week/month; last 12 months; closed year).
6. **Required interactions** (filters, drill-down, export) — only those that change a decision.

A dashboard answers **one main question**. Different questions become different pages or tabs.

---

## 3. Phase 2 — Compute the story

Every title sentence and every annotation comes from a number computed in code or SQL. Never estimate by eye.

### 3.1 The ChartStory contract

Each chart is specified by a library-agnostic contract. Fill the contract with the numbers first; then any adapter (section 9) draws it.

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

Rules: the title contains the subject and the number; it is true for the current slice; it rounds honestly (5.09 → "5 times"; 5.6 → "5.6 times"); if there is no strong pattern, it states what is there (stability, a typical range) instead of falling back to a descriptive label. Also check **qualitative** claims ("the largest channel", "tripled", "driven by the app"): each one needs a calculation that supports it, the same as the numbers.

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

## 4. The four rules of every chart

### Rule 1 — The title is the conclusion

| Descriptive (avoid) | Conclusion (use)                                      |
| ------------------- | ----------------------------------------------------- |
| Daily sales         | Black Friday sold 5 times more than a normal day      |
| Monthly sales       | March sold 51% above a normal month                   |
| Revenue by channel  | The app tripled and accounted for 84% of the growth   |
| Users by plan       | Pro grew 5.7 times and passed Basic in week 26        |
| Costs by category   | Payroll consumes 42% of everything the company spends |

Three text layers, left-aligned on the same margin:

1. **Title** — the conclusion, 1–2 lines, strong weight.
2. **Subtitle** — what is measured + how to read it: "Daily sales in 2025 · each bar is one day"; "Costs by category · each square = 1% of the R$ 3 mi total".
3. **Footer** — source and notes, small, discreet.

### Rule 2 — Color leads the eye

- Everything that is context goes in `context` (gray). The title's protagonist goes in `highlight`.
- **One** protagonist per chart; two only when the story really has two protagonists.
- The highlight is consistent: the bar, the category label, the annotated value, and (optionally) the title keyword use the same color.
- The same entity has the same color across the whole dashboard.
- Never one color per series "just because". Many series: all of them thin in `context`, the protagonist in `highlight` with a direct label.
- Semantic colors (`positive`/`negative`) only for unambiguous good/bad, always with a sign or text alongside.

### Rule 3 — Remove what does not help the reader

- No background grid. At most the zero line or a reference line that means something.
- Hide the Y axis when the key values are annotated; keep it when the reader needs to read arbitrary values (operations, analysis).
- Minimal ticks: abbreviated months instead of full dates; few values on the axis when it exists.
- No legend when you can label directly; a long legend is a sign to redesign.
- No 3D, gradients, heavy shadows, borders on every element, markers on every point.
- **The form can be noise too**: a noisy daily series as a line becomes a scribble; thin bars (one per day) show each day's volume and make the peak pop. Change the form when it does not answer the question (section 5).

### Rule 4 — Write the explanation on the chart

- An important value **beside** the important point, in `highlight-text`: a large value (`R$ 78,4 MIL`) + one line of context (`28 nov · 5 times a normal day`).
- A reference line labeled on the line itself: `normal day (median) · R$ 15,4 mil` — that is what gives meaning to the "5 times".
- A direct label at the end of the lines (`Pro 8.550`), values on the bars when there are ≤ 12 categories.
- Annotate crossings and events at the exact point (`week 26 · Pro passes Basic`).
- Annotations of ≤ 2 lines, close to the element, without covering data.

---

## 5. Choose the form from the data and the question

| Data / question                                       | Form                                                           | How to highlight                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Long time series: "did any period break from normal?" | Thin bars per period                                           | Event bar in `highlight`, dashed median, annotation                             |
| Time series: "how did it evolve? who passed whom?"    | Line (2–5 series)                                              | Colored protagonist, the rest `context`, label at the end, mark at the crossing |
| Series with many entities (years, stores, SKUs)       | Thin `context` lines + 1 highlighted + dotted average          | Direct labels on the highlighted series and on the average                      |
| Categories (≤ 12): "which one stood out?"             | Sorted bars (horizontal if the names are long)                 | Protagonist bar and its label in `highlight`, values on the bars                |
| Before × after by category                            | Bars with a marker for the previous period, slope, or dumbbell | Annotated change (`+203%`)                                                      |
| Part of a whole                                       | Sorted bars or a unit chart (each square = 1%)                 | Protagonist category colored; avoid a pie with > 3 slices                       |
| Distribution                                          | Histogram, density, boxplot, strip                             | Band or group of interest colored                                               |
| Relationship between measures                         | Scatter                                                        | Group/quadrant in `highlight-soft` (shaded area), labels on the relevant points |
| Time × group matrix (cohorts, hour × day)             | Single-color sequential heatmap                                | Relevant cell/row with an outline or annotation                                 |
| Funnel                                                | Cascading horizontal bars with the pass-through rate           | Stage with the largest loss in `highlight`                                      |
| Geographic                                            | Monochrome choropleth or symbol map                            | Protagonist region in `highlight`, the rest neutral                             |
| Exact values for lookup                               | Compact table with inline bars and a highlighted row           | Column sorted by the story metric                                               |
| One number matters                                    | KPI card                                                       | Delta with an explicit baseline                                                 |

Avoid: pie/donut with many slices, 3D, dual axes (use two aligned charts), radar, gauges, stacked area with many layers, a giant table as the main visual.

---

## 6. Perception principles in practice

- **Closure**: the reader completes incomplete shapes; that is why the axis, frame, separators, and grid can go without hurting reading.
- **Common region**: what sits inside the same area is one group. Group related KPIs on the same background (instead of a border per number); shade the part of the chart that matters (forecast period, campaign window, quadrant). Borders on every element fragment the dashboard.
- **Continuity**: the eye follows lines and alignments. Align charts that share time on the same axis and scale; let the reference line run across the chart.
- **Proximity**: the label sits against the mark; the title sits against the chart; more space **between** groups than **inside** them.
- **Similarity**: same color/shape = the same thing across the whole dashboard.
- **Preattentive processing (figure and ground)**: one element that differs in color, size, or weight pops out before conscious reading — and the effect disappears when everything is different.

---

## 7. Dashboard layout and components

### 7.1 Page hierarchy

1. **Header**: the dashboard's conclusion title ("Revenue grew 18% in 2025, driven by the app"), subtitle (period, slice, refresh), discreet global filters.
2. **KPI band**: 3–5 numbers that answer the main question, grouped by theme.
3. **Protagonist chart**: proves the dashboard title; full width or 2/3.
4. **Supporting charts**: 2–4, each with its own conclusion title, explaining the why.
5. **Detail** (optional): a table for checking.

A 12-column grid with the design system's spacing; ~6–9 visuals per screen at most; charts that share a time axis stay aligned; on narrow screens, stack them in hierarchy order.

### 7.2 KPI card

```
REVENUE 2025                ← label (muted, small)
R$ 18,4 mi                  ← value (ink, large, tabular-nums)
+18% vs. 2024               ← delta WITH an explicit baseline
▁▂▂▃▂▃▄▃▄▅▆█                ← optional sparkline: context, last point in highlight
```

Delta neutral by default; `positive`/`negative` only when good/bad is unambiguous, always with a sign. Optionally, a short sentence in place of the delta ("best month of the year").

### 7.3 Chart card

Use the project's card component. Inside: title → subtitle → chart → footer, all on the same left margin. No extra border when the card background already separates it from the page.

### 7.4 Interaction and states

- **Dynamic titles and highlights**: recomputed on every filter by the section 3 functions.
- The **tooltip** carries the exact detail; the essential is already annotated.
- Hover/selection emphasizes the entity and dims the others (the same highlight logic).
- Filters with a visible state ("2025 · All channels").
- Loading (a skeleton in the card's shape), empty (a sentence explaining why), and error (message + action) states.
- A short animation (≤ 300 ms) only on transitions; no decorative animation on load.

### 7.5 Accessibility

- `aria-label`/`<figcaption>` with the title's conclusion and the key value; offer the data table (or a download) as an alternative.
- Meaning never by color alone: the highlight also uses a label, weight, or position.
- Keyboard focus on the controls; accessible tooltips when the library allows (e.g. `accessibilityLayer` in Recharts).
- Respect `prefers-reduced-motion`.

---

## 8. Phase 4 — Implement in the project

1. **Data layer**: a query/endpoint that already returns the complete series (no gaps), at the right granularity, aggregated in the database when the volume is large.
2. **Story layer**: pure functions (section 3) that produce the `ChartStory`. They stay testable and reusable (e.g. `lib/chart-story.ts`, `analytics/story.py`).
3. **Visual layer**: components that receive `data` + `story` + formatters and only draw. No business rule inside the component.
4. **Tokens**: components read the roles (section 1.2) through CSS variables, the library theme, or project constants — never a loose hex in the component.
5. **Composition**: build the page with the existing layout components (grid, card, filters).
6. **Tests**: test the story functions (peak, median, crossing, title with fallback) with edge cases (empty series, zero baseline, tie, filter with no data).

Typical structure in a React app:

```
lib/chart-story.ts            ← median, peakVsBaseline, shares, growth, firstCrossing, makeFormat, titles
components/charts/peak-bars.tsx
components/charts/highlight-line.tsx
components/charts/ranked-bars.tsx
components/dashboard/kpi-card.tsx
app/(dashboard)/sales/page.tsx
```

---

## 9. Recipes by stack

Every recipe implements the same story: daily bars in `context`, the peak in `highlight`, a labeled dashed median, an annotation beside the peak, no grid and no Y axis. Adapt the names and the tokens to the project.

### 9.0 Capability map (for any library)

Every library has to do five things. If the project's library is not below, look up the equivalent:

| Capability     | Recharts / shadcn                      | ECharts                                    | Vega-Lite / Altair          | Plotly                            | matplotlib                     | ggplot2                               | Chart.js                | Highcharts              |
| -------------- | -------------------------------------- | ------------------------------------------ | --------------------------- | --------------------------------- | ------------------------------ | ------------------------------------- | ----------------------- | ----------------------- |
| Color per item | `<Cell fill>`                          | `itemStyle` per datum                      | `color` with `condition`    | `marker_color` list               | `color=` list                  | `fill` + `scale_fill_manual`          | `backgroundColor` array | `point.color` / `zones` |
| Reference line | `<ReferenceLine>`                      | `markLine`                                 | `rule` layer                | `add_hline`                       | `axhline`                      | `geom_hline`                          | annotation plugin       | `plotLines`             |
| Annotated text | `<ReferenceDot label>` / `<LabelList>` | `markPoint.label`                          | `text` layer                | `add_annotation`                  | `annotate`                     | `annotate("text")`                    | annotation plugin       | annotations module      |
| Shaded band    | `<ReferenceArea>`                      | `markArea`                                 | `rect`                      | `add_vrect`                       | `axvspan`                      | `annotate("rect")`                    | annotation plugin (box) | `plotBands`             |
| No grid / axis | omit `<CartesianGrid>`, `<YAxis hide>` | `splitLine.show=false`, `yAxis.show=false` | `axis: null`, `grid: false` | `showgrid=False`, `visible=False` | `spines`, `set_visible(False)` | `theme(panel.grid = element_blank())` | `grid.display=false`    | `gridLineWidth: 0`      |

Choosing a library when the project has none: React + shadcn/ui → **shadcn charts (Recharts)**; web with many points (>10 thousand) or heavy interaction → **ECharts**; a portable spec or notebooks → **Vega-Lite/Altair**; analytical Python → **Plotly** (interactive) or **matplotlib** (static); R → **ggplot2**.

### 9.1 React + shadcn/ui charts (Recharts) — TypeScript

Assumes the shadcn/ui `Card` and `Chart` components are installed (`components/ui/card.tsx`, `components/ui/chart.tsx`). In Tailwind v4 the tokens are used as `var(--chart-1)`; in v3, as `hsl(var(--chart-1))`. `ChartContainer` exposes each `config` key as `--color-<key>`.

```tsx
"use client";

import { Bar, BarChart, Cell, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { makeFormat, peakTitle, peakVsBaseline, times } from "@/lib/chart-story";

export type DailyPoint = { date: string; value: number }; // date as ISO "2025-11-28"

const chartConfig = {
  value: { label: "Sales", color: "var(--chart-1)" },
  context: { label: "Context", color: "var(--muted-foreground)" },
  highlight: { label: "Highlight", color: "var(--chart-1)" },
} satisfies ChartConfig;

type PeakLabelProps = { viewBox?: { x?: number; y?: number }; value: string; note: string };

function PeakLabel({ viewBox, value, note }: PeakLabelProps) {
  const x = (viewBox?.x ?? 0) - 8;
  const y = viewBox?.y ?? 0;
  return (
    <g>
      <text
        x={x}
        y={y + 18}
        textAnchor="end"
        style={{ fill: "var(--color-highlight)", fontSize: 22, fontWeight: 800 }}
      >
        {value}
      </text>
      <text
        x={x}
        y={y + 36}
        textAnchor="end"
        style={{ fill: "var(--color-highlight)", fontSize: 12 }}
      >
        {note}
      </text>
    </g>
  );
}

export function PeakBarsCard({
  data,
  eventName,
  subtitle,
  source,
  locale = "pt-BR",
  currency = "BRL",
}: {
  data: DailyPoint[];
  eventName?: string;
  subtitle: string;
  source?: string;
  locale?: string;
  currency?: string;
}) {
  const f = makeFormat(locale, currency);
  const { index, row, peak, baseline, factor } = peakVsBaseline(data, (d) => d.value);
  const monthTicks = data.filter((d) => d.date.endsWith("-01")).map((d) => d.date);
  const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-extrabold leading-tight">
          {peakTitle(factor, eventName, f)}
        </CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
            barCategoryGap="30%"
          >
            <XAxis
              dataKey="date"
              ticks={monthTicks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(iso: string) => f.month(toDate(iso))}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(iso) => f.day(toDate(String(iso)))}
                  formatter={(v) => f.moneyFull.format(Number(v))}
                  hideIndicator
                />
              }
            />
            <ReferenceLine
              y={baseline}
              stroke="var(--color-context)"
              strokeDasharray="3 3"
              label={{
                value: `normal day (median) · ${f.money.format(baseline)}`,
                position: "insideBottomLeft",
                fill: "var(--color-context)",
                fontSize: 11,
                stroke: "var(--card)",
                strokeWidth: 4,
                paintOrder: "stroke",
              }}
            />
            <Bar dataKey="value" isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell
                  key={d.date}
                  fill={i === index ? "var(--color-highlight)" : "var(--color-context)"}
                  fillOpacity={i === index ? 1 : 0.35}
                />
              ))}
            </Bar>
            <ReferenceDot
              x={row.date}
              y={peak}
              r={0}
              label={
                <PeakLabel
                  value={f.money.format(peak).toUpperCase()}
                  note={`${f.day(toDate(row.date))} · ${times(factor, f)} a normal day`}
                />
              }
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      {source && (
        <CardFooter className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {source}
        </CardFooter>
      )}
    </Card>
  );
}
```

Line with a protagonist, a direct label at the end, and a mark at the crossing:

```tsx
"use client";

import { CartesianGrid, LabelList, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { firstCrossing, makeFormat, overtakeTitle } from "@/lib/chart-story";

type Row = { week: number } & Record<string, number>;

export function HighlightLineCard({
  data,
  series,
  highlight,
  rival,
  subtitle,
  source,
  locale = "pt-BR",
}: {
  data: Row[];
  series: string[];
  highlight: string;
  rival: string;
  subtitle: string;
  source?: string;
  locale?: string;
}) {
  const f = makeFormat(locale);
  const h = data.map((r) => r[highlight]);
  const crossing = firstCrossing(
    h,
    data.map((r) => r[rival]),
  );
  const factor = h[h.length - 1] / h[0];
  const title = overtakeTitle(
    highlight,
    rival,
    factor,
    crossing >= 0 ? `week ${data[crossing].week}` : null,
    f,
  );
  const last = data.length - 1;
  const config = Object.fromEntries(
    series.map((k) => [
      k,
      { label: k, color: k === highlight ? "var(--chart-1)" : "var(--muted-foreground)" },
    ]),
  ) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-extrabold leading-tight">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 24, right: 96, left: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} horizontal={false} />
            <XAxis
              dataKey="week"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={[1, 13, 26, 39, 52]}
              tickFormatter={(w: number) => `wk ${w}`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent labelFormatter={(_, p) => `week ${p?.[0]?.payload?.week}`} />
              }
            />
            {series.map((k) => (
              <Line
                key={k}
                dataKey={k}
                type="monotone"
                dot={false}
                isAnimationActive={false}
                stroke={`var(--color-${k})`}
                strokeWidth={k === highlight ? 3 : 1.5}
                strokeOpacity={k === highlight ? 1 : 0.5}
              >
                <LabelList
                  dataKey={k}
                  content={(p) =>
                    p.index === last ? (
                      <text
                        x={Number(p.x) + 8}
                        y={Number(p.y)}
                        dominantBaseline="middle"
                        style={{
                          fill:
                            k === highlight ? "var(--color-" + k + ")" : "var(--muted-foreground)",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {`${k} ${f.num.format(Number(p.value))}`}
                      </text>
                    ) : null
                  }
                />
              </Line>
            ))}
            {crossing >= 0 && (
              <ReferenceDot
                x={data[crossing].week}
                y={h[crossing]}
                r={4}
                fill={`var(--color-${highlight})`}
                stroke="none"
                label={{
                  value: `week ${data[crossing].week} · ${highlight} passes ${rival}`,
                  position: "top",
                  offset: 12,
                  fill: `var(--color-${highlight})`,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
      {source && (
        <CardFooter className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {source}
        </CardFooter>
      )}
    </Card>
  );
}
```

Ranked horizontal bars with a marker for the previous period and the change annotated:

```tsx
"use client";

import { Bar, Cell, ComposedChart, LabelList, Scatter, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { growth, makeFormat } from "@/lib/chart-story";

export type RankedItem = { name: string; value: number; previous?: number };

const rankedConfig = {
  value: { label: "Current", color: "var(--muted-foreground)" },
  previous: { label: "Previous", color: "var(--foreground)" },
  highlight: { label: "Highlight", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RankedBarsCard({
  items,
  highlight,
  title,
  subtitle,
  source,
  locale = "pt-BR",
  currency = "BRL",
}: {
  items: RankedItem[];
  highlight: string;
  title: string;
  subtitle: string;
  source?: string;
  locale?: string;
  currency?: string;
}) {
  const f = makeFormat(locale, currency);
  const data = [...items]
    .sort((a, b) => b.value - a.value)
    .map((d) => {
      const g = d.previous === undefined ? null : growth(d.value, d.previous);
      return {
        ...d,
        label:
          g === null
            ? f.money.format(d.value)
            : `${f.money.format(d.value)} · ${f.delta.format(g)}`,
      };
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-extrabold leading-tight">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={rankedConfig}
          className="aspect-auto w-full"
          style={{ height: data.length * 44 + 16 }}
        >
          <ComposedChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 140, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={96}
              tickLine={false}
              axisLine={false}
              tick={({ x, y, payload }) => (
                <text
                  x={Number(x) - 8}
                  y={Number(y)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 12,
                    fontWeight: payload.value === highlight ? 700 : 400,
                    fill:
                      payload.value === highlight
                        ? "var(--color-highlight)"
                        : "var(--muted-foreground)",
                  }}
                >
                  {payload.value}
                </text>
              )}
            />
            <Bar dataKey="value" barSize={14} radius={3} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={d.name === highlight ? "var(--color-highlight)" : "var(--color-value)"}
                  fillOpacity={d.name === highlight ? 1 : 0.35}
                />
              ))}
              <LabelList
                dataKey="label"
                content={(p) => {
                  const d = data[Number(p.index)];
                  // the label starts after whichever is farther right: the bar or the previous-period marker
                  const reach = d && d.value > 0 ? Math.max(1, (d.previous ?? 0) / d.value) : 1;
                  return (
                    <text
                      x={Number(p.x) + Number(p.width) * reach + 8}
                      y={Number(p.y) + Number(p.height) / 2}
                      dominantBaseline="middle"
                      style={{
                        fontSize: 12,
                        fontWeight: data[Number(p.index)]?.name === highlight ? 700 : 400,
                        fill:
                          data[Number(p.index)]?.name === highlight
                            ? "var(--color-highlight)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {p.value}
                    </text>
                  );
                }}
              />
            </Bar>
            <Scatter
              dataKey="previous"
              isAnimationActive={false}
              shape={(p: { cx?: number; cy?: number }) => (
                <rect
                  x={(p.cx ?? 0) - 1}
                  y={(p.cy ?? 0) - 10}
                  width={2}
                  height={20}
                  fill="var(--color-previous)"
                />
              )}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      {source && (
        <CardFooter className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {source}
        </CardFooter>
      )}
    </Card>
  );
}
```

The subtitle explains the marker: "Revenue by channel in 2025 · stroke = 2024". A shaded band on any cartesian chart: `<ReferenceArea x1={start} x2={end} fill="var(--color-highlight)" fillOpacity={0.12} />`.

KPI card with shadcn:

```tsx
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  delta,
  base,
}: {
  label: string;
  value: string;
  delta?: string;
  base?: string;
}) {
  return (
    <Card className="gap-1 py-4 shadow-none">
      <CardHeader className="px-5">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums">{value}</CardTitle>
      </CardHeader>
      {delta && (
        <CardFooter className="px-5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{delta}</span>&nbsp;{base}
        </CardFooter>
      )}
    </Card>
  );
}
```

To group related KPIs on a single background (common region), put them inside **one** `Card` with an internal grid, instead of one `Card` per number.

### 9.2 ECharts — TypeScript (React, Vue, Angular, or vanilla)

The ECharts canvas does not understand `var(--…)` nor, in every operation, `oklch()`. Resolve the tokens to `rgb` first:

```ts
import type { EChartsOption } from "echarts";

/** Converts any CSS color (including var(--x) and oklch) into rgb(a) the canvas can read. */
export function resolveColor(css: string, el: HTMLElement = document.documentElement): string {
  const probe = document.createElement("span");
  probe.style.color = css;
  el.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

export type Roles = {
  ink: string;
  muted: string;
  context: string;
  highlight: string;
  highlightText: string;
  font: string;
};

export const readRoles = (): Roles => ({
  ink: resolveColor("var(--foreground)"),
  muted: resolveColor("var(--muted-foreground)"),
  context: resolveColor("color-mix(in oklab, var(--muted-foreground) 35%, transparent)"),
  highlight: resolveColor("var(--chart-1)"),
  highlightText: resolveColor("var(--chart-1)"),
  font: getComputedStyle(document.body).fontFamily, // the canvas does not accept "inherit"
});

export function peakBarsOption(
  dates: string[],
  values: number[],
  s: {
    title: string;
    subtitle: string;
    baseline: number;
    baselineLabel: string;
    peakIndex: number;
    peakValue: string;
    peakNote: string;
  },
  c: Roles,
  month: (iso: string) => string,
  money: (v: number) => string,
): EChartsOption {
  return {
    animation: false,
    textStyle: { fontFamily: c.font },
    title: {
      left: 0,
      text: s.title,
      subtext: s.subtitle,
      textStyle: { fontSize: 20, fontWeight: 800, color: c.ink },
      subtextStyle: { fontSize: 12, color: c.muted },
    },
    grid: { left: 8, right: 8, top: 88, bottom: 28, containLabel: true },
    tooltip: { trigger: "axis", valueFormatter: (v) => money(Number(v)) },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: c.muted,
        fontSize: 11,
        interval: (_i: number, v: string) => v.endsWith("-01"),
        formatter: month,
      },
    },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "bar",
        barCategoryGap: "35%",
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: i === s.peakIndex ? c.highlight : c.context },
        })),
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { type: "dashed", width: 1, color: c.muted },
          label: {
            position: "insideStartTop",
            color: c.muted,
            fontSize: 11,
            formatter: s.baselineLabel,
          },
          data: [{ yAxis: s.baseline }],
        },
        markPoint: {
          symbol: "rect",
          symbolSize: 1,
          itemStyle: { color: "transparent" },
          label: {
            show: true,
            position: "left",
            align: "right",
            formatter: `{v|${s.peakValue}}\n{d|${s.peakNote}}`,
            rich: {
              v: { fontSize: 22, fontWeight: 800, color: c.highlightText },
              d: { fontSize: 12, color: c.highlightText },
            },
          },
          data: [{ name: "peak", coord: [s.peakIndex, values[s.peakIndex]] }],
        },
      },
    ],
  };
}
```

Use: `chart.setOption(peakBarsOption(...))`; when the theme changes (the `.dark` class or `prefers-color-scheme`), call `readRoles()` again and reapply the option. With many points, `large: true` and `sampling: "lttb"` (lines).

### 9.3 Vega-Lite (portable JSON; Altair in Python emits the same spec)

Line with a protagonist, direct labels, and a mark at the crossing. Colors come in as parameters resolved from the project tokens:

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": {
    "text": "Pro grew 5.7 times and passed Basic in week 26",
    "anchor": "start",
    "fontSize": 20,
    "fontWeight": 800,
    "subtitle": "Weekly active users in 2025, by plan",
    "subtitleColor": "#6B6B6B",
    "subtitleFontSize": 12
  },
  "width": 720,
  "height": 300,
  "config": {
    "view": { "stroke": null },
    "axis": { "grid": false, "domain": false, "ticks": false, "labelColor": "#6B6B6B" }
  },
  "data": { "name": "series" },
  "layer": [
    {
      "mark": { "type": "line", "interpolate": "monotone" },
      "encoding": {
        "x": {
          "field": "week",
          "type": "quantitative",
          "title": null,
          "axis": { "values": [1, 13, 26, 39, 52], "labelExpr": "'wk ' + datum.value" }
        },
        "y": { "field": "users", "type": "quantitative", "axis": null },
        "detail": { "field": "plan" },
        "color": {
          "condition": { "test": "datum.plan === 'Pro'", "value": "#E8590C" },
          "value": "#C4C4C4"
        },
        "strokeWidth": { "condition": { "test": "datum.plan === 'Pro'", "value": 3 }, "value": 1.5 }
      }
    },
    {
      "transform": [{ "filter": "datum.week === 52" }],
      "mark": { "type": "text", "align": "left", "dx": 6, "fontSize": 12, "fontWeight": 700 },
      "encoding": {
        "x": { "field": "week", "type": "quantitative" },
        "y": { "field": "users", "type": "quantitative" },
        "text": { "field": "endLabel" },
        "color": {
          "condition": { "test": "datum.plan === 'Pro'", "value": "#C2410C" },
          "value": "#6B6B6B"
        }
      }
    },
    {
      "transform": [{ "filter": "datum.plan === 'Pro' && datum.week === 26" }],
      "mark": { "type": "point", "filled": true, "size": 70, "color": "#E8590C" },
      "encoding": {
        "x": { "field": "week", "type": "quantitative" },
        "y": { "field": "users", "type": "quantitative" }
      }
    },
    {
      "transform": [{ "filter": "datum.plan === 'Pro' && datum.week === 26" }],
      "mark": {
        "type": "text",
        "align": "right",
        "dx": -8,
        "dy": -12,
        "fontSize": 12,
        "color": "#C2410C",
        "fontWeight": 700
      },
      "encoding": {
        "x": { "field": "week", "type": "quantitative" },
        "y": { "field": "users", "type": "quantitative" },
        "text": { "value": "week 26 · Pro passes Basic" }
      }
    }
  ]
}
```

The data arrives in `series` with `{ week, plan, users, endLabel }` — `endLabel` ("Pro 8.550") and the crossing week come from the section 3 functions, and are not hardcoded in the spec in production. In Altair, use `alt.condition(alt.datum.plan == "Pro", alt.value(HIGHLIGHT), alt.value(CONTEXT))` and `+` layers.

### 9.4 Python — Plotly (also Streamlit and Dash) and matplotlib

Story layer and formatting (pt-BR, without depending on the system locale):

```python
import pandas as pd

MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
ROLES = {  # fill in from the project design system
    "ink": "#1A1A1A", "muted": "#6B6B6B", "context": "#C4C4C4",
    "highlight": "#E8590C", "highlight_text": "#C2410C", "surface": "#FFFFFF",
}

def num_br(v: float, digits: int = 1) -> str:
    return f"{v:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")

def money(v: float, digits: int = 1) -> str:
    if abs(v) >= 1e6:
        return f"R$ {num_br(v / 1e6, digits)} mi"
    if abs(v) >= 1e3:
        return f"R$ {num_br(v / 1e3, digits)} mil"
    return f"R$ {num_br(v, 0)}"

def times(f: float) -> str:
    return f"{round(f)} times" if abs(f - round(f)) < 0.15 else f"{num_br(f, 1)} times"

def short_day(d: pd.Timestamp) -> str:
    return f"{d.day} {MONTHS[d.month - 1].lower()}"

def peak_story(df: pd.DataFrame, event: str | None = None) -> dict:
    """df: columns 'date' (datetime) and 'value'; complete series, no gaps."""
    baseline = df["value"].median()
    peak = df.loc[df["value"].idxmax()]
    factor = peak["value"] / baseline
    title = (f"{event or 'The peak'} sold {times(factor)} more than a normal day"
             if factor >= 1.5 else "Daily sales stayed flat over the period")
    return {"baseline": baseline, "peak": peak, "factor": factor, "title": title,
            "colors": [ROLES["highlight"] if d == peak["date"] else ROLES["context"] for d in df["date"]]}
```

Plotly:

```python
import plotly.graph_objects as go

def peak_bars_plotly(df: pd.DataFrame, s: dict, subtitle: str, source: str) -> go.Figure:
    months = pd.date_range(df["date"].min().replace(day=1), df["date"].max(), freq="MS")
    p = s["peak"]
    fig = go.Figure(go.Bar(x=df["date"], y=df["value"], marker_color=s["colors"], marker_line_width=0,
                           hovertemplate="%{x|%d/%m/%Y}<br>R$ %{y:,.0f}<extra></extra>"))
    fig.update_layout(
        title=dict(x=0, xref="paper", xanchor="left", text=f"<b>{s['title']}</b><br><span style='font-size:13px;color:{ROLES['muted']}'>{subtitle}</span>"),
        font=dict(family="Inter, system-ui, sans-serif", color=ROLES["ink"], size=12),
        plot_bgcolor=ROLES["surface"], paper_bgcolor=ROLES["surface"], separators=",.",
        bargap=0.35, showlegend=False, margin=dict(l=24, r=24, t=96, b=56))
    fig.update_yaxes(visible=False)
    fig.update_xaxes(showgrid=False, showline=False, ticks="", tickvals=months,
                     ticktext=[MONTHS[m.month - 1] for m in months], tickfont=dict(color=ROLES["muted"], size=11))
    fig.add_hline(y=s["baseline"], line_dash="dot", line_width=1, line_color=ROLES["muted"],
                  annotation_text=f"normal day (median) · {money(s['baseline'])}", annotation_position="top left",
                  annotation_font=dict(size=11, color=ROLES["muted"]))
    fig.add_annotation(x=p["date"], y=p["value"], showarrow=False, xanchor="right", yanchor="top", xshift=-6, align="right",
                       text=f"<b><span style='font-size:22px'>{money(p['value']).upper()}</span></b><br>"
                            f"{short_day(p['date'])} · {times(s['factor'])} a normal day",
                       font=dict(color=ROLES["highlight_text"], size=12))
    fig.add_annotation(x=0, y=-0.16, xref="paper", yref="paper", showarrow=False, xanchor="left",
                       text=source, font=dict(size=10, color=ROLES["muted"]))
    return fig
```

In Streamlit: `st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})`. In Dash: `dcc.Graph(figure=fig, config={"displayModeBar": False})`. For a dark theme, swap `ROLES` for the project's dark tokens.

matplotlib (static reports, PDFs, emails):

```python
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter

def peak_bars_mpl(df: pd.DataFrame, s: dict, subtitle: str, source: str):
    p = s["peak"]
    fig, ax = plt.subplots(figsize=(10, 4.6), dpi=200)
    fig.patch.set_facecolor(ROLES["surface"]); ax.set_facecolor(ROLES["surface"])
    ax.bar(df["date"], df["value"], width=0.7, color=s["colors"], linewidth=0)
    ax.axhline(s["baseline"], ls=(0, (2, 3)), lw=1, color=ROLES["muted"])
    ax.text(df["date"].iloc[0], s["baseline"], f"normal day (median) · {money(s['baseline'])}", va="bottom",
            fontsize=9, color=ROLES["muted"], bbox=dict(facecolor=ROLES["surface"], edgecolor="none", pad=1.5))
    ax.annotate(f"{money(p['value']).upper()}\n{short_day(p['date'])} · {times(s['factor'])} a normal day",
                xy=(p["date"], p["value"]), xytext=(-8, 0), textcoords="offset points",
                ha="right", va="top", color=ROLES["highlight_text"], fontsize=13, fontweight="bold")
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.yaxis.set_visible(False)
    ax.tick_params(axis="x", length=0, colors=ROLES["muted"], labelsize=9)
    ax.set_xlim(df["date"].min() - pd.Timedelta(days=2), df["date"].max() + pd.Timedelta(days=2))
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(FuncFormatter(lambda x, _: MONTHS[mdates.num2date(x).month - 1]))
    fig.text(0.02, 0.97, s["title"], fontsize=17, fontweight="bold", color=ROLES["ink"], va="top")
    fig.text(0.02, 0.89, subtitle, fontsize=10, color=ROLES["muted"], va="top")
    fig.text(0.02, 0.01, source, fontsize=8, color=ROLES["muted"])
    fig.subplots_adjust(top=0.80, left=0.03, right=0.98, bottom=0.10)
    return fig
```

### 9.5 R — ggplot2

```r
library(ggplot2)
library(dplyr)

roles  <- c(ink = "#1A1A1A", muted = "#6B6B6B", context = "#C4C4C4", highlight = "#E8590C", highlight_text = "#C2410C")
months <- c("JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ")
money  <- function(v) paste0("R$ ", format(round(v / 1e3, 1), big.mark = ".", decimal.mark = ",", nsmall = 1), " mil")

baseline <- median(df$value)
peak     <- slice_max(df, value, n = 1, with_ties = FALSE)
factor   <- peak$value / baseline

ggplot(df, aes(date, value)) +
  geom_col(aes(fill = date == peak$date), width = 0.7) +
  scale_fill_manual(values = c(`FALSE` = roles[["context"]], `TRUE` = roles[["highlight"]]), guide = "none") +
  geom_hline(yintercept = baseline, linetype = "dashed", linewidth = 0.3, colour = roles[["muted"]]) +
  annotate("label", x = min(df$date), y = baseline, label = paste("normal day (median) ·", money(baseline)),
           hjust = 0, vjust = -0.3, size = 3, colour = roles[["muted"]], label.size = 0, fill = "white") +
  annotate("text", x = peak$date - 3, y = peak$value, hjust = 1, vjust = 1, lineheight = 0.95,
           label = paste0(toupper(money(peak$value)), "\n", round(factor), " times a normal day"),
           colour = roles[["highlight_text"]], fontface = "bold", size = 4.5) +
  scale_x_date(date_breaks = "1 month", labels = function(d) months[as.integer(format(d, "%m"))],
               expand = expansion(mult = 0.01)) +
  labs(title = "Black Friday sold 5 times more than a normal day",
       subtitle = "Daily sales in 2025 · each bar is one day", caption = "SOURCE: SALES.CSV", x = NULL, y = NULL) +
  theme_minimal(base_size = 11) +
  theme(panel.grid = element_blank(), axis.text.y = element_blank(),
        axis.text.x = element_text(colour = roles[["muted"]]),
        plot.title.position = "plot", plot.caption.position = "plot",
        plot.title = element_text(face = "bold", size = 18, colour = roles[["ink"]]),
        plot.subtitle = element_text(colour = roles[["muted"]]),
        plot.caption = element_text(colour = roles[["muted"]], size = 8, hjust = 0))
```

In production, generate the title with the same logic as `peak_story` (factor ≥ 1.5, honest rounding). In Shiny, wrap it in `renderPlot` and recompute `baseline`/`peak` from the filtered slice.

### 9.6 BI tools (Power BI, Looker Studio, Metabase, Superset, Grafana)

The same principles, with each tool's native features:

- **Dynamic conclusion title**: a measure or calculated field that generates the sentence, bound to the visual title through conditional formatting.
- **Highlight**: conditional color formatting by rule (is it the maximum? is it the selected category?) with the highlight color and gray for the rest.
- **Reference line**: a constant or median line from the visual itself or a dedicated measure, with a data label.
- **Cleanup**: turn off the grid, axis titles, the Y axis, and the legend; data labels only on the highlight.

Power BI (DAX) — measures for the title and the color:

```dax
Daily Median =
MEDIANX ( ALLSELECTED ( 'Calendar'[Date] ), [Sales] )

Daily Peak =
MAXX ( ALLSELECTED ( 'Calendar'[Date] ), [Sales] )

Daily Sales Title =
VAR factor = DIVIDE ( [Daily Peak], [Daily Median] )
RETURN
    IF (
        factor >= 1.5,
        "The peak sold " & FORMAT ( factor, "0" ) & " times more than a normal day",
        "Daily sales stayed flat over the period"
    )

Sales Bar Color =
IF ( [Sales] = [Daily Peak], "#E8590C", "#C4C4C4" )
```

Apply `Daily Sales Title` in _Title → fx_ and `Sales Bar Color` in _Columns → Color → fx (field value)_; replace the hex values with the report theme's. Adjust the `FORMAT` rounding rule to follow section 3.4 when the factor is not close to an integer.

---

## 10. Phase 5 — Verify

1. **Run the code** and fix the project's type and lint errors (`tsc --noEmit`, `eslint`, `ruff`, tests).
2. **Render and look**: open the page or figure (dev server + screenshot, Playwright, `fig.write_image`, `savefig`) in the light and dark themes and at a narrow width. Look for overlapping labels, a clipped annotation, weak contrast, the wrong highlight.
3. **Check the numbers**: every number in a title or an annotation matches the chart data and an independent query.
4. **Test the filters**: change the slice and see whether the title, highlight, and annotations recompute and stay true; test an empty slice.
5. **Run the checklist** below.

---

## 11. Final checklist

**5-second test**: looking for 5 seconds, can someone state the conclusion of each chart and of the dashboard?

- [ ] Exploration done; the project's stack, tokens, and components reused (no loose hex in a component).
- [ ] Dashboard with a conclusion title; each chart with a conclusion title, a subtitle (unit, period, how to read), and a source.
- [ ] Every cited number was computed; dynamic titles have an honest fallback.
- [ ] One protagonist per chart in `highlight`; the rest in `context`; same entity, same color everywhere.
- [ ] No grid; Y axis hidden when the key values are annotated; minimal ticks.
- [ ] No legend when you can label directly.
- [ ] Key value annotated beside the key point; reference (median/target/previous year) labeled.
- [ ] Chart form suited to the question and the data type.
- [ ] Related groups in the same container; more space between groups than inside them.
- [ ] Numbers formatted in the project locale, `tabular-nums`, deltas with an explicit baseline.
- [ ] Contrast ok in the supported themes; meaning does not depend on color alone; a text or table alternative is available.
- [ ] Loading, empty, and error states handled.
- [ ] Rendered and inspected visually; story functions have tests.

---

## 12. Anti-patterns

- Generic title ("Chart Title", "Daily sales") or one that only repeats the axes.
- The library's default palette, a rainbow, or one color per series for no reason.
- Spaghetti chart with no protagonist; a long legend far from the marks.
- Heavy grid, an axis with dozens of ticks, full dates on every tick.
- A line for a noisy daily series when the question is "which day was different".
- A KPI with no comparison baseline; red/green with no sign or text.
- A border and a shadow on every card and every chart; 3D; decorative gradients.
- Hardcoded colors that ignore the design system; a broken dark theme.
- A fixed title that a filter makes false.
- Business logic (median, peak, titles) hidden inside the visual component, untested.
