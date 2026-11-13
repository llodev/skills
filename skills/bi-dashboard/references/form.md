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
