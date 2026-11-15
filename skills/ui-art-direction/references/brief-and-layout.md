# Phase 0 — Brief and layout lock

Fix what the screen does before anyone decides how it looks. This phase writes `brief.md`, a layout lock in `layout/`, the pack folder, and `STATUS.md`. The mode is chosen in the same phase with [`modes-and-models.md`](modes-and-models.md).

Gate: no image prompt is written before `brief.md` and a layout lock exist.

A style line written straight into a prompt ("warm lamp light, deep violet and gold") is direction set with no brief and no layout under it. Every variant then drifts in layout as well as look, and nothing can be compared. Write the brief and lock the layout first, even when the request reads as "just make it look good".

## 1. Discover the project

Precedence: **explicit user direction > the project's design system and existing UI > conventions already in the project > this skill's patterns.**

Search and read, when they exist:

- **Stack:** `package.json` (React, Next.js, Vue, Svelte, Astro, Angular), `pyproject.toml` with a web framework, templates folders. Note how the app runs locally (`dev` script, port).
- **Design system:** `components.json` (shadcn/ui), `globals.css` or `app.css` (`:root`, `.dark`, `@theme`), `tailwind.config.*`, theme objects (`createTheme`, `extendTheme`, `MantineProvider`, `ConfigProvider`), `tokens.json`, Style Dictionary output, a `DESIGN.md`, a brand guide PDF the user names.
- **Existing UI:** the routes and screens in scope, their components, and their states. If the app runs, open it.
- **Conventions:** an existing `design/` or `docs/design/` folder, naming, the language of the product copy.

Record a mandatory brand palette or type system in the brief. Exploration then varies only atmosphere, art, material, and composition, and the brand colors and faces stay fixed in every prompt.

If something essential cannot be found (who the user is, which functions must stay), ask **once**, concretely. Assume the rest and write each assumption in the brief.

## 2. The brief contract

`brief.md` holds these sections, in this order. See [`examples/brief.md`](../examples/brief.md).

1. **Purpose:** what the screen is for, in one or two sentences, from the user's side.
2. **User:** who uses it, how often, on what device, in what situation.
3. **Real content:** the exact strings, numbers, and items the mockup will show, in the product language. Titles, nav items, sample rows, empty and error messages. No lorem ipsum: an image model renders whatever text it is given, and placeholder text hides real length problems.
4. **Regions:** every region of the screen in reading order, what it holds, and its approximate share of the frame. Mark the primary region (where the eye lands first). For a site, the sections in scroll order.
5. **Functions that cannot disappear:** every action and piece of information the screen must keep, each tied to its region. For an existing app, list them from the running app or the code, not from memory.
6. **Target viewports:** desktop size and aspect (1920×1080, 16:9, or 1600×1000, 16:10), the mobile size (390×844, about 9:19.5), and which one is primary. The primary desktop aspect is the one Phase 2 sends as `--aspect`, so pick one the image model accepts ([`modes-and-models.md`](modes-and-models.md)).
7. **Constraints:** stack, design system to respect or not, mandatory brand palette and type, accessibility level (WCAG 2.2 AA by default), performance limits for video or heavy art.
8. **Acceptance:** checkable statements a finished build must pass, for example "the incident list shows 20 rows at 1920×1080 without scrolling".

A brief without its regions is a Phase 0 defect. The blind critic in [`converge.md`](converge.md) judges layout fidelity from `brief.md` alone, against the regions and functions it lists. At the end of Phase 1, one line becomes the brief's last, after Acceptance (on a reskin, after the inventory and its `Tests` heading): `Concept: <the concept line>`, copied from `dna.md`, because the critic judges identity against it and never sees `dna.md`.

## 3. The layout lock

A layout lock is an image the image model copies the **arrangement** from, never the appearance. It is drawn from the brief's region list, never the other way around, and it adds positions and proportions at the target viewport. What it fixes: regions, order, proportions, content. What stays free: palette, light, material, texture, shape, atmosphere. Two kinds:

- **Wireframe** (`layout/wire.json` and `layout/wire.png`) for a new screen; for a site, one per section or one tall frame. When the brief names a mobile viewport, also write `layout/wire-mobile.json` (size `[1080, 1920]`, the brief's regions in mobile reading order) and render `layout/wire-mobile.png` with the same command: it is the layout lock of the Phase 3 mobile pass.
- **Skeleton render** (`layout/skeleton.png`) when the app already exists. It is the running app with its styles neutralized, so the real positions, sizes, and text lengths become the lock. Reconcile it with the brief's regions: a region the brief lists and the skeleton lacks is a new region and goes into `wire.json`. **On the reskin route the wireframe step is skipped:** the running app's screenshot, or its skeleton render, is the layout lock ([`reskin.md`](reskin.md) section 2), and the information architecture is frozen, so no region is added.

### 3.1 `wire.json`

Coordinates are **percentages of the frame**, not pixels. `size` is the output size in pixels (default `[1920, 1080]`), and it has the same aspect as the `--aspect` used in Phase 2: a 16:10 wireframe under 16:9 mockups makes the model re-proportion every region.

```json
{
  "size": [1920, 1080],
  "boxes": [
    { "x": 0, "y": 0, "w": 18, "h": 100, "label": "sidebar: navigation + saved views" },
    { "x": 18, "y": 0, "w": 82, "h": 9, "label": "top bar: service name, time range, search" },
    { "x": 18, "y": 9, "w": 56, "h": 91, "label": "main: incident timeline" },
    { "x": 74, "y": 9, "w": 26, "h": 91, "label": "assistant panel: conversation + input" }
  ]
}
```

Render it:

```bash
python3 scripts/wireframe.py design/<slug>/layout/wire.json --out design/<slug>/layout/wire.png
```

Boxes that run past the frame are clamped to it; boxes too small or entirely outside are skipped. Long labels wrap. The output is gray on gray on purpose: a styled wireframe leaks a look into every mockup. A full example: [`examples/wire.json`](../examples/wire.json).

One box per region of the brief, labeled in the brief's words. Labels say what the region **does**, not how it looks: `"filters: status, owner, date"`, not `"glass pill buttons"`.

### 3.2 Skeleton render of an existing app

Use it for a reskin and for any screen that already exists. Steps:

1. Run the app with realistic data and open the screen in scope.
2. Set the viewport to the target size from the brief, device scale 1.
3. Save the CSS below as `design/<slug>/layout/skeleton.css` and inject it. It removes color, borders, shadows, gradients, images, and video, and keeps every box, its size, and its text.
4. Capture the viewport and save it as `design/<slug>/layout/skeleton.png`. Repeat for each state or route the brief names.

```css
*,
::before,
::after {
  color: #5c5c58 !important;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  text-shadow: none !important;
  filter: none !important;
  backdrop-filter: none !important;
  animation: none !important;
  transition: none !important;
}
:is(html, body) {
  background: #f2f2f0 !important;
}
:is(header, nav, main, aside, footer, section, article, form, dialog, table, [role]) {
  outline: 1px solid #a9a9a4 !important;
  outline-offset: -1px;
}
:is(button, input, select, textarea, [role="button"]) {
  background: #dcdcd8 !important;
}
:is(img, picture, video, canvas, iframe, svg) {
  filter: brightness(0) invert(0.85) !important;
}
```

The last rule turns every image, video, canvas, and icon into a flat gray silhouette of the same size. Do not change `font-family`, `font-size`, or spacing: they move the layout, and the lock must be the layout the build will keep.

Capture with the browser automation the project already uses. With Playwright (the capture options are in [`capture-and-checks.md`](capture-and-checks.md)): open a page in a context with `viewport` set to the target size and `deviceScaleFactor: 1`, `goto` the screen, `page.addStyleTag({ path: "layout/skeleton.css" })`, then `page.screenshot`. Without automation: paste the CSS into the browser's developer tools, set the device toolbar to the target size, and capture the viewport. With neither: save a temporary copy of the page with `<link rel="stylesheet" href="skeleton.css">` appended, and capture it with the browser's own headless screenshot mode at the target size. The skeleton replaces `wire.png` as the layout reference in every Phase 2 prompt. For the reskin route, continue with [`reskin.md`](reskin.md).

## 4. The pack folder

Every run keeps its artifacts in `design/<slug>/`, unless the project already has a design folder convention; then use that and record it on the `Open decisions` line of `STATUS.md` (`pack folder: docs/design/<slug>/, project convention`).

```
design/<slug>/
  STATUS.md           phase, mode, approved file, next step, open decisions
  brief.md            Phase 0
  layout/             wire.json, wire.png or skeleton.png
  refs/               originals; SOURCES.md records origin and license
  dna.md              Phase 1
  prompts/            every prompt used, versioned
  mockups/v1 … vN/    images, each run with a sidecar .json (model, refs, prompt, date)
  mockups/APPROVED.*  the design lock (a site adds APPROVED-s<N>.* per section)
  mockups/states/     the state sheet; mockups/mobile/ the mobile pass (Phase 3)
  lineage.md          what changed per version, why, scores
  video/              Phase 4: clip-NN.mp4, each with a sidecar .json; frames-NN/
  spec/               tokens.json, tokens.css, components.md, assets.md, motion.md
  assets/             art plates and crops (Phase 5), copied into the app at build
  qa/                 screenshots, tile reports, baseline
```

## 5. `STATUS.md`

`STATUS.md` is the baton between sessions. A new session reads it first and resumes from `Next step`. It has exactly five lines, rewritten at the end of every phase and before every hand-off:

```
Phase: <n - name>
Mode: automatic | native | assisted
Approved: <paths separated by "; ", or none>
Next step: <one line that names the file to attach or to save back, as a path from the project root>
Open decisions: <list or none>
```

A filled `Next step:` line: `Next step: Attach design/obs/refs/observatory.jpg (first) and design/obs/layout/wire.png (second) to your image app, run design/obs/prompts/v1-dusk.md, save the result as design/obs/mockups/v1/mock-1.png`.

## Exit check

- [ ] `brief.md` has all eight sections: real content in the product language, every region with its contents, and the functions that cannot disappear.
- [ ] A layout lock exists, drawn from the brief's regions: `layout/wire.png` rendered from `layout/wire.json` with a `size` at the aspect Phase 2 will send, or `layout/skeleton.png` captured at the target size, or on a reskin `layout/current-<screen>.png`; when the brief names a mobile viewport, also `layout/wire-mobile.png` (on a reskin, `layout/current-<screen>-mobile.png`).
- [ ] A mandatory brand palette or type system, if any, is recorded in the brief.
- [ ] `STATUS.md` exists with its five lines and the mode chosen.
