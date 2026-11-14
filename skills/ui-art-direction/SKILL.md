---
name: ui-art-direction
description: >-
  Art-directs a screen, dashboard, or site in image and video models before
  any code exists, then builds it and verifies the build against the approved
  mockup: layout lock, out-of-UI references distilled into a visual DNA,
  concept mockups, blind-critic iteration, motion found with image-to-video, a
  build spec, and a fidelity loop. Use when a UI, landing page, or redesign
  must not look templated, when the user brings reference images or asks for
  a distinctive, creative, or "not generic" design, when restyling an
  existing app with a new visual identity, or when turning an approved comp
  into a faithful build. Works in any web stack, with any image or video model
  or none (prompts for the user to run). Triggers include
  image-first, mockup, moodboard, art direction, reskin, design to code,
  fidelity, image-to-video, Nano Banana, and GPT Image. Do NOT use for charts
  and KPI cards (bi-dashboard), UX research, wireframes as the end product,
  native mobile builds, or logo and brand identity design.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - ui
    - design
    - image-first
    - mockup
  family: ui
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# Art direction before code

This skill moves visual exploration out of code. A coding agent asked for "a beautiful site" ships the layout it already knows how to implement, and its own review approves it. Here the look is decided in image models, where variation is cheap, against a locked layout; motion is found with image-to-video; and only the approved mockup is turned into a functional build, which is then measured against it tile by tile. Every phase leaves a file in the pack folder, so a human can inspect the run and a later session can resume it.

Scope is web UI: screens, dashboards, product and marketing sites, in the stack the project already uses. Chart titles, forms, and highlights belong to `bi-dashboard`; this skill sets the identity and atmosphere around them. Without `bi-dashboard` installed, leave chart design to the project's conventions and say so.

## How to use this skill

Run the phases in order. A route may start later or stop earlier, never reorder them.

| Phase                     | Output                                                                                       | Read                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Brief and layout lock  | `brief.md`, `layout/` (wireframe or skeleton render), mode in `STATUS.md`                    | [`references/brief-and-layout.md`](references/brief-and-layout.md), [`references/modes-and-models.md`](references/modes-and-models.md) |
| 1. Concept and references | concept line, `refs/` with `SOURCES.md`, `dna.md`                                            | [`references/concept-and-dna.md`](references/concept-and-dna.md)                                                                       |
| 2. Explore                | `mockups/v1/` with a control plate and a board; a storyboard for sites                       | [`references/mockup-prompting.md`](references/mockup-prompting.md)                                                                     |
| 3. Converge               | `lineage.md`, blind scores, state sheet, `mockups/APPROVED.*` (the design lock), mobile pass | [`references/converge.md`](references/converge.md)                                                                                     |
| 4. Motion (optional)      | `video/`, keyframes, draft `spec/motion.md`                                                  | [`references/motion.md`](references/motion.md)                                                                                         |
| 5. Spec                   | `spec/` (tokens, components, assets, motion, buildability triage)                            | [`references/build-spec.md`](references/build-spec.md)                                                                                 |
| 6. Build                  | code in the project's stack; mobile and states derived from the lock                         | [`references/implementation.md`](references/implementation.md)                                                                         |
| 7. Verify and lock        | `qa/` fidelity report, baseline screenshots, a11y and performance checks                     | [`references/fidelity-and-lock.md`](references/fidelity-and-lock.md)                                                                   |

| Route                  | Start                                       | Notes                                                                                                                                                            |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New screen or site     | Phase 0 → 7                                 | A site gets a scroll storyboard in Phase 2, not one image, and one lock per frame in Phase 3                                                                     |
| Concept only           | Phase 0 → 3                                 | Stops at the design lock; the user takes the pack elsewhere                                                                                                      |
| Reskin an existing app | Phase 0, `references/reskin.md`, then 1 → 7 | The running app's screenshot is the layout lock (no wireframe); information architecture is frozen                                                               |
| Comp in hand           | Phase 5, after an abbreviated Phase 0       | The user already has an approved image: copy it to `mockups/APPROVED.<ext>` and append the lock line to `lineage.md` with its source; the blind score is skipped |
| Build from a pack      | Phase 6                                     | A complete `design/<slug>/` exists; read its `STATUS.md` first                                                                                                   |
| Motion only            | Phase 4                                     | An approved still exists                                                                                                                                         |

Precedence, in force before the first reference is read: **explicit user direction > the project's design system and existing UI > conventions already in the project > this skill's patterns.** A mandatory brand palette or type system is recorded in Phase 0; exploration then varies only atmosphere, art, material, and composition.

## The four rules

1. **Diverge in image, converge in code.** Images are the design step, not an optional asset: the look is chosen from mockups before any app code, component, or stylesheet exists. That the whole screen could be drawn in CSS or SVG is not a reason to skip them. Images are never later decoration: textures or photo fills offered after the build do not count as exploration, because by then code has already fixed the direction. Never ask code to invent the look.
2. **Function is fixed, form is free.** Layout, content, and functions are locked in Phase 0 and do not change during exploration. A reference lends identity only: palette, light, texture, material, shape, atmosphere. A mockup that drops a function from the brief fails, however good it looks.
3. **Art is art, interface is interface.** Art (illustration, background plate, texture, loop) is a generated asset, cut from the approved comp. Interface (text, controls, data) is real components. No text is baked into art, and no complex art is rebuilt in CSS. Image generation produces full-screen comps first and art plates second; filling placeholder slots in a layout already built in code is neither.
4. **The author does not grade their own work.** Approval needs a blind score from a fresh agent that sees only the brief, the image, the rubric, the control plate, and the layout lock, plus an explicit choice by the user. A host without subagents runs a timeboxed adversarial self-pass and labels the score weaker.

Also binding in every phase: every generated file records its prompt, model, and references; references lend attributes, never an identifiable character, logo, or artwork, and their origin goes in `refs/SOURCES.md`; show the user every generation, the bad ones included, and say what could not be built faithfully; a bold look still owes contrast, visible focus, real text, and a reduced-motion alternative.

## Modes and the cost gate

Detect the mode in Phase 0 and record it in `STATUS.md`. Details: [`references/modes-and-models.md`](references/modes-and-models.md).

- **Automatic.** An image-model key is in the environment (`GEMINI_API_KEY` or `OPENAI_API_KEY` for `python3 scripts/generate.py`, or the project's own SDK). The script has no default model: pass `--model` or set `IMAGE_MODEL` with an ID confirmed in the provider's docs.
- **Native.** The host agent generates or edits images itself. No script; provenance is still recorded beside each image.
- **Assisted.** Nothing can generate here. Prepare the prompt file, the reference files, and the layout image, then tell the user which files to attach, in which order, and where to save each result. Stop and wait for the files.

**Cost gate.** Batches are two to four images. Ask the user before any round of more than four images, before any video, and before any retry loop, and state the count. Generation is paid in automatic and native mode; in assisted mode the cost is the user's time and quota, and the gate applies the same way.

Helper scripts need Python 3.10 or newer and Pillow; other dependencies are optional and named when missing. `scripts/` is this skill's own folder, not the project's: put the skill folder's path in front of each command (`python3 <skill folder>/scripts/board.py ...`). In commands, a file argument that starts with `design/` or `$P/` (the pack folder) is written from the project root; any other file argument is relative to the pack folder, so run those from inside it.

| Script                         | Use                                                                            | Optional dependency |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------- |
| `python3 scripts/wireframe.py` | `wire.json` to a gray labeled wireframe (Phase 0)                              | none                |
| `python3 scripts/board.py`     | one labeled contact sheet of a round (Phases 2–3)                              | none                |
| `python3 scripts/palette.py`   | color roles, contrast ratios, `tokens.json` and `.css` (Phases 1, 5)           | none                |
| `python3 scripts/compare.py`   | mockup versus screenshot, per-tile scores and worst tiles (Phase 7)            | numpy (SSIM)        |
| `python3 scripts/frames.py`    | keyframes and a contact sheet from a clip (Phase 4)                            | ffmpeg and ffprobe  |
| `python3 scripts/generate.py`  | images from a prompt and reference images, with a sidecar `.json` (Phases 2–3) | the provider SDK    |

**Checks on a render** (type samples, skeletons, build captures; the skill ships no capture script, and every report names the method used). Capture with the project's Playwright when it has one; otherwise serve the page (the project's dev server, or `python3 -m http.server` in a folder holding a static copy) and take a headless Chrome or Chromium screenshot with `--headless --screenshot --window-size`. Contrast on rendered pixels: crop the text with the background right behind it from the capture, run `python3 scripts/palette.py <crop>`, and read `contrast`. Accessibility scan: axe through the project's test runner when it has one, else the browser's built-in audit, else a manual checklist. Performance (LCP, CLS, INP, scroll): the browser's performance panel or the project's existing perf tooling; no tool is mandated.

## The pack folder

Every run keeps its artifacts in `design/<slug>/` unless the project already has a convention.

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

`STATUS.md` has exactly five lines. Rewrite it at the end of every phase and at every hand-off; a new session reads it before anything else.

```
Phase: <n - name>
Mode: automatic | native | assisted
Approved: <path or none>
Next step: <one line that names the file to attach or to save back, as a path from the project root>
Open decisions: <list or none>
```

## Phase 0 — Brief and layout lock

**MANDATORY — READ ENTIRE FILE**: [`references/brief-and-layout.md`](references/brief-and-layout.md).

**MANDATORY — READ ENTIRE FILE**: [`references/modes-and-models.md`](references/modes-and-models.md).

Read [`references/reskin.md`](references/reskin.md) entire when the route is a reskin of a running app.

**Do NOT load** [`references/mockup-prompting.md`](references/mockup-prompting.md), and do not write an image prompt, until `brief.md` and the layout lock exist. A style line inside a prompt is not a brief.

When the request carries no sign that the look is the point (distinctive or not generic, reference images, art direction, a reskin), offer this workflow in one line and follow the answer. If the user declines image exploration, in answer to that offer or unprompted, say in one line that this workflow does not apply and stop using it. "A first working version is enough", said without that offer, is not a decline.

## Phase 1 — Concept and references

**MANDATORY — READ ENTIRE FILE**: [`references/concept-and-dna.md`](references/concept-and-dna.md).

Brand adjectives are not a direction. Write one concept line and source references outside UI before any mockup. Agree on the concept with the user, or run the concepts as rivals on the round-1 axis and let the board decide.

**Do NOT load** [`references/converge.md`](references/converge.md) yet.

## Phase 2 — Explore

**MANDATORY — READ ENTIRE FILE**: [`references/mockup-prompting.md`](references/mockup-prompting.md).

**MANDATORY — READ ENTIRE FILE**: [`anti-patterns/generic-ai-look.md`](anti-patterns/generic-ai-look.md) before the first round is shown.

Round 1 contains, in order: the control plate and two or three candidates that differ on one declared axis (four images at most, the control included), then a board from `python3 scripts/board.py`. For a site, round 1 explores the first viewport; once the user picks a direction, the storyboard (one frame per remaining scroll section) is a later round whose image count is stated and confirmed first. Then hand off: show the board, update `STATUS.md`, and wait for the user.

Do not write app code, components, or stylesheets before Phase 3 records `mockups/APPROVED.*`.

**Do NOT load** [`references/build-spec.md`](references/build-spec.md) or [`references/implementation.md`](references/implementation.md) during exploration.

## Phase 3 — Converge

**MANDATORY — READ ENTIRE FILE**: [`references/converge.md`](references/converge.md).

One change per round, edited from the best version, logged in `lineage.md`. Approval needs all five rubric scores at 4 or higher from the blind critic (who sees the control plate and the layout lock beside each candidate) and the user's explicit choice. About five rounds without gain sends the run back to Phase 1. This phase also makes the state sheet from the leading direction before the lock and the mobile pass after it, each with its image count confirmed; a site locks the hero and every storyboard frame. The comp-in-hand route records the lock and skips the score.

## Phase 4 — Motion (optional)

Read [`references/motion.md`](references/motion.md) entire when the approved design has atmosphere that should move or a section transition to discover. Any video passes the cost gate first.

**Do NOT load** `references/motion.md` unless Phase 4 is in play.

## Phase 5 — Spec

**MANDATORY — READ ENTIRE FILE**: [`references/build-spec.md`](references/build-spec.md).

Start the tokens from the lock with `python3 scripts/palette.py mockups/APPROVED.<ext> --out spec/tokens.json` (the lock's real extension), then correct the roles by hand and check contrast. Every visual element that is not an interface component gets a buildability triage entry before Phase 6.

**Do NOT load** [`references/implementation.md`](references/implementation.md) until `spec/` is complete.

## Phase 6 — Build

**MANDATORY — READ ENTIRE FILE**: [`references/implementation.md`](references/implementation.md).

Build in layers (art, interface, motion), with the project's components and real data. Mobile and states are derived from the lock, never improvised. Another design skill installed in the project may raise build quality; the lock still decides the look.

**Do NOT load** [`references/reskin.md`](references/reskin.md) for a new screen. On a reskin it stays in force: logic untouched, markup changes only for accessibility or the art slot, ids kept.

## Phase 7 — Verify and lock

**MANDATORY — READ ENTIRE FILE**: [`references/fidelity-and-lock.md`](references/fidelity-and-lock.md).

**MANDATORY — READ ENTIRE FILE**: [`anti-patterns/process.md`](anti-patterns/process.md) before the final hand-off.

Capture deterministically at the brief's target viewport, then run `python3 scripts/compare.py mockups/APPROVED.<ext> qa/screenshot-01.png --out qa/compare-01.png --report qa/compare-01.json`; a site runs one compare per section against that section's lock file. Tile scores are advisory: fix by impact (layout, color and light, type, detail) and register intentional differences. The delivery checklist closes that file.

## When the work is going wrong

| Thought                                                            | Reality                                                                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| "I can draw all of this in CSS and SVG, so images are optional."   | Write `brief.md` and the layout lock, then run Phase 2. If the user declined images, say the workflow does not apply instead of skipping it.    |
| "A first working version is enough, so I will build it first."     | Stop at the Phase 2 hand-off with a board and an updated `STATUS.md`. No app code before `mockups/APPROVED.*` exists.                           |
| "The direction already lives in my code, so a brief is redundant." | Write `brief.md` and lock the layout before the first prompt; existing code becomes a skeleton render. A style line in a prompt is not a brief. |
| "My own review will catch the template defaults."                  | Generate the control plate, run the distance check from `anti-patterns/generic-ai-look.md`, and have a fresh agent score blind.                 |
| "Images can add texture once the build is done."                   | Treat the built screen as the layout reference and run Phases 1–3 on it. Textures come only as Phase 5 art plates cut from the approved comp.   |

Before any hand-off, and whenever a phase is being skipped, read [`anti-patterns/process.md`](anti-patterns/process.md) entire.

## References

| File                                      | Load when                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `references/brief-and-layout.md`          | Phase 0, every route                                                              |
| `references/modes-and-models.md`          | Phase 0; choosing a model; any cost question                                      |
| `references/concept-and-dna.md`           | Phase 1                                                                           |
| `references/mockup-prompting.md`          | Phase 2, and every later prompt (edits, state sheet, art plates, mobile pass)     |
| `references/converge.md`                  | Phase 3                                                                           |
| `references/motion.md`                    | Phase 4 only                                                                      |
| `references/build-spec.md`                | Phase 5, and the comp-in-hand route                                               |
| `references/implementation.md`            | Phase 6, and the build-from-a-pack route                                          |
| `references/fidelity-and-lock.md`         | Phase 7                                                                           |
| `references/reskin.md`                    | Reskin route, from Phase 0 through Phase 7                                        |
| `anti-patterns/generic-ai-look.md`        | Before the first round is shown; any "does this look generic" call                |
| `anti-patterns/process.md`                | Before any hand-off; when a phase is being skipped                                |
| `examples/brief.md`, `examples/wire.json` | Phase 0, to see a finished brief with its region table and the matching wireframe |
| `examples/dna-card.md`                    | Phase 1, to see a filled DNA card                                                 |
| `examples/storyboard.md`                  | Phase 2, for a site                                                               |
| `examples/lineage.md`                     | Phase 3, to see rounds, scores, and the lock line                                 |
| `examples/motion-spec.md`                 | Phase 4                                                                           |

The examples are fictional: an observability dashboard and a landing page.
