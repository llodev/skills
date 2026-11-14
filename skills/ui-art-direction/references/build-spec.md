# Phase 5 — Spec

Turn the locked image (and the clip, if Phase 4 ran) into a package a coding agent can build without guessing. Output in `spec/`: `tokens.json`, `tokens.css` (or the project's theme), `components.md`, `assets.md` (with the buildability triage), `motion.md`, and optionally `DESIGN.md`; the art plates and crops in `assets/`. This phase writes no app code: Phase 6 wires the tokens into the project and copies `assets/` into the app.

The source is `mockups/APPROVED.*` only. Measure everything at the target width: the primary desktop viewport in `brief.md` (Target viewports). An image model's output size is not that width, so scale every measurement taken in mockup pixels by target width / mockup width. To read pixels, crop the region and zoom it in any image viewer, for example `python3 -c "from PIL import Image; Image.open('mockups/APPROVED.png').crop((x0, y0, x1, y1)).save('spec/type/headline.png')"` (box in mockup pixels; create `spec/type/` first). If writing the spec shows the image must change, stop and reopen Phase 3. When the project has a design system, its tokens and components win: map the mockup onto them and add only what is missing.

## 1. Tokens

### Color

```bash
python3 scripts/palette.py mockups/APPROVED.<ext> --out spec/tokens.json --swatch spec/swatch.png
```

Use the lock's real extension. Creates `spec/` if needed, prints `{roles, contrast, notes}`, and writes the full JSON plus a sibling `spec/tokens.css` of custom properties. Roles: `background`, `surface`, `foreground`, `muted-foreground`, `accent`. They are suggestions from pixel counts; review every one against the image.

- **Read `notes` first.** A near-monochrome image gets "no distinct accent": the accent was set to the foreground. Pick the accent by hand from the DNA card or the brand color in the brief. A single-color image gets a note that every role is that color: pick all roles by hand.
- **When art fills most of the frame**, the most frequent color is the art's, not the interface's. Run the script again on a crop of the interface region, without `--out`, and compare.
- **Contrast.** The script checks foreground, muted and accent against the background only. Check text on `surface` and labels on `accent` on a crop of the mockup where each pair appears: `python3 scripts/palette.py <crop>` (no `--out`), read `contrast`. For a pair you changed by hand, compute the WCAG ratio from the two hex values. Thresholds: 4.5:1 for body text, 3:1 for large text (24 px, or 18.66 px bold) and for icons and control boundaries. Fix a failing pair by moving lightness, not by swapping in a new hue.
- **Derive what the image cannot show:** hover and active as a lightness shift of the accent, a focus ring at 3:1 against its neighbors, `danger`, `warning` and `success` that sit in the palette's temperature.
- **Where tokens live.** `spec/tokens.json` is the source. Correct colors in its `roles`, and add the derived ones there (`accent-hover`, `accent-active`, `focus-ring`, `danger`, `warning`, `success`, and `scrim` when art sits behind text). Put the other tokens in top-level groups `type`, `shape`, and `spacing`, each a flat map of token name to value (`font-body`, `text-lg`, `radius-md`, `space-2`). `spec/tokens.css` has one custom property per token, named `--<token name>` exactly. The script only reads images, so edit `tokens.css` by hand in the same step as `tokens.json`, and never rerun it with `--out spec/tokens.json` after hand edits.
- Phase 6 ports these names into the project's form (CSS variables, a Tailwind or shadcn theme, an MUI theme). No raw hex in components.

### Type

Generated glyphs are not a real font, so do not name a font from the image. Identify it by rendering: crop a headline and a body sample from the mockup into `spec/type/` (the crop command above), then render the candidates on a scratch page, `spec/type/candidates.html`: the crops at the top as images at their pixel size, then the same words in three or four candidate fonts at the size the crop shows, each labeled. Capture the page as `spec/type-board.png` (see "Checks on a render" in `SKILL.md`) and compare side by side.

Judge x-height, width, terminals, and the shapes of `a`, `g`, `R`. Candidates come from the project's licensed fonts first (font files, `@font-face` rules, or the framework's font loader already in the project), then Google Fonts, loaded on the scratch page with their stylesheet link. Record family, weights, a size scale (measured in mockup pixels, scaled to the target width), line height, letter spacing, and case.

### Shape and depth

Radii, border widths and opacities, shadows (offset, blur, color), glass blur and saturation, gradients, grain opacity, and a spacing scale snapped to a 4 or 8 px base. Measure on zoomed crops of the full-size mockup, not on a thumbnail, scale to the target width, and round to the base: a value read off a raster is an estimate, and the spacing base settles it.

## 2. Components (`spec/components.md`)

One row per interface element in the mockup:

| Element | Component (existing or new) | Variant | States | Real data shown |
| ------- | --------------------------- | ------- | ------ | --------------- |

States to cover for every interactive element: default, hover, focus, active, disabled, and for every data surface: empty, loading, error. Mark which states the mockup shows and which come from the state sheet (`mockups/states/`, when Phase 3 made one; `lineage.md` has its `States:` line) or are derived.

Data-bound interface (a service map, gauges, a chat panel, tables, charts) is a component built in code: it gets a row here, with how it draws (SVG or canvas) in the Component column, and no triage row. Name the existing component whenever one exists; a new component needs a reason.

## 3. Buildability triage

Every visual element that is not a component (illustration, texture, effect, photo, 3D object) gets exactly one medium. Interface components, data-bound ones included, are in `spec/components.md` instead. Pick the cheapest medium that reaches the approved look. Record the table at the top of `spec/assets.md`.

| Medium        | Use for                                                     | Cost note                                                  | Rule                                                                |
| ------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| CSS           | Panels, borders, gradients, glass, glows, hairlines, layout | Cheapest; themeable through tokens                         | Never rebuild a complex illustration in CSS                         |
| SVG           | Icons, line art, diagrams, simple motifs, grain filters     | Cheap, sharp at any size; slow past a few thousand nodes   | Animate few nodes; heavy scenes go to canvas                        |
| Image         | Illustration, painted or photographic backgrounds, textures | Bytes on the wire; needs crops per viewport                | Default for any art the model painted                               |
| Video         | Ambient loops of the art layer                              | Heaviest bytes; needs a poster, pause when hidden, a still | Only from a clean, UI-free clip; never with UI inside               |
| Canvas, WebGL | Motion that reacts to data or input; particle fields        | High build cost; GPU and battery; needs a static fallback  | Only when the motion must respond to something; otherwise use video |
| 3D            | An object the user rotates or inspects                      | Highest build and load cost                                | Only when handling the object is part of the product                |

A non-component element that fits no row is not buildable at the approved fidelity. The buildability score was wrong: reopen Phase 3 with that element as the one change.

## 4. Asset pipeline (`spec/assets.md`)

Art is a generated asset; interface is real components. Per asset, record: id, source image, medium, format, sizes, focal point, alt text (or `decorative`), provenance (prompt, model family, refs), and file path. Asset files live in `assets/`: plates as `assets/plate-<id>.<ext>` with their sidecars, crops beside them (`assets/plate-<id>-desktop.<ext>`, `-mobile`), and files cut from an approved clip (the trimmed loop, its formats, its poster); the clip itself stays in `video/`. A screen whose triage has no image, video, or 3D row has no art assets: write "no art assets" under the table.

1. **Clean art plate.** This phase generates the plates, one image per plate, count stated and confirmed (cost gate in `SKILL.md`); a plate already made in Phase 4 is reused. Pass the approved image as the reference with the art-plate prompt of `references/mockup-prompting.md` section 3, saved as `prompts/plate-<id>.md`, asking for "the same artwork without any UI, no text, no labels, clean background plate". Check that light and color match the mockup; regenerate (with the user's go-ahead) rather than repaint.
2. **No baked text.** Any lettering in the art is removed, or rebuilt as real text in the interface layer.
3. **Responsive crops.** Generate the plate wider and taller than the largest viewport needs, record the focal point as percentages (`x 62%, y 40%`) for `object-position`, and export a desktop and a mobile crop. If the mobile crop loses the subject, generate a separate mobile plate.
4. **Alpha.** Image models are unreliable at transparency. Generate cutouts on a flat matte background in a color absent from the subject, then key it out; for glows on dark art, generate on black and composite with a screen blend. Inspect the edges at 200 percent.
5. **Format.** AVIF or WebP for painted and photographic art, SVG for vector, PNG only when lossless alpha needs it. Video as MP4 plus WebM, short, no audio track, with a poster frame. Set a byte budget per asset and state it: take it from the performance limits in the brief's Constraints; when the brief has none, propose one per asset as your judgment and put it on the `Open decisions` line of `STATUS.md` for the user.

## 5. Motion (`spec/motion.md`)

Carry the file from Phase 4. If Phase 4 was skipped, there is no clip and no ambient motion: open the file with `No ambient motion: Phase 4 skipped.`, leave out the clip fields (`Source:`, `Discarded:`, ambient layers), and write the interaction entries only. Each entry gives duration, easing, trigger, and reduced-motion behavior. Hover and press: 120 to 180 ms, ease-out, color or elevation, no layout shift. Focus: an instant, visible ring, never animated. Entry of new content: 200 to 300 ms, one property or two. Loading and data updates: tied to the real request. Under reduced motion, feedback stays as color change without movement.

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

## Exit check

- [ ] `spec/tokens.json` and `spec/tokens.css` (or the project theme) exist, roles reviewed by hand, every `notes` entry resolved, and every token in the JSON has a `--<token name>` property in the CSS.
- [ ] Every text, icon and control pair meets 4.5:1 or 3:1 as it applies, including pairs on `surface` and `accent`.
- [ ] `spec/components.md` lists every interface element with its component and all applicable states.
- [ ] `spec/assets.md` opens with the triage table and gives every non-component visual element one medium; every art asset, if any, is a clean plate in `assets/` with no text, a format, crops and a focal point, or the file says "no art assets".
- [ ] `spec/motion.md` exists, with reduced-motion behavior per entry.
