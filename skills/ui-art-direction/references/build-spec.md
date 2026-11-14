# Phase 5 — Spec

Turn the locked image (and the clip, if Phase 4 ran) into a package a coding agent can build without guessing. Output in `spec/`: `tokens.json`, `tokens.css`, `components.md`, `assets.md` (with the buildability triage), `motion.md`, and optionally `DESIGN.md`; the art plates and crops in `assets/`. This phase writes no app code: `spec/tokens.css` lives in the pack only, and Phase 6 ports it into the project's theme and copies `assets/` into the app.

The source is `mockups/APPROVED.*` only. Measure everything at the target width: the primary desktop viewport in `brief.md` (Target viewports). An image model's output size is not that width, so scale every measurement taken in mockup pixels by target width / mockup width. To read pixels, crop the region and zoom it in any image viewer, for example `python3 -c "from PIL import Image; Image.open('mockups/APPROVED.png').crop((x0, y0, x1, y1)).save('spec/type/headline.png')"` (box in mockup pixels; create `spec/type/` first). If writing the spec shows the image must change, stop and reopen Phase 3. When the project has a design system, its tokens and components win: map the mockup onto them and add only what is missing.

## 1. Tokens

### Color

```bash
python3 scripts/palette.py mockups/APPROVED.<ext> --out spec/tokens.json --swatch spec/swatch.png
```

Use the lock's real extension. Creates `spec/` if needed, prints `{roles, contrast, notes}`, and writes the full JSON plus a sibling `spec/tokens.css` of custom properties. Roles: `background`, `surface`, `foreground`, `muted-foreground`, `accent`. They are suggestions from pixel counts; review every one against the image.

- **Read `notes` first.** A near-monochrome image gets "no distinct accent": the accent was set to the foreground. Pick the accent by hand from the DNA card or the brand color in the brief. A single-color image gets a note that every role is that color: pick all roles by hand.
- **When art fills most of the frame**, the most frequent color is the art's, not the interface's. Run the script again on a crop of the interface region, without `--out`, and compare.
- **Contrast.** The script checks foreground, muted and accent against the background only. Check text on `surface` and labels on `accent` on a crop of the mockup where each pair appears: `python3 scripts/palette.py <crop>` (no `--out`), read `contrast`. For a pair you changed by hand, compute the WCAG ratio from the two hex values. Thresholds: 4.5:1 for body text; 3:1 for large text (24 px, or 18.66 px bold), icons, control boundaries, data marks, and status colors. Fix a failing pair by moving lightness, not by swapping in a new hue.
- **Derive what the image cannot show.** Hover and active: the accent moved one fixed lightness step each, toward more contrast with `surface` (8 percent in OKLCH lightness by default); state the step in `spec/components.md`. Focus ring: 3:1 against its neighbors, 2 px wide with a 2 px offset (default). `danger`, `warning`, and `success` sit in the palette's temperature, at 3:1 against their background as status colors and 4.5:1 where they color text. `scrim`, when art sits behind text: `background` at the lowest opacity that brings the text over the art's busiest spot to its threshold.
- **Where tokens live.** `spec/tokens.json` is the source. `roles` maps each role name to a hex string; correct colors there, and add the derived ones (`accent-hover`, `accent-active`, `focus-ring`, `danger`, `warning`, `success`, `scrim`). `contrast` and `notes` are script output, not tokens. Put every other token in a top-level group, each a flat map of token name to value: `type`, `shape`, `spacing`, `shadow`, `effects` (blur, grain), `motion`, `z`, `breakpoints`, and `data` (chart series). A token name outside `roles` is `<group>-<name>` (`type-body`, `shape-radius-md`, `spacing-2`, `effects-grain-opacity`, `data-series-1`); roles keep their bare names. `spec/tokens.css` has one custom property per token, `--<token name>` exactly (`--surface`, `--shape-radius-md`). The script only reads images, so edit `tokens.css` by hand in the same step as `tokens.json`, and never rerun it with `--out spec/tokens.json` after hand edits.
- Phase 6 ports these names into the project's form (CSS variables, a Tailwind or shadcn theme, an MUI theme). No raw hex in components.

### Type

Generated glyphs are not a real font, so do not name a font from the image. Identify it by rendering: crop a headline and a body sample from the mockup into `spec/type/` (the crop command above), then render the candidates on a scratch page, `spec/type/candidates.html`: the crops at the top as images at their pixel size, then the same words in up to three candidate fonts at the size the crop shows, each labeled. Capture the page as `spec/type-board.png` ([`capture-and-checks.md`](capture-and-checks.md)) and compare side by side.

Judge x-height, width, terminals, and the shapes of `a`, `g`, `R`. Candidates come from the project's licensed fonts first (font files, `@font-face` rules, or the framework's font loader already in the project), then Google Fonts, loaded on the scratch page with their stylesheet link. Name the best candidate even when none matches, and the visible gap. Check its license in one line: web embedding and self-hosting allowed (Google Fonts are), or the project already licenses it. `spec/components.md` opens with a `Font:` line: family, source, license, gap. Record family, weights, a size scale (measured in mockup pixels, scaled to the target width), line height, letter spacing, and case in the `type` group.

### Shape and depth

Radii and border widths and opacities (`shape`), shadows with offset, blur, and color (`shadow`), glass blur and saturation, gradients, and grain opacity (`effects`), and a spacing scale (`spacing`). Measure on zoomed crops of the full-size mockup, not on a thumbnail, scale to the target width, and round to the nearest multiple of the base: a value read off a raster is an estimate, and the base settles it. The spacing base is 4 px, or 8 px when every measured gap is a multiple of 8.

## 2. Components (`spec/components.md`)

One row per interface element in the mockup. Without a design system or existing components, every row is `new`; say so once above the table.

| Element | Component (existing or new) | Variant | Size/padding | Tokens | Style | States | State source | Real data shown |
| ------- | --------------------------- | ------- | ------------ | ------ | ----- | ------ | ------------ | --------------- |

Variant is the project's variant name, or `default`. Style holds the effects on the component (glass, glow, hairline, gradient), grouped in its own row; they get no triage row. States to cover for every interactive element: default, hover, focus, active, disabled, and for every data surface: empty, loading, error. State source names each state's origin: `shown` (the mockup), `sheet` (the state sheet in `mockups/states/`, when `lineage.md` has its `States:` line), or `derived` (`hover: sheet, empty: derived`).

Data-bound interface (a service map, gauges, a chat panel, tables, charts) is a component built in code: it gets a row here and no triage row. Its Component cell says how it draws: HTML for tables and lists, SVG for charts and maps up to a few thousand nodes, canvas past that or when it redraws at frame rate. A chart row hands its chart design to the `bi-dashboard` skill when it is installed; without it, the row follows the same rules. Name the existing component whenever one exists; a new component needs a reason.

Under a `Mobile` heading, give the mobile breakpoint (the brief's mobile viewport, else 390 px wide) and, per element, what changes: it stacks, hides behind a control, or swaps to the mobile crop. Take it from the mobile pass image when Phase 3 made one; otherwise derive it from the lock and mark it `derived`.

## 3. Buildability triage

Every visual element that is not a component (illustration, texture, effect, photo, 3D object) gets exactly one medium. Walk the mockup region by region, in the brief's order, and give each distinct art element one row; effects on a component stay in its `Style` cell. Pick the cheapest medium whose render, held beside a mockup crop at 100 percent, shows no difference you can name. Record the table at the top of `spec/assets.md`.

| Medium        | Use for                                                                  | Cost note                                                  | Rule                                                                |
| ------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| CSS           | Backdrop gradients, glows, and hairlines that belong to no component     | Cheapest; themeable through tokens                         | Never rebuild a complex illustration in CSS                         |
| SVG           | Icons, line art, diagrams, simple motifs, grain when a filter reaches it | Cheap, sharp at any size; slow past a few thousand nodes   | Animate few nodes; heavy scenes go to canvas                        |
| Image         | Illustration, painted or photographic backgrounds, textures, grain tiles | Bytes on the wire; needs crops per viewport                | Default for any art the model painted                               |
| Video         | Ambient loops of the art layer                                           | Heaviest bytes; needs a poster, pause when hidden, a still | Only from a clean, UI-free clip; never with UI inside               |
| Canvas, WebGL | Motion that reacts to data or input; particle fields                     | High build cost; GPU and battery; needs a static fallback  | Only when the motion must respond to something; otherwise use video |
| 3D            | An object the user rotates or inspects                                   | Highest build and load cost                                | Only when handling the object is part of the product                |

- **Grain** is a seamless image tile, 256 to 512 px, unless a pure SVG filter reaches the look.
- **A logo** is the user's brand file when they supply one; brand design is out of scope, so never generate one. Any other lit or 3D-looking emblem is an image plate.

A non-component element that fits no row is not buildable at the approved fidelity. The critic's buildability score in `lineage.md` was wrong: reopen Phase 3 with that element as the one change.

## 4. Asset pipeline (`spec/assets.md`)

Art is a generated asset; interface is real components. Per asset, record: id, source image, medium, format, sizes, focal point, alt text (or `decorative`), provenance (prompt, model family, refs), and file path. Asset files live in `assets/`: plates as `assets/plate-<id>.<ext>` with their sidecars, crops beside them (`assets/plate-<id>-desktop.<ext>`, `-mobile`), and files cut from an approved clip (the trimmed loop, its formats, its poster); the clip itself stays in `video/`, unless the user made it an asset in Phase 4 (`assets/clip-<n>.mp4`). A screen whose triage has no image, video, or 3D row has no art assets: write "no art assets" under the table.

1. **Clean art plate.** One plate per triage row whose medium is image. Cut it from the comp (the Pillow crop above) only where no UI sits over the region; where UI covers the art, regenerate it. This phase generates the plates, one image per plate, count stated and confirmed (cost gate in `SKILL.md`); a plate already made in Phase 4 is reused. Pass the approved image as the reference with the art-plate prompt of `references/mockup-prompting.md` section 3, saved as `prompts/plate-<id>.md`, asking for "the same artwork without any UI, no text, no labels, clean background plate". Check that light and color match the mockup; regenerate (with the user's go-ahead) rather than repaint.
2. **No baked text.** Any lettering in the art is removed, or rebuilt as real text in the interface layer.
3. **Responsive crops.** Make the plate 2x the width of the largest breakpoint's container (the widest viewport in the brief), at the aspect of the region it fills in the layout; when the model does not offer that aspect, take the nearest wider one and crop. Record the focal point as percentages (`x 62%, y 40%`) for `object-position`, and export a desktop and a mobile crop; `sizes` is the region's width at each breakpoint. If the mobile crop loses the subject, generate a separate mobile plate.
4. **Alpha.** Image models are unreliable at transparency. Generate cutouts on a flat matte background in a color absent from the subject, then key it out with Pillow; for glows on dark art, generate on black and composite with a screen blend. Inspect the edges at 200 percent.
5. **Format.** AVIF or WebP for painted and photographic art (`avifenc` or `cwebp` when present, else Pillow's WebP), SVG for vector, PNG only when lossless alpha needs it. Video as MP4 plus WebM, short, no audio track, with a poster frame. Set a byte budget per asset and state it: take it from the performance limits in the brief's Constraints; when the brief has none, propose one per asset as your judgment and put it on the `Open decisions` line of `STATUS.md` for the user.

## 5. Motion (`spec/motion.md`)

Carry the file from Phase 4 and finish it: this phase makes the draft final. If Phase 4 was skipped, there is no clip and no ambient motion: open the file with `No ambient motion: Phase 4 skipped.`, leave out the clip fields (`Source:`, `Motion focus:`, `Discarded:`, ambient layers), and write the interaction entries only. Each entry gives duration, easing, trigger, and reduced-motion behavior. Hover and press: 120 to 180 ms, ease-out, color or elevation, no layout shift. Focus: an instant, visible ring, never animated. Entry of new content: 200 to 300 ms, one property or two. Loading: tied to the real request. Data updates: values swap in place, no count-up, no row movement; new rows enter as new content. Under reduced motion, feedback stays as color change without movement.

## 6. DESIGN.md mapping

DESIGN.md is an open format for design-system context: YAML tokens in front matter plus prose sections. It is at version `alpha` and changing, so before writing one, print the current spec with `npx @google/design.md spec` and follow it where it differs from this table. Write `spec/DESIGN.md` when the project already has a `DESIGN.md` or the user names a tool that reads one; otherwise skip this section. `npx` needs the network: without it, skip and say so. `tokens.json` and `tokens.css` stay the source.

| Pack artifact                             | DESIGN.md                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slug and concept line                     | `name`, `description`, `version: alpha`; concept line and mood in the `## Overview` section                                                                                                                        |
| Color roles                               | `colors`, role names kept as token names; add `primary` (the spec requires it) with the accent value                                                                                                               |
| Type scale                                | `typography.<level>` with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`                                                                                                                    |
| Radii                                     | `rounded` (for example `sm`, `md`, `lg`, `full`)                                                                                                                                                                   |
| Spacing scale and grid                    | `spacing`; the layout lock's grid in the `## Layout` section                                                                                                                                                       |
| Shadows, glass, grain                     | `## Elevation & Depth` prose (the spec has no token group for them)                                                                                                                                                |
| Shape motifs                              | `## Shapes` prose                                                                                                                                                                                                  |
| Components and states                     | `components.<name>` with `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`; each state as its own key (`button-primary-hover`), values as `{colors.accent}` references |
| Art-versus-interface rules, generic tells | `## Do's and Don'ts`                                                                                                                                                                                               |
| Motion, assets                            | No field: they stay in `spec/motion.md` and `spec/assets.md`                                                                                                                                                       |

Sections present must follow the spec's order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. Validate with `npx @google/design.md lint spec/DESIGN.md`: it reports broken token references and component text and background pairs below 4.5:1.

## Hand-off

Rewrite `STATUS.md`: `Phase: 5 - Spec`, `Next step: design/<slug>/spec/components.md` (Phase 6 starts there), open decisions. Ask the user to confirm the spec before Phase 6 only when `Open decisions` is not `none`; otherwise go on.

## Exit check

- [ ] `spec/tokens.json` and `spec/tokens.css` exist in the pack, roles reviewed by hand, every `notes` entry resolved, and every token in `roles` and the groups has a `--<token name>` property in the CSS.
- [ ] Every text, icon, control, data-mark, and status-color pair meets 4.5:1 or 3:1 as it applies, including pairs on `surface` and `accent` and `danger`, `warning`, `success` against their backgrounds.
- [ ] `spec/components.md` opens with the `Font:` line and lists every interface element with its component, size, tokens, style, all applicable states and their source, and a `Mobile` section.
- [ ] `spec/assets.md` opens with the triage table and gives every non-component visual element one medium; every art asset, if any, is a clean plate in `assets/` with no text, a format, crops and a focal point, or the file says "no art assets".
- [ ] `spec/motion.md` exists, with reduced-motion behavior per entry.
