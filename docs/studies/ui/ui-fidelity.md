# ui-fidelity — design study

Status: sketch, 2026-11-14. Not a skill. Decides structure and seams only.

## 1. Responsibility and non-goals

Takes any reference comp (an approved mockup, a Figma export, a screenshot of a design) and a running build, and drives the build to a verified match: deterministic capture, tile-based comparison, fixes ordered by impact, an intentional-differences register, and a visual-regression baseline that locks the result. Deepens `references/fidelity-and-lock.md` and `scripts/compare.py` of `ui-art-direction`.

Non-goals (refuses):

- Inventing or changing the design. The comp is the authority; a disagreement goes back to the user, not into the code.
- Chart title, form, and highlight on a dashboard (`bi-dashboard`). It masks or tolerates chart regions (README, open question 2).
- Design critique and code-first design quality (`impeccable`, `frontend-design`, `ui-ux-pro-max`).
- A "fidelity" claim from one whole-image similarity number.

## 2. Triggers

1. "Here is the Figma export. Make the page match it."
2. "The build looks off compared to the mockup. Find out where."
3. "Check this implementation against `APPROVED.png` and tell me what is different."
4. "Lock this screen so nobody drifts from the approved design."
5. "Our screenshot diffs fail on every run. Make the capture stable."

## 3. Core concepts

- **Deterministic capture:** fixed viewport and device scale, fonts loaded, animations and carets disabled, live content (times, avatars, ads) masked. A noisy capture makes every score meaningless.
- **Worst tile first, as the review order:** the frame is split into a grid; each tile has its own score, and the worst tiles are cropped and read first. The score orders the review; it never passes a build. A global number hides a broken header behind a correct background.
- **Vision model as advisor, not judge:** it names likely causes for a bad tile; the human decides from the crops.
- **Impact order:** layout, then color and light, then type, then detail. Fixing a shadow before a misaligned grid wastes rounds.
- **Intentional differences register:** real text, real data, accessibility fixes, and states the comp lacks are accepted on purpose and written down, so they stop showing up as failures.
- **Design lock:** the accepted capture becomes the baseline; later changes are diffed against it, not against memory.

## 4. Workflow

| #   | Input                                   | Action                                                                                  | Output                        |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Comp, target viewports, the running app | Record the comp's size and viewport; normalize the comp (crop chrome, note scale)       | Reference set                 |
| 2   | App, reference set                      | Fix the capture recipe: viewport, scale, fonts, animation off, masks for live content   | Capture recipe, first capture |
| 3   | Reference, capture                      | `python3 scripts/compare.py REFERENCE CAPTURE --out SHEET.png --report REPORT.json`     | Compare sheet, tile report    |
| 4   | Tile report, worst tiles                | Classify each difference (layout, color and light, type, detail) or mark it intentional | Ordered fix list, register    |
| 5   | Fix list                                | Fix in impact order, one class per round; recapture and recompare                       | Report per round              |
| 6   | Final capture                           | Run a11y and performance checks on the real render (contrast, focus, keyboard, weight)  | QA notes                      |
| 7   | Accepted capture, register              | Store the baseline and the register; record the lock in `STATUS.md`                     | Baseline, fidelity report     |

## 5. Actions and artifacts

- **Capture recipe:** viewport, device scale, wait conditions, disabled animations, masked selectors.
- **Tile report** (`qa/`): method used, grid, per-tile scores, worst tiles, resize and aspect notes.
- **Fix list:** difference, class, tile, fix, round.
- **Intentional differences register:** difference, reason (real data, a11y, missing state), approved by.
- **Fidelity report:** rounds, scores before and after, open differences, a11y and perf results.
- **Baseline:** screenshots per viewport and state, with the capture recipe beside them.

## 6. Expert judgments to inject

- **Fix the capture before the code.** If two captures of the same build differ, stop and stabilize; no fix round starts on a noisy baseline.
- **Never crop to make sizes match.** Resize to the reference and report `resized` and `aspect_mismatch`; a silent crop hides layout errors.
- **Read the worst tile first, not the mean.** It is the review order, not a pass: a single tile far below the rest is read as a likely defect even when the average looks high.
- **Stop when the remaining differences are all intentional or below what a person notices at 100% zoom.** Chasing the last points of a pixel score is an anti-pattern.
- **Fonts first.** A missing web font explains most type and layout drift; confirm the font loaded before reading any type difference.
