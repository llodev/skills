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

- **Dynamic titles and highlights**: recomputed on every filter by the [`references/story.md`](story.md) functions.
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
