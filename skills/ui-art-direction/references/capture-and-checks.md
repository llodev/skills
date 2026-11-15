# Capture and checks on a render

How to capture a render and measure it: the skeleton or running-app capture (Phase 0), the type board (Phase 5), build captures (Phases 6 and 7), and the accessibility and performance checks (Phase 7). The skill ships no capture tool. Every report names the method used.

## 1. What to serve

Serve the production build locally: `vite build` then `vite preview`, or the project's own build and preview scripts. Serve a static folder with `python3 -m http.server` from inside it. When the project has no production build, use its dev server and say so in the report. Never measure performance on a dev server.

## 2. The fixed environment

Two captures of the same build must give the same image, so every difference left is a design difference. Set viewport, device scale factor, color scheme, locale, time zone, route, and motion state in the browser; never inherit them from the machine. Take each from the brief and the mockup. Defaults when the brief is silent, each marked `default` in the report: the primary desktop viewport (mobile 390 x 844), scale factor 1, the mockup's color scheme (a dark background means dark), the language of the brief's real content, UTC, the screen's route in the brief (else `/`), reduced motion on and animations off, so the video background shows its poster. The capture settings section of `qa/fidelity.md` records the tool, the script path (`qa/capture.mjs` or `qa/capture.sh`), each setting with its value, and every setting the method could not apply.

- **Ready before the shot.** Wait for network idle (data loaded, hydration done) and for `document.fonts.ready`. A fallback font moves every line.
- **Live content masked.** Mark clocks, relative times, live counters, remote avatars, and maps (`data-live`) and mask them, or serve fixed fixtures. Each masked region goes in the register, `qa/differences.md`.
- **One frame per image.** Take a full-page capture only when the mockup is a full-page image. Capture a storyboard section at viewport size, scrolled to the section's top: its `y` in `wire.json`, as a share of the page height.

## 3. Playwright

Ask the user once whether to add Playwright as a dev dependency when the project lacks it, at the start of Phase 7 or at the first capture of an earlier phase. A dependency is the user's call. Without an answer, use the fallback in section 4. With Playwright, save this script as `design/<slug>/qa/capture.mjs` and run it from the project root (`node design/<slug>/qa/capture.mjs`). Every path in it is from the project root. The options were read in the Playwright API docs for `page.screenshot` and `browser.newContext`; check the current docs if your version differs. The values shown are illustrative.

```js
import { chromium } from "playwright"; // or "@playwright/test", whichever the project has

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }, // the brief's target viewport
  deviceScaleFactor: 1,
  reducedMotion: "reduce", // set before the page loads
  colorScheme: "dark",
  locale: "en-US",
  timezoneId: "UTC",
});
const page = await context.newPage();
await page.goto("http://localhost:4173/overview", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready.then(() => true));
await page.screenshot({
  path: "design/<slug>/qa/screenshot-NN.png", // NN: the next free number in qa/
  animations: "disabled",
  caret: "hide",
  mask: [page.locator("[data-live]")],
  maskColor: "#16181D", // `surface` in spec/tokens.json, so masks do not flood the tiles with pink
  fullPage: false,
});
await browser.close();
```

## 4. Fallback: headless Chrome or Chromium

Save the command as `design/<slug>/qa/capture.sh` and run it from the project root. `$CHROME` is `google-chrome`, `chromium`, or on macOS `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

```sh
TZ=UTC "$CHROME" --headless --hide-scrollbars --window-size=1920,1080 --force-device-scale-factor=1 \
  --virtual-time-budget=10000 --lang=en-US --screenshot=design/<slug>/qa/screenshot-NN.png \
  http://localhost:4173/overview
```

`--virtual-time-budget` lets scripts settle before the shot (10000 ms is a default). For the color scheme, use the app's own switch (a query string or a stored setting); add `--force-dark-mode` only when the app follows the system scheme. The fallback cannot mask, wait for network idle, or set `prefers-reduced-motion`, so the page's own reduced-motion code never runs. Get the capture default (the poster or static state) from a temporary copy of the build whose stylesheet adds `*{animation:none!important;transition:none!important}`, served as in section 1, plus the app's own reduced-motion switch when it has one. When the build's motion is driven by script (parallax, `requestAnimationFrame`), the report lists "reduced-motion state not verified by capture" and asks the user to check it in a browser with the system setting on. The report states each fixed-environment setting the fallback could not apply.

## 5. Contrast on rendered pixels

Make one crop per distinct text-on-backdrop pair: at least the headline, body text, muted text, each control label, and each status color. Include the backdrop right behind the text (art, glass, the video poster). Crop with `python3 -c "from PIL import Image; Image.open('qa/screenshot-NN.png').crop((x0, y0, x1, y1)).save('qa/contrast/body.png')"` (create `qa/contrast/` first). Then run `python3 scripts/palette.py qa/contrast/body.png` and read `contrast`. A pair passes at 4.5:1 for text. Large text (24 px, or 18.66 px bold), icons, control boundaries, data marks, and status colors pass at 3:1. Record each crop with its ratio.

## 6. Accessibility scan

Run axe through the project's test runner when it has both. Adding axe is a dependency, so ask first. The scan passes with no serious or critical findings. Otherwise walk this checklist and mark each line pass or fail:

- Every control has a name, a role, and a value.
- Focus order follows the layout, and focus is visible at every stop.
- Every function in `brief.md` is reachable by keyboard alone.
- Every input has a label.
- Images that carry meaning have alt text; decorative art has `alt=""` or `aria-hidden="true"`.
- The page has landmarks (header, nav, main).
- No status is shown by color alone.
- Reduced motion is honored (section 7).

The keyboard pass: with Playwright, press Tab and capture each stop. Without it, ask the user to tab through the brief's functions and report each stop.

## 7. 200 percent zoom and reduced motion

- **Zoom.** Capture at half the viewport width and height at scale factor 2 as `qa/zoom-200.png`. In Playwright, set `deviceScaleFactor: 2`. In the fallback, use `--window-size=960,540 --force-device-scale-factor=2`. It passes when no text or control is clipped, nothing scrolls sideways, and every function is still reachable.
- **Reduced motion.** Capture with `reducedMotion` set to `"reduce"` and to `"no-preference"`, as `qa/motion-reduce.png` and `qa/motion-full.png`. It passes when loops, autoplaying video, and parallax stop under `"reduce"` and state changes stay visible. The fallback cannot set it: it captures only the default of section 4, and the reduced-motion check goes to the user as section 4 says, or is named as a gap.

## 8. Performance

Measure the production build in preview, with its art, at the target viewport. For a desktop target, use no mobile emulation and no throttling (default). Measure LCP, CLS, and INP with Lighthouse (`npx lighthouse`, a dependency, so ask first), with Playwright reading `PerformanceObserver` entries, or in the browser's performance panel. INP needs real interactions: perform the functions in `brief.md` during the recording. For the scroll profile, record a scroll from top to bottom and count the long frames, those over 50 ms (default). When nothing here can record, ask the user to record in the performance panel, or name the gap. Report the method and the numbers. The defaults are the usual "good" bands: LCP at most 2.5 s, CLS at most 0.1, INP at most 200 ms.
