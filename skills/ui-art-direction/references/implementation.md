# Phase 6 — Build

Goal: a **working** screen in the project's stack that looks like `mockups/APPROVED.*`. Input is the pack: `brief.md`, `layout/`, `spec/`, `assets/`, `mockups/states/` and `mockups/mobile/` when Phase 3 made them (`lineage.md` has their `States:` and `Mobile:` lines), and `video/` when Phase 4 ran. The project's design system and components win over this file. Use a design-in-code skill only when the user asked for it or the project already uses it; never choose one on your own. This phase only fixes what the pack decided. Captures follow [`capture-and-checks.md`](capture-and-checks.md). Before building, confirm `spec/` has `tokens.json`, `tokens.css`, `components.md`, `assets.md`, and `motion.md` (Phase 5 writes it even when Phase 4 was skipped); if one is missing or carries an unresolved open decision, stop and return to Phase 5 for that item.

## 1. Three layers, back to front

| Layer     | What it holds                                  | Built with                                                                                                                           | Rule                                                                                                                                   |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Art       | Background, central illustration, textures     | The files in `spec/assets.md`: WebP or AVIF, a short MP4 or WebM loop, canvas or WebGL only when the art must react to data or input | **Never rebuild complex art in CSS.** The triage in [`references/build-spec.md`](build-spec.md) decides: an "image" ships as an image. |
| Interface | Text, controls, data, navigation               | The project's real components, styled through the tokens ported into the project's theme                                             | Text is text, buttons are buttons, data comes from the real source. No loose hex in a component.                                       |
| Motion    | Transitions, micro-interactions, ambient loops | CSS `@keyframes` and transitions for the simple; the motion library the project already has for choreography                         | Durations and easing come from `spec/motion.md`; everything has a `prefers-reduced-motion` branch.                                     |

A gradient, a hairline, or a glow is CSS; grain follows the triage. A painted landscape, a figure, or a lit object is an asset. Asset files come from `design/<slug>/assets/`: copy them into the app's static asset folder (`public/` or wherever the project keeps images) and reference them the way the project does.

Tokens reach the project as CSS variables named exactly as the token names in `spec/tokens.json`, so port the properties of `spec/tokens.css` (it lives in the pack) into the project's global stylesheet and map them through the theme config. The recipes below use `--surface`, `--foreground`, `--accent`, `--focus-ring`, and `--scrim`. Tailwind v4: `@theme inline { --color-surface: var(--surface); --radius-md: var(--shape-radius-md); }`. Tailwind v3: `theme.extend` in `tailwind.config.*`, for example `colors: { surface: "var(--surface)" }, borderRadius: { md: "var(--shape-radius-md)" }`. Other groups map the same way to their namespace (spacing, font family, box shadow, z-index). The project's design system wins: when a spec token collides with a project variable (shadcn's `--accent`), map the spec token onto the project's variable, keep the project's value, and log the difference in `qa/differences.md`. `breakpoints-md` is copied as a value into the config (Tailwind's `md` screen), because a CSS variable cannot be read in a media query. In a framework, put the recipes' CSS in the project's stylesheet layer (`@layer components` with Tailwind). In React, the video sync is a `useEffect` on a ref that adds the two listeners and removes them in its cleanup.

## 2. Delegation brief

Delegate to a fresh coding subagent when the work exceeds about three components or a second target (section 4; more than one section counts as a second target); otherwise build inline. Either way, save this brief as `prompts/build-<screen>.md` and hand it over with the pack folder's path. A site gets one pass-1 brief per section, `prompts/build-<section>.md`, built in page order, where `<screen>` is the section id `s<N>`. Each later pass gets a copy (`prompts/build-<screen>-pass2.md` for states, `-pass3.md` for mobile; on a site, one copy each for the whole page, `<screen>` being `page`) whose "Build desktop" rule becomes: "Desktop matches the lock. Now build <every state in spec/components.md and the state sheet | mobile from the mobile pass image, or the lock>."

```
Implement the screen <name> in <project>, <stack>.
Visual reference: design/<slug>/mockups/APPROVED.<ext> (for a site, also APPROVED-s<N>.<ext> per section)
States and mobile: design/<slug>/mockups/states/, design/<slug>/mockups/mobile/ (only those that exist)
Motion reference: design/<slug>/video/clip-NN.mp4, the Source of spec/motion.md (only if Phase 4 ran)
Brief, functions, layout lock: design/<slug>/brief.md, design/<slug>/layout/
Spec: design/<slug>/spec/ (tokens.json, tokens.css, components.md, assets.md, motion.md)
Rules:
- The functions in brief.md come first. No data invented for production.
- Use the project's components and design system. Tokens through variables named as in tokens.json, no loose hex.
- Art = the files in design/<slug>/assets/ listed in spec/assets.md, copied into the app. Interface = real components. No text inside art, no art rebuilt in CSS.
- Build desktop to match the mockup first, default state, with each motion layer's reduced-motion CSS. States and mobile come in later passes.
- Accessible: contrast as in tokens.json, visible focus, full keyboard use, prefers-reduced-motion.
- When done, capture design/<slug>/qa/screenshot-01.png (a section: qa/screenshot-s<N>-01.png) at the brief's primary desktop viewport, on the project's fixtures, and stop.
- List every place you could not match the mockup, and why, as rows of design/<slug>/qa/differences.md with Accepted by: pending. Do not grade your own result.
```

## 3. Recipes

Use a recipe only where the approved mockup shows the effect. Glass on every card is a generic tell ([`anti-patterns/generic-ai-look.md`](../anti-patterns/generic-ai-look.md)).

**Frosted glass.** Measure text contrast against the busiest spot of the art behind the panel. Where `backdrop-filter` is unsupported, fall back to an opaque surface: `@supports not (backdrop-filter: blur(1px)) { .glass { background: var(--surface); } }`. The panel: `.glass { background: color-mix(in oklab, var(--surface) 55%, transparent); backdrop-filter: blur(18px) saturate(140%); border: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent); }`.

**Luminous hairlines.** One pixel of line; the glow comes from the shadow: `.hairline { border: 1px solid color-mix(in oklab, var(--accent) 60%, transparent); box-shadow: 0 0 12px color-mix(in oklab, var(--accent) 35%, transparent); }`.

**Video background.** The clip is an art plate: no text, no UI. The poster is the clean still from `spec/assets.md`; under reduced motion it replaces the video. `/plate.webp`, `/loop.webm`, and `/loop.mp4` stand for the copies of the files in `assets/`; ship the formats `spec/assets.md` lists, one `<source>` each.

```html
<div class="stage">
  <video class="art" autoplay muted loop playsinline poster="/plate.webp" aria-hidden="true">
    <source src="/loop.webm" type="video/webm" />
    <source src="/loop.mp4" type="video/mp4" />
  </video>
  <main>…</main>
</div>
```

```css
.stage {
  position: relative;
  isolation: isolate;
}
.stage .art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
}
@media (prefers-reduced-motion: reduce) {
  .stage .art {
    display: none;
  }
  .stage {
    background: url("/plate.webp") center / cover no-repeat;
  }
}
```

```js
const video = document.querySelector(".stage .art");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
function sync() {
  if (reduce.matches || document.hidden) video.pause();
  else video.play().catch(() => {}); // a refused autoplay leaves the poster, which is fine
}
document.addEventListener("visibilitychange", sync);
reduce.addEventListener("change", sync);
sync();
```

**Scrim**, only when tokens have `scrim`: an element right after the art, so it sits between the art and the text layer.

```css
.stage .scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to top, var(--scrim), transparent 70%);
  opacity: var(--effects-scrim-opacity);
}
```

**Focus ring**, on every build (2 px width and 2 px offset are defaults): `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }`.

**Parallax.** No library is needed. Each scroll-linked layer reads its `depth` from `spec/motion.md` (0 fixed, 1 scrolls with the page) and shifts down by `(1 - depth)` times the scroll distance: `animation: drift linear both; animation-timeline: scroll();` with `@keyframes drift { to { translate: 0 calc((1 - var(--depth)) * var(--scroll-range)); } }`, `--depth` set per layer and `--scroll-range` the page's scrollable height in px, set from script on load and resize. Where `@supports not (animation-timeline: scroll())`, set `translate` to `(1 - depth) * scrollY` px in a `requestAnimationFrame` callback. Under reduced motion, neither runs.

**Grain.** The triage in `spec/assets.md` decides: an image tile repeats as the overlay's `background`; an SVG filter is the `feTurbulence` overlay below, at 3 to 6 percent opacity, tiled from a small data URI. Above 6 percent it reads as dirt and costs text contrast.

```css
body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  mix-blend-mode: overlay;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
```

## 4. Passes: one target each

A target is one mockup image. **Pass 1** is the default state at desktop: tokens, the three layers, content, and each motion layer's reduced-motion CSS, written with that layer because it is a media query on the same elements. **Pass 2** is the states, against the state sheet. **Pass 3** is mobile, against the mobile pass image. One pass never moves two targets. On a site, pass 1 runs per section in page order; passes 2 and 3 each run once for the whole page. Reduced motion is verified in Phase 7, never left to a late pass.

Close pass 1 with one compare round you run yourself, even when a coding agent built it: capture `qa/screenshot-01.png` at the brief's primary desktop viewport ([`capture-and-checks.md`](capture-and-checks.md), data from the project's fixtures, live regions masked), run the compare command of Phase 7 in `SKILL.md` with `NN` = `01`, and fix what its 3 worst tiles show, layout first. A site captures each section as `qa/screenshot-s<N>-01.png`, scrolled to its top, and compares it with `mockups/APPROVED-s<N>.<ext>`. Move on when no worst tile shows a layout difference; the full loop and the verdict belong to Phase 7 ([`fidelity-and-lock.md`](fidelity-and-lock.md)).

- **States (pass 2).** Build every state listed in `spec/components.md` and drawn in the state sheet (`mockups/states/`) when Phase 3 made one: empty (a sentence saying why, plus an action), loading (a skeleton in the component's shape), error (message plus action), hover, focus, active, disabled. Same tokens as the default state; no state left to the browser default.
- **Mobile (pass 3).** Start from the mobile pass image in `mockups/mobile/` when Phase 3 made one, otherwise from the approved desktop and the `Mobile` section of `spec/components.md`. The mobile viewport (the brief's, else 390 px) is the mobile image's design width; the CSS breakpoint is `breakpoints-md` (768 px, default): below it the mobile layout stretches to the width, at and above it the desktop layout applies, and tablets get no separate design. Keep the reading order of the layout lock and stack in hierarchy order. The art uses the mobile crop from `spec/assets.md` in a `<picture>` `<source media>`, positioned with `object-position` at its focal point; never a squeezed desktop crop. Touch targets at least 44 by 44 CSS pixels. Below `breakpoints-md` the video background falls back to its poster (default).
- **Verify each pass.** Capture each state and the mobile view as `qa/<screen>-<state>-<viewport>.png` and hold it beside its image (the state sheet, the mobile pass image, or the lock); fix what differs before the next pass.

## 5. Real components, real data

- Every element maps to the component named in `spec/components.md`. A new component exists only where the inventory says "new".
- Data comes from the real source, or from the project's existing fixtures in development. Never data invented for production. The numbers in the mockup are not data: do not hard-code what you read off the image.
- Real copy replaces mockup copy. Each resulting visual difference is a row of the Phase 7 register, `qa/differences.md` (columns Region, Mockup, Build, Reason, Accepted by; reason: real text, accepted by: pending), for the user to accept.

## 6. Accessibility and reduced motion (the bold look waives none)

Check each point below on the real render with the methods in [`capture-and-checks.md`](capture-and-checks.md); Phase 7 records the results in `qa/fidelity.md`.

- Contrast at least 4.5:1 for body text, 3:1 for large text, icons, and control borders, measured on the real pixels behind the text (art, glass, video poster). If the art fails, add the `scrim` role and `effects-scrim-opacity` to `spec/tokens.json` and `spec/tokens.css`, port them, use the scrim recipe, and log the change in `qa/differences.md`; do not wash out the art.
- A visible focus ring on every interactive element, from a token, at least 3:1 against its surroundings. Every function in `brief.md` works from the keyboard, in layout order.
- Art is decorative: `aria-hidden="true"` or `alt=""`. Art that carries meaning gets a text alternative. Meaning never by color alone.
- Under `prefers-reduced-motion: reduce`: no autoplaying video (poster instead), no parallax, no ambient loops; transitions become opacity changes or none; state changes stay visible. Text still works at 200 percent zoom.

## Red flags

| Thought                                             | Reality                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| "The illustration is a few gradients, CSS will do." | It drifts from the mockup in every tile. Ship the asset.                                                                             |
| "Placeholder numbers until the API is ready."       | Placeholders ship. Use the real source or the project's fixtures.                                                                    |
| "States, mobile, reduced motion at the end."        | Reduced-motion CSS goes in with each motion layer in pass 1; states and mobile get passes 2 and 3 now, or they are left to defaults. |

## Exit check

- [ ] Every function in `brief.md` works in the build, on real data or the project's fixtures.
- [ ] The art layer uses the files in `spec/assets.md`; no text in art; no complex art rebuilt in CSS.
- [ ] Components take tokens; no loose hex in a component.
- [ ] Pass 1 wrote each motion layer's reduced-motion CSS; every state in `spec/components.md` (pass 2) and mobile (pass 3) were built after desktop matched, each captured and held beside its image.
- [ ] Contrast, focus, keyboard, and reduced motion hold on the real render.
- [ ] A screenshot at the brief's target viewport is in `qa/` (`qa/screenshot-01.png`, or one `qa/screenshot-s<N>-01.png` per section, with its compare round), ready for Phase 7.
