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
