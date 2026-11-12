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

| Phase                  | Output                                          | Read                                                                                                                                  |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Project exploration | Technical context + token map                   | [`references/explore.md`](references/explore.md)                                                                                      |
| 1. Brief               | Question, audience, decisions, metrics          | this file                                                                                                                             |
| 2. Story calculation   | Verified numbers and one `ChartStory` per chart | [`references/story.md`](references/story.md)                                                                                          |
| 3. Design              | Form of each chart + page layout                | [`references/form.md`](references/form.md), then [`references/layout.md`](references/layout.md) when the page has more than one chart |
| 4. Implementation      | Code in the project's pattern                   | one stack recipe                                                                                                                      |
| 5. Verification        | Real render + tests + checklist                 | [`references/verify.md`](references/verify.md)                                                                                        |

If the user asks for only one chart, the phases shrink, but they stay in the same order. If they ask for a review of an existing dashboard, read `references/explore.md`, `references/verify.md`, and `anti-patterns/charts.md`, then propose prioritized changes. Do not load a stack recipe for a review that does not ask for an implementation.

## Phase 0 — Explore the project

**MANDATORY — READ ENTIRE FILE**: [`references/explore.md`](references/explore.md).

**Do NOT load** a stack recipe during exploration.

Precedence, copied from that file so it is in force before the read returns: **explicit user direction > the project's design system > libraries/patterns already used in the project > this skill's patterns.**

## Phase 1 — Brief

Answer before choosing charts:

1. **What decision or question** does the dashboard support? (e.g. "was the November campaign worth the investment?")
2. **Who reads it** and how often? (weekly leadership, real-time operations, end customer)
3. **Which metrics** answer the question, with an exact definition (formula, filter, time zone, currency).
4. **What is the comparison baseline** for each metric (period median, target, same period last year, peer average).
5. **Granularity and period** (day/week/month; last 12 months; closed year).
6. **Required interactions** (filters, drill-down, export) — only those that change a decision.

A dashboard answers **one main question**. Different questions become different pages or tabs.

## Phase 2 — Compute the story

**MANDATORY — READ ENTIRE FILE**: [`references/story.md`](references/story.md) before writing a title, an annotation, or a SQL query.

**Do NOT load** a stack recipe until the `ChartStory` values exist.

## The four rules of every chart

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
- **The form can be noise too**: a noisy daily series as a line becomes a scribble; thin bars (one per day) show each day's volume and make the peak pop. Change the form when it does not answer the question ([`references/form.md`](references/form.md)).

### Rule 4 — Write the explanation on the chart

- An important value **beside** the important point, in `highlight-text`: a large value (`R$ 78,4 MIL`) + one line of context (`28 nov · 5 times a normal day`).
- A reference line labeled on the line itself: `normal day (median) · R$ 15,4 mil` — that is what gives meaning to the "5 times".
- A direct label at the end of the lines (`Pro 8.550`), values on the bars when there are ≤ 12 categories.
- Annotate crossings and events at the exact point (`week 26 · Pro passes Basic`).
- Annotations of ≤ 2 lines, close to the element, without covering data.

## Phase 3 — Design

**MANDATORY — READ ENTIRE FILE**: [`references/form.md`](references/form.md) before choosing a mark.

Read [`references/layout.md`](references/layout.md) entire when the page has a KPI row or more than one chart.

**Do NOT load** `references/layout.md` for a single chart with no page around it.

## Phase 4 — Implement in the project

Every recipe implements the same story: daily bars in `context`, the peak in `highlight`, a labeled dashed median, an annotation beside the peak, no grid and no Y axis. Adapt the names and the tokens to the project.

1. **Data layer**: a query/endpoint that already returns the complete series (no gaps), at the right granularity, aggregated in the database when the volume is large.
2. **Story layer**: pure functions ([`references/story.md`](references/story.md)) that produce the `ChartStory`. They stay testable and reusable (e.g. `lib/chart-story.ts`, `analytics/story.py`).
3. **Visual layer**: components that receive `data` + `story` + formatters and only draw. No business rule inside the component.
4. **Tokens**: components read the roles ([`references/explore.md`](references/explore.md)) through CSS variables, the library theme, or project constants — never a loose hex in the component.
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

**MANDATORY**: read [`references/capability-map.md`](references/capability-map.md) entire when the project has no chart library, or when the library is not one of the recipes below.

**MANDATORY**: read exactly one recipe, the library the project already uses.

| Signal                                                  | Read                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| React, shadcn/ui, or Recharts                           | [`references/react-recharts.md`](references/react-recharts.md) |
| ECharts                                                 | [`references/echarts.md`](references/echarts.md)               |
| Vega-Lite or Altair                                     | [`references/vega-lite.md`](references/vega-lite.md)           |
| Plotly, matplotlib, Streamlit, or Dash                  | [`references/python.md`](references/python.md)                 |
| ggplot2 or R                                            | [`references/ggplot2.md`](references/ggplot2.md)               |
| Power BI, Looker Studio, Metabase, Superset, or Grafana | [`references/bi-tools.md`](references/bi-tools.md)             |

**Do NOT load** the other recipes for the same chart.

## Phase 5 — Verify

**MANDATORY — READ ENTIRE FILE**: [`references/verify.md`](references/verify.md).

## Before a chart title, and before handing off a review

**MANDATORY — read [`anti-patterns/charts.md`](anti-patterns/charts.md) entire.**

## References

| File                           | Load when                                            |
| ------------------------------ | ---------------------------------------------------- |
| `references/explore.md`        | Phase 0, and any review                              |
| `references/story.md`          | Phase 2, before any title or annotation              |
| `references/form.md`           | Choosing a mark                                      |
| `references/layout.md`         | A page with more than one chart or a KPI row         |
| `references/verify.md`         | Phase 5, and any review                              |
| `references/capability-map.md` | No chart library yet, or a library with no recipe    |
| `references/react-recharts.md` | React / shadcn / Recharts                            |
| `references/echarts.md`        | ECharts                                              |
| `references/vega-lite.md`      | Vega-Lite or Altair                                  |
| `references/python.md`         | Plotly, matplotlib, Streamlit, Dash                  |
| `references/ggplot2.md`        | ggplot2 or R                                         |
| `references/bi-tools.md`       | Power BI, Looker Studio, Metabase, Superset, Grafana |
| `anti-patterns/charts.md`      | Before a title, and before a review handoff          |
