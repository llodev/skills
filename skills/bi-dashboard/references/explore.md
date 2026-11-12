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

Use the chart library **the project already uses**. Introduce a new one only if there is none or the user asks; in that case, choose by stack ([`references/capability-map.md`](capability-map.md)) and justify it in one line.

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
