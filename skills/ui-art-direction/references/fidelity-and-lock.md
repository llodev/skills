# Phase 7 — Verify and lock

Goal: compare the build with the design lock tile by tile, fix by impact, check accessibility and performance on the real render, and turn the approved screenshot into the visual-regression baseline. Everything lands in `design/<slug>/qa/`. **A score never passes a build.** The user's approval of the side-by-side and the checks in sections 5 and 6 do. How to capture and measure (the Playwright question, the fallback, the fixed environment, the checks) is in [`capture-and-checks.md`](capture-and-checks.md); this file says what to compare, fix, record, and lock.

## 1. Capture

Capture the production build as [`capture-and-checks.md`](capture-and-checks.md) says, at the viewport and scale the brief names (for example 1920 x 1080 at scale 1), never at the mockup's pixel size: an image model's output size is not a viewport. `compare.py` resizes the capture to the mockup, so `resized: true` with matching aspect is expected and reported, not fixed. Save one screenshot per round, `qa/screenshot-NN.png`, numbered after Phase 6's round; a site gets `qa/screenshot-s<N>-NN.png` per section.

**Aspect mismatch.** When the mockup's aspect differs from the target (`openai` returns 3:2 for 16:9), `aspect_mismatch` is true. By default, crop a copy of the mockup to the target aspect, centered, as `qa/mockup-crop.<ext>` (the Pillow crop of [`capture-and-checks.md`](capture-and-checks.md) section 5), compare against that copy, and write the crop box in the capture settings of `qa/fidelity.md`. Regenerate the mockup at the target aspect (a Phase 3 round, under the cost gate) only when the crop would cut a region of the brief. Never move the build to the mockup's aspect.

## 2. The compare loop

```
python3 scripts/compare.py design/<slug>/mockups/APPROVED.<ext> design/<slug>/qa/screenshot-01.png \
  --out design/<slug>/qa/compare-01.png --report design/<slug>/qa/compare-01.json
```

Use the lock's real extension. Run one compare per lock line in `lineage.md`. For a site, each section against its own lock file: section 1 against `mockups/APPROVED.<ext>`, section N against `mockups/APPROVED-s<N>.<ext>`, named `compare-s<N>-01`. A mobile image the user locked (an `APPROVED: mobile` line, file in `mockups/mobile/`) is compared at the brief's mobile viewport, named `compare-mobile-01`. The state sheet (`mockups/states/`) and an unlocked mobile pass are not locks: hold the build beside them by eye and write one line per image under `By eye` in `qa/fidelity.md` (it matches, or the differences). `--grid` defaults to `4x3` and `--worst` to `3`. The script writes the sheet (reference, implementation, difference heat map), one crop per worst tile as `compare-01-tile-<col>-<row>.png` (reference crop beside implementation crop), and prints the report. An excerpt, values illustrative:

```json
{
  "method": "ssim",
  "overall": 0.81,
  "resized": false,
  "aspect_mismatch": false,
  "tiles": [{ "col": 0, "row": 0, "box": [0, 0, 360, 300], "score": 0.93 }],
  "worst": [{ "col": 2, "row": 1, "score": 0.42 }]
}
```

Read it in this order:

1. **`aspect_mismatch`.** True means the aspect ratios differ by more than 2 percent and the comparison is unreliable; do not read the scores. A capture not at the brief's viewport is recaptured; a mockup off the target aspect is cropped or regenerated (section 1).
2. **`resized`.** True means the screenshot was scaled to the mockup size without cropping. With matching aspect this is expected: report it, do not fix it.
3. **`method`.** `ssim`, or `luminance-mae` when numpy is missing (installing it is the user's call; without an answer, report `luminance-mae`). Report it; scores from different methods or grids are not comparable.
4. **`worst`, lowest first.** Open the crops. `col` and `row` count from 0 at the top left, so `col 2, row 1` is the third column, second row; `box` locates the tile in mockup pixels.
5. **Vision read.** A vision model reads the worst crops and the sheet with this prompt: "Left: approved mockup crop. Right: implementation crop. List the visible differences in layout, color and light, type, and detail. Do not say which is better." Its critique is advisory, like the score.
6. **`overall`** last, only as a trend between rounds with the same method and grid.

Number the rounds (`compare-01`, `compare-02`), each with its own `screenshot-NN.png`, continuing after Phase 6's round: crops from an earlier run are not deleted, and a stale crop read as current is a false fix.

**Never write "fidelity passed", "score above X", or any number as the verdict.** A high score can hide a wrong font in one tile; a low score in a masked tile is expected.

## 3. Fix order

Fix one category per round, then recapture and recompare:

1. **Layout**: position, size, spacing, alignment, grid. A layout error moves every tile, so it goes first.
2. **Color and light**: background, surfaces, art placement, glow, gradients, glass.
3. **Type**: family, weight, size, line height, letter spacing, case.
4. **Detail**: radii, hairlines, icons, shadows, grain.

A worst tile is fixed when the vision read of its new crops names no difference in that round's category. A difference you keep instead goes in the register as `pending` (section 4).

Before stopping, rerun the distance check (step 5 of [`../anti-patterns/generic-ai-look.md`](../anti-patterns/generic-ai-look.md)) on the build's screenshot beside the mockup and the control plate (`mockups/v1/control.<ext>`; `ls mockups/v1/control.*` gives the extension); a build closer to the control in identity, composition, or type has a fidelity defect to fix first. The comp-in-hand route has no control plate: skip the check and say so in the report. Stop when every remaining difference is in the register or is detail the user accepts. If two rounds in a row leave the worst tiles unchanged, show the user the sheet and ask whether the gain is worth another round.

## 4. Intentional-differences register

The register is `qa/differences.md`, one row per difference kept; `qa/fidelity.md` links to it, and any mockup crop box lives in `qa/fidelity.md`, not here. Anything not in the register is a defect. A row enters with `Accepted by: pending`; show the pending rows to the user once, with the final sheet, and write `user` on each row they accept. A row they reject is a defect to fix.

| Region       | Mockup                  | Build                       | Reason        | Accepted by |
| ------------ | ----------------------- | --------------------------- | ------------- | ----------- |
| col 3, row 0 | "3 alerts" pill         | live count, masked          | real data     | user        |
| header title | invented headline       | product copy from the brief | real text     | user        |
| col 1, row 2 | gray placeholder labels | labels at 4.5:1             | accessibility | user        |

Valid reasons: real text, real data, accessibility, masked live content, and a buildability call already recorded in `spec/`.

## 5. Accessibility on the real render

Run the checks of [`capture-and-checks.md`](capture-and-checks.md) sections 5 to 7 on the final capture, and record each result with its method in `qa/fidelity.md`:

- An automated scan with no serious or critical findings, or the manual checklist with every line passing.
- Contrast measured on the rendered pixels over art, glass, and the video poster, not on the token pair alone.
- A keyboard pass through every function in `brief.md`, with visible focus at every stop.
- The page under reduced motion both ways, and at 200 percent zoom.

## 6. Performance on the real render

- Measure as [`capture-and-checks.md`](capture-and-checks.md) section 8 says (production build, target viewport) and record the method and the numbers.
- The art plate is usually the LCP element: sized, in WebP or AVIF, preloaded. The video stays within the weight budget in `spec/assets.md`.
- Long frames in the scroll profile usually come from large `backdrop-filter` areas or a fixed grain overlay; fix those before shrinking the art.

## 7. Fidelity report and lock

`qa/fidelity.md`, in order: capture settings (method, script path, viewport, scale, scheme, masks, defaults used, settings not applied, any mockup crop box); per round, the compare file, `method`, `resized`, `aspect_mismatch`, the worst tiles and what was fixed; a link to the register, `qa/differences.md`; `By eye`; the accessibility and performance results; what could not be built faithfully, stated plainly; the delivery checklist below, each item `[x]` or `[ ] gap: <what is missing>`. Show the user the final sheet next to the mockup, not a number, with the pending register rows.

After the user approves the side-by-side, lock it:

- The approved screenshot becomes the **visual-regression baseline**, one per viewport the brief names and per key state (a state the state sheet shows that the project's fixtures can reach; name any other as a gap). Seed it from the last round's `qa/screenshot-NN.png` and capture the other viewports and states with the same settings. Store each in `qa/baseline/` as `<screen>-<state>-<viewport>.png`: `<screen>` is the route's name in the brief (a site section is `s<N>`), `<state>` is `default` or the state's name, `<viewport>` is `<width>x<height>`. With Playwright Test, `await expect(page).toHaveScreenshot("overview-default-1920x1080.png", { mask: [page.locator("[data-live]")], maxDiffPixelRatio: 0.01 })`, with the same context settings as the capture (screenshot assertions need the Playwright test runner). Playwright Test looks in its own snapshot folder, so pass the baseline path explicitly (`snapshotPathTemplate` in its config, pointing at `design/<slug>/qa/baseline/`); check the current Playwright docs for how your version writes a first baseline. Without it, a regression check is a later capture compared with the baseline by `python3 scripts/compare.py`: a worst tile whose crops show a difference that is not in the register is a regression to report. No score threshold decides it.
- The baseline is the build, not the mockup. Later changes are checked against the approved render; the mockup stays the design lock for a redesign.
- `STATUS.md`: `Phase: 7 - Verify and lock`; on `Approved:`, the lock file then the baseline paths, separated by `; `; `Next step: design/<slug>/qa/fidelity.md` (the delivery note); open gaps on the `Open decisions` line.

## Delivery checklist

- [ ] `brief.md` and the layout lock existed before exploration.
- [ ] References with recorded sources in `refs/SOURCES.md` and a DNA card in `dna.md`.
- [ ] Mockups versioned with prompt, model, and references in sidecars; `lineage.md` explains every step.
- [ ] The version the user approved passed the blind rubric, every criterion at least 4 (skipped on comp-in-hand).
- [ ] (If Phase 4 ran) approved video and `spec/motion.md` written.
- [ ] `spec/` complete: tokens reviewed with contrast checked, components, assets, motion.
- [ ] Working build with real data, responsive, accessible, reduced motion respected.
- [ ] Fidelity comparison recorded in `qa/`, with intentional differences explained in `qa/differences.md`.

## Exit check

- [ ] The final capture is at the brief's target viewport and `aspect_mismatch` is false (against a regenerated mockup or a registered crop when needed); for a site, one per section.
- [ ] Every worst tile of the last round is fixed or listed in `qa/differences.md`, and no row there is still `pending`.
- [ ] `qa/fidelity.md` states the capture method, `method`, `resized`, and `aspect_mismatch`, and presents no score as a pass.
- [ ] Accessibility and performance results on the real render are recorded with their methods.
- [ ] The user approved the side-by-side, and the baseline exists for each viewport.
- [ ] The delivery checklist closes `qa/fidelity.md`, every item checked or its gap named there and to the user.
