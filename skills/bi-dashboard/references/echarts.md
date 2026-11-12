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
