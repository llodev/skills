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

The data arrives in `series` with `{ week, plan, users, endLabel }` — `endLabel` ("Pro 8.550") and the crossing week come from the [`references/story.md`](story.md) functions, and are not hardcoded in the spec in production. In Altair, use `alt.condition(alt.datum.plan == "Pro", alt.value(HIGHLIGHT), alt.value(CONTEXT))` and `+` layers.
