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
