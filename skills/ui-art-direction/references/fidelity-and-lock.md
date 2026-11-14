# Phase 7 — Verify and lock

Goal: compare the build with the design lock tile by tile, fix by impact, check accessibility and performance on the real render, and turn the approved screenshot into the visual-regression baseline. Everything lands in `design/<slug>/qa/`. **A score never passes a build.** The user's approval of the side-by-side and the checks in sections 5 and 6 do.

## 1. Deterministic capture

Two captures of the same build must give the same image, so every difference left is a design difference. The capture contract:

- **The brief's target viewport.** Capture at the viewport and scale the brief names (for example 1920 x 1080 at scale 1), never at the mockup's pixel size: an image model's output size is not a viewport. `compare.py` resizes the capture to the mockup, so `resized: true` with matching aspect is expected and reported, not fixed. When the mockup's aspect differs from the target (`openai` returns 3:2 for 16:9), `aspect_mismatch` is true: regenerate the mockup at the target aspect (a Phase 3 round), or crop a copy of it to the target aspect, compare against that copy, and register the crop box in `qa/fidelity.md`. Never move the build to the mockup's aspect.
- **Fixed environment.** Viewport, device scale factor, color scheme, locale, and time zone set in the browser context, never inherited from the machine.
- **Ready before the shot.** Wait for network idle (data loaded, hydration done) and for `document.fonts.ready`: a fallback font moves every line.
- **Motion state declared.** `reducedMotion: "reduce"` on the context, set before the page loads, and `animations: "disabled"` on the screenshot, so the video background shows its poster, which is the clean art plate.
- **Live content masked.** Clocks, relative times, live counters, remote avatars, maps: mark them (for example `data-live`) and mask them, or serve fixed fixtures. Masked regions go in the register (section 4).
- **One frame per image.** `fullPage: true` only when the mockup is a full-page image. For a storyboard, capture each section at viewport size.

A Playwright script, no test runner, saved as `design/<slug>/qa/capture.mjs` and run from the project root (`node design/<slug>/qa/capture.mjs`); every path in it is from the project root. Without Playwright in the project, use the fallback in "Checks on a render" in `SKILL.md` with the same viewport and a static copy that has no animation. The options below were read in the Playwright API docs for `page.screenshot` and `browser.newContext`; check the current docs if your version differs. Route, scheme, locale, and time zone are illustrative: take them from the brief and the mockup.

```js
import { chromium } from "playwright"; // or "@playwright/test", whichever the project has

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }, // the brief's target viewport
  deviceScaleFactor: 1,
  reducedMotion: "reduce", // the declared motion state, set before the page loads
  colorScheme: "dark",
  locale: "en-US",
  timezoneId: "UTC",
});
const page = await context.newPage();
await page.goto("http://localhost:3000/overview", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready.then(() => true));
await page.screenshot({
  path: "design/<slug>/qa/screenshot-01.png", // one number per round: screenshot-02.png next
  animations: "disabled",
  caret: "hide",
  mask: [page.locator("[data-live]")],
  maskColor: "#16181D", // `surface` in spec/tokens.json, so masks do not flood the tiles with pink
  fullPage: false,
});
await browser.close();
```

## 2. The compare loop

```
python3 scripts/compare.py design/<slug>/mockups/APPROVED.<ext> design/<slug>/qa/screenshot-01.png \
  --out design/<slug>/qa/compare-01.png --report design/<slug>/qa/compare-01.json
```

Use the lock's real extension. Run one compare per lock line in `lineage.md`. For a site, each section against its own lock file: section 1 against `mockups/APPROVED.<ext>`, section N against `mockups/APPROVED-s<N>.<ext>`, named `compare-s<N>-01`. A mobile image the user locked (an `APPROVED: mobile` line, file in `mockups/mobile/`) is compared at the brief's mobile viewport, named `compare-mobile-01`. The state sheet (`mockups/states/`) and an unlocked mobile pass are not locks: hold the build beside them by eye, no compare. `--grid` defaults to `4x3` and `--worst` to `3`. The script writes the sheet (reference, implementation, difference heat map), one crop per worst tile as `compare-01-tile-<col>-<row>.png` (reference crop beside implementation crop), and prints the report. An excerpt, values illustrative:

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

1. **`aspect_mismatch`.** True means the aspect ratios differ by more than 2 percent and the comparison is unreliable; do not read the scores. A capture not at the brief's viewport is recaptured; a mockup off the target aspect is regenerated or cropped and registered (section 1).
2. **`resized`.** True means the screenshot was scaled to the mockup size without cropping. With matching aspect this is expected: report it, do not fix it.
3. **`method`.** `ssim`, or `luminance-mae` when numpy is missing. Report it; scores from different methods or grids are not comparable.
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

Before stopping, rerun the distance check (step 5 of [`../anti-patterns/generic-ai-look.md`](../anti-patterns/generic-ai-look.md)) on the build's screenshot beside the mockup and the control plate (`mockups/v1/control.<ext>`); a build closer to the control in identity, composition, or type has a fidelity defect to fix first. Stop when every remaining difference is in the register or is detail the user accepts. If two rounds in a row leave the worst tiles unchanged, show the user the sheet and ask whether the gain is worth another round.

## 4. Intentional-differences register

`qa/differences.md`, one row per accepted difference. Anything not in it is a defect.

| Region       | Mockup                  | Build                       | Reason        | Accepted by |
| ------------ | ----------------------- | --------------------------- | ------------- | ----------- |
| col 3, row 0 | "3 alerts" pill         | live count, masked          | real data     | user        |
| header title | invented headline       | product copy from the brief | real text     | user        |
| col 1, row 2 | gray placeholder labels | labels at 4.5:1             | accessibility | user        |

Valid reasons: real text, real data, accessibility, masked live content, and a buildability call already recorded in `spec/`.

## 5. Accessibility on the real render

Methods are in "Checks on a render" in `SKILL.md`; record which one was used for each line.

- An automated scan with no serious or critical findings: axe through the project's test runner when it has one (adding a dependency is the user's call), else the browser's built-in audit, else a manual checklist.
- Contrast measured on the rendered pixels over art, glass, and the video poster, not on the token pair alone: crop each text spot with its backdrop from the capture and run `python3 scripts/palette.py <crop>`.
- A keyboard pass through every function in `brief.md`, by hand or with scripted Tab presses, with visible focus at every stop.
- The page looked at with `reducedMotion` both `"reduce"` and `"no-preference"`, and at 200 percent zoom (browser zoom; in Playwright, half the viewport width and height at `deviceScaleFactor: 2`).

## 6. Performance on the real render

- Measure the page with its art, with the browser's performance panel or the project's existing perf tooling (Lighthouse is one), at the target viewport, with no mobile emulation for a desktop target; INP needs real interactions during the recording. Record the method. Targets: LCP at most 2.5 s, CLS at most 0.1, INP at most 200 ms.
- The art plate is usually the LCP element: sized, in WebP or AVIF, preloaded. The video stays within the weight budget in `spec/assets.md`.
- Profile a scroll with the same panel or tooling. Long frames usually come from large `backdrop-filter` areas or a fixed grain overlay; fix those before shrinking the art.

## 7. Fidelity report and lock

`qa/fidelity.md`, in order: capture settings (viewport, scale, scheme, masks, any registered mockup crop); per round, the compare file, `method`, `resized`, `aspect_mismatch`, the worst tiles and what was fixed; the register; the accessibility and performance results; what could not be built faithfully, stated plainly. Show the user the final sheet next to the mockup, not a number.

After the user approves the side-by-side, lock it:

- The approved screenshot becomes the **visual-regression baseline**, one per viewport the brief names and per key state (a state the state sheet shows that the project's fixtures can reach; name any other as a gap), stored in `qa/baseline/` as `<screen>-<viewport>.png` and registered in the project's tool. With Playwright Test, `await expect(page).toHaveScreenshot("overview-desktop.png", { mask: [page.locator("[data-live]")], maxDiffPixelRatio: 0.01 })`, with the same context settings as the capture (screenshot assertions need the Playwright test runner). Playwright Test looks in its own snapshot folder, so pass the baseline path explicitly (`snapshotPathTemplate` in its config, pointing at `design/<slug>/qa/baseline/`), or skip the runner and compare later captures with the baseline using `python3 scripts/compare.py`. Seed it from the approved capture; check the current Playwright docs for how your version writes a first baseline.
- The baseline is the build, not the mockup. Later changes are checked against the approved render; the mockup stays the design lock for a redesign.
- `STATUS.md`: `Phase: 7 - Verify and lock`, the baseline paths on the `Approved` line after the lock file, open gaps on the `Open decisions` line.

## Delivery checklist

- [ ] `brief.md` and the layout lock existed before exploration.
- [ ] References with recorded sources in `refs/SOURCES.md` and a DNA card in `dna.md`.
- [ ] Mockups versioned with prompt, model, and references in sidecars; `lineage.md` explains every step.
- [ ] The version the user approved passed the blind rubric, every criterion at least 4 (skipped on comp-in-hand).
- [ ] (If Phase 4 ran) approved video and `spec/motion.md` written.
- [ ] `spec/` complete: tokens reviewed with contrast checked, components, assets, motion.
- [ ] Working build with real data, responsive, accessible, reduced motion respected.
- [ ] Fidelity comparison recorded in `qa/`, with intentional differences explained in the register.

## Exit check

- [ ] The final capture is at the brief's target viewport and `aspect_mismatch` is false (against a regenerated mockup or a registered crop when needed); for a site, one per section.
- [ ] Every worst tile of the last round is fixed or listed in `qa/differences.md`.
- [ ] `qa/fidelity.md` states `method`, `resized`, and `aspect_mismatch`, and presents no score as a pass.
- [ ] Accessibility and performance results on the real render are recorded.
- [ ] The user approved the side-by-side, and the baseline exists for each viewport.
- [ ] Every delivery checklist item is checked, or its gap is named to the user.
