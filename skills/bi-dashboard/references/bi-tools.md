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

Apply `Daily Sales Title` in _Title → fx_ and `Sales Bar Color` in _Columns → Color → fx (field value)_; replace the hex values with the report theme's. Adjust the `FORMAT` rounding rule to follow [`references/story.md`](story.md) when the factor is not close to an integer.

---
