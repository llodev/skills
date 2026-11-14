# Phase 6 — Build

Goal: a **working** screen in the project's stack that looks like `mockups/APPROVED.*`. Input is the pack: `brief.md`, `layout/`, `spec/`, `assets/`, `mockups/states/` and `mockups/mobile/` when Phase 3 made them (`lineage.md` has their `States:` and `Mobile:` lines), and `video/` when Phase 4 ran. The project's design system and components win over this file. For build craft beyond these recipes, any design-in-code skill the project already uses is fine; this phase only fixes what the pack decided.

## 1. Three layers, back to front

| Layer     | What it holds                                  | Built with                                                                                                                           | Rule                                                                                                                                   |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Art       | Background, central illustration, textures     | The files in `spec/assets.md`: WebP or AVIF, a short MP4 or WebM loop, canvas or WebGL only when the art must react to data or input | **Never rebuild complex art in CSS.** The triage in [`references/build-spec.md`](build-spec.md) decides: an "image" ships as an image. |
| Interface | Text, controls, data, navigation               | The project's real components, styled through `spec/tokens.css` or the theme                                                         | Text is text, buttons are buttons, data comes from the real source. No loose hex in a component.                                       |
| Motion    | Transitions, micro-interactions, ambient loops | CSS `@keyframes` and transitions for the simple; the motion library the project already has for choreography                         | Durations and easing come from `spec/motion.md`; everything has a `prefers-reduced-motion` branch.                                     |

A gradient, a hairline, a glow, or grain is CSS. A painted landscape, a figure, or a lit object is an asset. Asset files come from `design/<slug>/assets/`: copy them into the app's static asset folder (`public/` or wherever the project keeps images) and reference them the way the project does.

Tokens reach the project as CSS variables named exactly as the token names in `spec/tokens.json` (`--surface`, `--accent`, `--focus-ring`, `--scrim`), so put the properties of `spec/tokens.css` in the project's global stylesheet and map them through the theme config. In Tailwind v4, for example: `@theme inline { --color-surface: var(--surface); }`. When a name already exists in the project (shadcn's `--accent`), the project's variable stays, takes the spec's value, and the build brief lists the mapping.

## 2. Delegation brief

When a coding agent builds the screen (or you do), save this brief as `prompts/build-<screen>.md` and hand it over with the pack. The mobile-and-states pass gets a copy, `prompts/build-<screen>-pass2.md`, whose "Build desktop" rule becomes: "Desktop matches the lock. Now build mobile from the mobile pass image (or the lock) and every state in spec/components.md and the state sheet."

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
- Build desktop to match the mockup first. Mobile and states come in a separate pass.
- Accessible: contrast as in tokens.json, visible focus, full keyboard use, prefers-reduced-motion.
- When done, capture design/<slug>/qa/screenshot-01.png at the brief's primary desktop viewport, on the project's fixtures, and stop.
- List every place you could not match the mockup, and why. Do not grade your own result.
```

## 3. Recipes

Use a recipe only where the approved mockup shows the effect. Glass on every card is a generic tell ([`anti-patterns/generic-ai-look.md`](../anti-patterns/generic-ai-look.md)).

**Frosted glass.** Measure text contrast against the busiest spot of the art behind the panel. Where `backdrop-filter` is unsupported, fall back to an opaque `var(--surface)`.

```css
.glass {
  background: color-mix(in oklab, var(--surface) 55%, transparent);
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent);
}
```

**Luminous hairlines.** One pixel of line; the glow comes from the shadow.

```css
.hairline {
  border: 1px solid color-mix(in oklab, var(--accent) 60%, transparent);
  box-shadow: 0 0 12px color-mix(in oklab, var(--accent) 35%, transparent);
}
```

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

**Grain.** An SVG `feTurbulence` overlay at 3 to 6 percent opacity, tiled from a small data URI. Above 6 percent it reads as dirt and costs text contrast.

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

## 4. Mobile and states: a separate pass from the lock

Match desktop to the lock first and run one compare round on it yourself, even when a coding agent built it: capture `qa/screenshot-01.png` at the brief's primary desktop viewport (the method is "Checks on a render" in `SKILL.md`; data from the project's fixtures, live regions masked as in Phase 7), run the compare command of Phase 7 in `SKILL.md`, and fix what its worst tiles show, layout first. Move on when no worst tile shows a layout difference; the full loop, the register, and the verdict belong to Phase 7 ([`references/fidelity-and-lock.md`](fidelity-and-lock.md)). Only then derive the rest, so one pass never moves two targets.

- **Mobile.** Start from the mobile pass image in `mockups/mobile/` when Phase 3 made one ([`references/mockup-prompting.md`](mockup-prompting.md)), otherwise from the approved desktop. Keep the reading order of the layout lock and stack in hierarchy order. The art uses the focal-point crop from `spec/assets.md`, never a squeezed desktop crop. Touch targets at least 44 by 44 CSS pixels. The video background may fall back to its poster on small screens.
- **States.** Build every state listed in `spec/components.md` and drawn in the state sheet (`mockups/states/`) when Phase 3 made one: empty (a sentence saying why, plus an action), loading (a skeleton in the component's shape), error (message plus action), hover, focus, active, disabled. Same tokens as the default state; no state left to the browser default.

## 5. Real components, real data

- Every element maps to the component named in `spec/components.md`. A new component exists only where the inventory says "new".
- Data comes from the real source, or from the project's existing fixtures in development. Never data invented for production. The numbers in the mockup are not data: do not hard-code what you read off the image.
- Real copy replaces mockup copy. Each resulting visual difference goes in the intentional-differences register of Phase 7, `qa/differences.md` (reason: real text), for the user to accept.

## 6. Accessibility and reduced motion (the bold look waives none)

Check each point below on the real render with the methods in "Checks on a render" in `SKILL.md`; Phase 7 records the results.

- Contrast at least 4.5:1 for body text, 3:1 for large text, icons, and control borders, measured on the real pixels behind the text (art, glass, video poster). If the art fails, add a scrim token; do not wash out the art.
- A visible focus ring on every interactive element, from a token, at least 3:1 against its surroundings. Every function in `brief.md` works from the keyboard, in layout order.
- Art is decorative: `aria-hidden="true"` or `alt=""`. Art that carries meaning gets a text alternative. Meaning never by color alone.
- Under `prefers-reduced-motion: reduce`: no autoplaying video (poster instead), no parallax, no ambient loops; transitions become opacity changes or none; state changes stay visible. Text still works at 200 percent zoom.

## Red flags

| Thought                                             | Reality                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| "The illustration is a few gradients, CSS will do." | It drifts from the mockup in every tile. Ship the asset.          |
| "Placeholder numbers until the API is ready."       | Placeholders ship. Use the real source or the project's fixtures. |
| "Mobile, states, reduced motion at the end."        | Derive them in their own pass now, or they are left to defaults.  |

## Exit check

- [ ] Every function in `brief.md` works in the build, on real data or the project's fixtures.
- [ ] The art layer uses the files in `spec/assets.md`; no text in art; no complex art rebuilt in CSS.
- [ ] Components take tokens; no loose hex in a component.
- [ ] Mobile and every state in `spec/components.md` were built in a separate pass after desktop matched.
- [ ] Contrast, focus, keyboard, and reduced motion hold on the real render.
- [ ] A screenshot at the brief's target viewport is in `qa/` (`qa/screenshot-01.png` and its compare round), ready for Phase 7.
