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
