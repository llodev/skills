# ui-assets — design study

Status: sketch, 2026-11-14. Not a skill. Decides structure and seams only.

## 1. Responsibility and non-goals

Turns generated art into production assets: a clean art plate with no UI and no text, alpha where the art sits over the interface, responsive crops anchored on a focal point, modern formats with a fallback, a size budget, and loop video encoded for the web. Deepens the asset pipeline section of `references/build-spec.md` in `ui-art-direction`.

Non-goals (refuses):

- Logo, brand identity, and illustration as a product. Assets here are a layer of a UI.
- Icons and icon systems as a design task, and image content management (a CMS or DAM).
- Text inside art. Every word on screen is real text in the interface layer.
- Deciding how the art moves (`ui-motion`). It only encodes and delivers the clip.
- Charts rendered as images (`bi-dashboard` owns chart communication; charts stay live).

## 2. Triggers

1. "Cut the background art out of the approved mockup without the UI on top."
2. "Make this hero image work on mobile without cropping the subject."
3. "The hero image is 4 MB. Get it into budget."
4. "Export the loop video as a lightweight background with a poster frame."
5. "This illustration has text baked in. Regenerate it clean and keep the look."

## 3. Core concepts

- **Art plate:** the artwork alone, requested as a clean background plate with no interface and no text, at a size larger than the largest viewport crop.
- **Focal point:** the region that must survive every crop, recorded once and reused for each aspect ratio.
- **Responsive set:** widths and aspect ratios per breakpoint, served with `srcset` and `sizes` or art-directed `<picture>` sources.
- **Alpha-aware delivery:** art that overlaps the interface keeps a clean edge and transparency; the format follows the need for alpha.
- **Asset budget:** bytes per screen and per asset, decided before export, checked after.
- **Provenance:** each asset keeps its source image, prompt, and license note, so it can be regenerated or replaced.

## 4. Workflow

| #   | Input                             | Action                                                                                       | Output                 |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | `APPROVED.*`, buildability triage | List every element triaged as image or video; mark which overlap the interface               | Asset list             |
| 2   | Asset list                        | Request or cut clean plates (no UI, no text); check that nothing identifiable was reproduced | Plates with provenance |
| 3   | Plates, breakpoints               | Record the focal point; derive crops per aspect ratio                                        | Crop set               |
| 4   | Crop set                          | Export modern format with fallback, alpha only where needed; compress to the budget          | Exported files         |
| 5   | Loop clips from `ui-motion`       | Encode short, muted, seamless loops with a poster frame; no autoplay with sound              | Video assets, posters  |
| 6   | Exported files                    | Write markup guidance: `srcset`, `sizes`, `<picture>`, loading priority, dimensions          | `spec/assets.md`       |
| 7   | Running build                     | Check weight, layout shift, crops on real viewports, contrast of text over art               | Asset QA notes         |

## 5. Actions and artifacts

- **Asset list** in `spec/assets.md`: id, role (background, illustration, texture), source, overlaps UI, alpha, focal point.
- **Plates** with sidecar provenance (prompt, references, date, license note).
- **Crop set** per breakpoint, named by asset id and width.
- **Delivery table:** asset, formats, widths, bytes, loading priority, poster for video. **Asset QA notes:** budget, layout shift, contrast over art.

## 6. Expert judgments to inject

- **Generate larger than you ship, crop smaller than you generate.** A plate sized to one viewport cannot be re-cropped for another.
- **Text over art needs a measured contrast floor** (scrim, blur, or a quiet region chosen by the focal point), checked at the worst crop, not the hero crop.
- **Set width and height (or an aspect ratio) on every asset** so nothing shifts while it loads.
- **The largest above-the-fold image gets loading priority;** everything below the fold loads lazily.
- **Grain and texture are cheaper in CSS or SVG than baked into a large image** (exception: a texture that is the art itself).
- **Never ship a generated asset whose provenance is unknown;** regenerate it with a recorded prompt instead.
