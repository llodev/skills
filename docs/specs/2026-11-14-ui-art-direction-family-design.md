# ui family — first member `ui-art-direction`

Date: 2026-11-14. Status: draft for maintainer approval, after one independent read that raised three questions (answered in sections 11, 12, and 14). The maintainer chose the family shape (one complete member now, deeper members later, a family study in `docs/studies/ui/`). The name `ui` / `ui-art-direction` is the author's proposal and has not been objected to; it is listed under Decisions so it can be changed before the build starts.

## 1. Goal

Turn the untracked study `skills/image-first-ui-design/SKILL.md` (one Portuguese file, 577 lines, with a `forge.py` embedded in the text) into a packaged Agent Skill under a new `ui-` family. The first member is `ui-art-direction`. It stays a knowledge skill with bundled helper scripts: no MCP, no init CLI, no runtime `dist`.

The skill carries one paradigm: **art-direct a UI in image and video models first, then build it in code and verify the build against the approved image.** A coding agent asked for "a beautiful site" produces the layout it already knows how to implement. This skill moves the creative exploration out of code, where an image model is free, and converts the approved result into a faithful, functional build.

Success looks like this:

1. An agent asked for a distinctive screen, dashboard, or site follows a fixed workflow, and each phase leaves a file a human can inspect.
2. The result is visibly further from the generic AI look than the same request without the skill. This is measured, not assumed (section 12).
3. The shipped build is functional (real components, real data, accessible, responsive) and its fidelity to the approved mockup is reported with evidence.
4. The work resumes cleanly in a later session from files alone.

## 2. Why now, and what the research changed

The study was written from creative ideas, then reviewed against the repository conventions and against public material (DESIGN.md, AI-slop write-ups, first/last-frame video APIs, design-to-code fidelity papers and tools). The public material is mostly vendor blogs and practitioner opinion, and no published pipeline matches this one end to end. Items marked _(hypothesis)_ below are the author's judgment, not established practice, and the skill must not present them as proven.

What the research added to the study:

| Gap in the study                                                     | Addition                                                                                                                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A site is not one screen                                             | Scroll **storyboard** (one frame per section) and start/end frames for transition clips                                                |
| Image models invent UI and bake text into pictures                   | Hard split between the **art plate** (no UI, no text) and the interface; text never lives in art                                       |
| Layout lock was hand-drawn boxes only                                | Add a **skeleton render** of the real app (styles neutralized) as the layout reference when the app exists                             |
| The author grades their own mockups                                  | **Blind critic**: a fresh agent scores from the brief, the image, and the rubric only                                                  |
| "Originality" had no yardstick _(hypothesis)_                        | One bare-prompt **control plate** per exploration, shown next to the candidates                                                        |
| Whole-image pixel similarity is a weak signal                        | **Tile-based fidelity**: per-tile score as the gate, a vision model as advisor, deterministic screenshots                              |
| Mobile and states were left to the builder                           | Mobile derived in a **separate pass** from the approved desktop; a **state sheet** (empty, loading, error, hover, focus)               |
| Approval ended at the image                                          | The approved mockup becomes a **design lock**: visual-regression baseline plus a fidelity report                                       |
| The spec format was ad hoc                                           | Token output that maps to **DESIGN.md** (Google Stitch's open format, alpha). The mapping is written against the current spec, see 8.4 |
| No catalog of what "generic" looks like                              | An **anti-pattern file** for the generic AI look in images and in code, including the tells that change over time                      |
| No way to resume                                                     | A `STATUS.md` baton in the pack folder: phase, approved file, next step, open decisions                                                |
| `forge.py` hard-coded model IDs while the text said never to do that | Scripts take the model from `--model` or `IMAGE_MODEL`; the skill never names a current model ID                                       |

## 3. Family

| Folder                    | npm package                | Kind                                              |
| ------------------------- | -------------------------- | ------------------------------------------------- |
| `skills/ui-art-direction` | `@llodev/ui-art-direction` | guide with helper scripts (the full pipeline)     |
| `packages/ui`             | `@llodev/ui`               | meta-package, npm only, not a marketplace plugin  |
| `docs/studies/ui/`        | —                          | family study for the planned members (section 10) |

One member opens the family. The first member covers the whole pipeline with one reference file per phase. Later members each deepen one phase (section 10) and install through the same meta-package. This release does not add them.

Family rule, taken from the `arc` study: when a later member ships, the matching section of `ui-art-direction` shrinks to the default plus a one-line pointer. Two copies of the same guidance are a defect.

## 4. Scope

**In scope.** Web UI: screens, dashboards, marketing and product sites, in any web stack the project already uses. New designs, restyling an existing app, and building from a comp the user already has.

**Non-goals.**

- Charts, KPI cards, and chart storytelling. That is `bi-dashboard`. `ui-art-direction` decides identity and atmosphere around a dashboard and never the chart title, form, or highlight.
- Wireframing as UX research, user research, information-architecture work.
- Native mobile builds. Phases 0–5 work for a native design, but the build recipes are web-only in this release.
- Logo, brand identity, and illustration as a product. The skill uses generated art as a layer of a UI.
- Choosing or recommending a specific image or video model by name. Model IDs change faster than releases.
- Running paid generation without the user's confirmation (section 5.3).
- Replacing `frontend-design`, `impeccable`, or `ui-ux-pro-max`. Those direct design in code. This skill is the image-first alternative and may defer to any of them for build quality in Phase 6. It depends on none.

**Anti-goals** (a failure even if the run technically completes):

- A pretty image that is not buildable, or a build that silently dropped functions from the brief.
- Mockups whose layout drifted from the locked layout.
- Generated art or text that reproduces an identifiable character, logo, or artwork.
- Spending money on generation nobody confirmed.
- A "fidelity" claim backed only by a pixel-similarity number.

## 5. The paradigm

### 5.1 The four rules

1. **Diverge in image, converge in code.** Explore many cheap visual directions as images, choose one, bring it to life as video if motion matters, and only then write code. Never ask code to invent the look.
2. **Function is fixed, form is free.** The layout, content, and functions are locked in Phase 0 and do not change during exploration. A reference lends identity only: palette, light, texture, material, shape, atmosphere.
3. **Art is art, interface is interface.** Art (illustration, background, texture) is a generated asset. Interface (text, controls, data) is real components. No text is baked into art, and no complex art is rebuilt in CSS.
4. **The author does not grade their own work.** Approval needs a blind score (Phase 3) and an explicit user choice.

### 5.2 Workflow

Phases run in order. A route (5.4) may start later or stop earlier.

| Phase                     | Output                                                                   | Read                                                               |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 0. Brief and layout lock  | `brief.md`, `layout/` (wireframe or skeleton render), mode chosen        | `references/brief-and-layout.md`, `references/modes-and-models.md` |
| 1. Concept and references | one-sentence concept line, `refs/` with sources, `dna.md`                | `references/concept-and-dna.md`                                    |
| 2. Explore                | `mockups/v1/` with a control plate, a board, scroll storyboard for sites | `references/mockup-prompting.md`                                   |
| 3. Converge               | `lineage.md`, blind scores, `mockups/APPROVED.*` (the design lock)       | `references/converge.md`                                           |
| 4. Motion (optional)      | `video/`, keyframes, draft `motion.md`                                   | `references/motion.md`                                             |
| 5. Spec                   | `spec/` (tokens, components, assets, motion, buildability triage)        | `references/build-spec.md`                                         |
| 6. Build                  | code in the project's stack, mobile and states derived                   | `references/implementation.md`                                     |
| 7. Verify and lock        | `qa/` fidelity report, baseline screenshots, a11y and perf checks        | `references/fidelity-and-lock.md`                                  |

`SKILL.md` keeps the phase table, the four rules, mode detection, routes, the cost gate, the `MANDATORY — READ ENTIRE FILE` and `Do NOT load` directives, and the references table. Everything else lives in references. Target length for `SKILL.md`: about 200 lines, the size of `bi-dashboard`.

### 5.3 Modes and the cost gate

Detected in Phase 0 and recorded in `STATUS.md`:

- **Automatic.** An image-model key is in the environment, and the helper `generate.py` or the project's own SDK generates images.
- **Native.** The host agent can generate or edit images itself. No script needed. Provenance is still recorded.
- **Assisted.** No generation is available. The agent prepares the prompts, the reference files, and the layout image, and tells the user exactly which file to attach at each step and which file to save back.

Cost gate, in `SKILL.md`: ask before any round of more than four images, before any video, and before any retry loop. Batches are two to four images. This is a behavior rule, so it is stated once in `SKILL.md` and enforced by the pressure scenarios (section 12).

### 5.4 Routes

| Route                  | Start                                       | Notes                                                                                              |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| New screen or site     | Phase 0 → 7                                 | Site: Phase 2 produces a storyboard, not one image                                                 |
| Concept only           | Phase 0 → 3                                 | Stops at the design lock; the user takes the pack elsewhere                                        |
| Reskin an existing app | Phase 0, `references/reskin.md`, then 1 → 7 | The screenshot of the running app is the layout reference; information architecture is frozen      |
| Comp in hand           | Phase 5 (abbreviated Phase 0)               | The user already has an approved image or export; the blind score is skipped, the lock is recorded |
| Build from a pack      | Phase 6                                     | A complete `design/<slug>/` exists                                                                 |
| Motion only            | Phase 4                                     | An approved still exists                                                                           |

### 5.5 The pack folder

Every run keeps its artifacts in `design/<slug>/` unless the project already has a convention. The structure is the study's, plus `STATUS.md`, the control plate, the storyboard, and the state sheet:

```
design/<slug>/
  STATUS.md           phase, mode, approved file, next step, open decisions
  brief.md            Phase 0
  layout/             wire.json, wire.png or skeleton.png
  refs/               originals; SOURCES.md records origin and license
  dna.md              Phase 1
  prompts/            every prompt used, versioned
  mockups/v1 … vN/    images, each with a sidecar .json (model, refs, prompt, date)
  mockups/APPROVED.*  the design lock
  lineage.md          what changed per version, why, scores
  video/              Phase 4
  spec/               tokens.json, tokens.css, components.md, assets.md, motion.md
  qa/                 screenshots, tile reports, baseline
```

## 6. Package layout

```
skills/ui-art-direction/
  SKILL.md
  README.md
  LICENSE
  CHANGELOG.md
  package.json
  docs/i18n/README.pt-BR.md
  docs/i18n/README.es-ES.md
  anti-patterns/
    generic-ai-look.md
    process.md
  references/
    brief-and-layout.md
    modes-and-models.md
    concept-and-dna.md
    mockup-prompting.md
    converge.md
    motion.md
    build-spec.md
    implementation.md
    fidelity-and-lock.md
    reskin.md
  examples/
    brief.md
    dna-card.md
    lineage.md
    motion-spec.md
    storyboard.md
    wire.json
  scripts/
    wireframe.py
    board.py
    palette.py
    compare.py
    frames.py
    generate.py
  tests/                (not published)
packages/ui/
  README.md  LICENSE  CHANGELOG.md  package.json
docs/studies/ui/
  README.md  ui-fidelity.md  ui-motion.md  ui-reskin.md  ui-assets.md
  i18n/origin.pt-BR.md
```

`package.json` `files`: `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `anti-patterns`, `references`, `examples`, `scripts`, `docs`. `tests` is not listed, so it is not published.

## 7. Content design

All published content is English. Product and tool names stay as they are. Example UI copy inside examples may stay in the product language when the example is about rendering text in a product language, and the file says so.

### 7.1 `SKILL.md`

H1: `# Art direction before code`. Sections: opening paragraph (what the skill is, what it replaces), `## How to use this skill` (phase table), routes, the four rules, modes and the cost gate, one section per phase with the `MANDATORY — READ ENTIRE FILE` and `Do NOT load` lines in the `bi-dashboard` style, the precedence line, the references table.

Precedence, stated before the first read returns: **explicit user direction > the project's design system and existing UI > conventions already in the project > this skill's patterns.** A mandatory brand palette or type system is recorded in Phase 0, and exploration then varies only atmosphere, art, material, and composition.

### 7.2 References

Each file starts with its phase and ends with its exit check. Sizes are targets.

| File                   | Must contain                                                                                                                                                                                                                                                                                                                               | Target lines |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `brief-and-layout.md`  | Project and design-system discovery; the brief contract (purpose, user, real content, functions that cannot disappear, target viewports, acceptance); `wire.json` format and `wireframe.py`; the **skeleton render** recipe (neutralize styles of the running app, capture at the target size); what a layout lock must name               | 90–130       |
| `modes-and-models.md`  | Mode detection; what to look for in an image model (multiple reference images, legible text, edit-from-image) and in a video model (image-to-video, first/last frame); the rule that IDs are confirmed in provider docs and passed by flag or environment; cost gate details; provenance sidecar                                           | 60–90        |
| `concept-and-dna.md`   | The **concept line** (one sentence, e.g. "a dashboard that feels like an observatory"); sourcing references outside UI; negative references; reference budget (one identity reference plus the layout lock, more dilutes); divergence axes (mood, material, light, density) so variants differ on purpose; the DNA card template; IP rules | 90–130       |
| `mockup-prompting.md`  | The prompt contract (layout, identity, content, quality bar); what each reference image is for, stated in the prompt; art plate versus UI composite; the control plate; scroll storyboard for sites; the state sheet; the mobile pass; verification before showing an image                                                                | 100–140      |
| `converge.md`          | One change per round; edit from the best version; recombination; the five-criterion rubric (identity, layout fidelity, legibility, buildability, originality; all at least 4); the **blind-critic brief**; `lineage.md` format; stop rules (rubric passes, or about five rounds without gain, then back to Phase 1); the design lock       | 70–100       |
| `motion.md`            | Image-to-video prompt contract (locked camera, UI static, motion only in named layers); start/end frames for transitions; keyframe extraction with `frames.py`; reading a clip into a motion spec (what moves, speed, rhythm, what must stay still); micro-interactions the clip cannot show; reduced motion; motion budget                | 70–100       |
| `build-spec.md`        | Tokens (color roles with contrast checks, type, shape, depth); component inventory with states; the **buildability triage** (every visual element is CSS, SVG, image, video, canvas/WebGL, or 3D, with a cost note); asset pipeline (clean art plate, format, responsive crops with a focal point, no baked text); DESIGN.md mapping (8.4) | 100–140      |
| `implementation.md`    | Layers (art, interface, motion); delegation brief for a coding agent; recipes (frosted glass, luminous hairlines, video background, grain); deriving mobile and states from the lock; real data and real components; accessibility and reduced-motion requirements                                                                         | 80–120       |
| `fidelity-and-lock.md` | Deterministic capture (fixed viewport and device scale, fonts loaded, animations disabled, live content masked); the tile compare loop with `compare.py`; ordering fixes by impact (layout, color and light, type, detail); intentional differences register; a11y and performance checks on the real render; visual-regression baseline   | 80–120       |
| `reskin.md`            | Inventory of routes, components, states, functions; the running screenshot as layout reference; the instruction "keep the information architecture, restyle only"; mapping new elements to existing components; theme-level change, not logic rewrite; before/after/mockup comparison                                                      | 50–80        |

### 7.3 Anti-patterns

Two files, numbered entries, each with symptom, cause, and fix, in the format of `arc-decisions/anti-patterns/architecture.md`.

- `generic-ai-look.md`: the catalog of defaults, both as images and as code. Seeded with the practitioner consensus (Inter by default, indigo-to-purple gradients, a centered hero over three rounded cards, glass everywhere, bento grids, emoji as icons, fade-and-slide on every section) and with the tells that the public `frontend-design` guidance lists as current clusters (a cream background with a high-contrast serif and a terracotta accent, near-black with a monospace label face, a trailing arrow on every link). Two framing rules: a default is not forbidden, it is forbidden as an unexamined choice, and a ban list is a moving target, so the file teaches the **distance check** (compare against the control plate and name what is different) before it lists tells. Counter-risk to record: swapping one banned list for another recreates the problem.
- `process.md`: designing in code first; skipping the layout lock; changing several variables in one round; baking text into art; approving without buildability triage; chasing a pixel score; designing desktop only; lorem and gibberish text in mockups; reusing a protected work as an element; hiding the bad generations from the user; running a retry loop on a paid model without asking.

### 7.4 Examples

Short, concrete, text-only. A fictional product, consistently: an observability dashboard with a conversational panel (the study's own example), plus one landing-page storyboard. `brief.md`, `dna-card.md`, `lineage.md` (three rounds with scores and a rejected one), `motion-spec.md`, `storyboard.md`, and `wire.json` (valid input for `wireframe.py`).

## 8. Scripts

### 8.1 Contract

Python 3.10 or newer. Pillow is required by every script that touches images. Everything else is optional and imported lazily, with a clear message when missing. Each script is invoked as `python3 scripts/<name>.py`, has `--help`, prints paths or JSON to stdout, writes human messages to stderr, and exits non-zero on failure. The prose in `SKILL.md` and the references always shows the interpreter, never a bare path. Scripts never print secrets, never read keys from anywhere but the environment, and never contact a network except `generate.py`.

### 8.2 The six scripts

| Script         | Does                                                                                                                                                                                                                                      | Optional dependency                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `wireframe.py` | `wire.json` to a gray labeled wireframe PNG. Port of the study's `wireframe`.                                                                                                                                                             | none                                                                           |
| `board.py`     | Contact sheet of versions with labels. Port of `board`.                                                                                                                                                                                   | none                                                                           |
| `palette.py`   | Dominant colors and suggested roles (background, surface, foreground, muted, accent), contrast ratios, a swatch image, a CSS variables file. Keeps the study's low-confidence note for near-monochrome images.                            | none                                                                           |
| `compare.py`   | Mockup versus screenshot: side by side, difference heat map, a grid of tiles each with a score, the worst tiles cropped for review, a JSON report that states the method used.                                                            | `numpy` for SSIM; without it, per-tile luminance error, and the report says so |
| `frames.py`    | Evenly spaced keyframes and a contact sheet from a video clip, for reading motion.                                                                                                                                                        | `ffmpeg` on the path                                                           |
| `generate.py`  | Image generation from a prompt and reference images, one provider adapter per backend, writes a sidecar `.json` per run. **No default model ID**: `--model` or `IMAGE_MODEL`, otherwise exit with a message that names the provider docs. | provider SDK for the chosen backend                                            |

Notes:

- The study's `forge.py` is the source. It is split into these files, not copied. Behavior of `wireframe`, `board`, and `palette` is preserved; `compare` is redesigned (tiles, not whole-image similarity); `generate` loses its hard-coded defaults.
- `generate.py` is the only script that cannot be tested end to end without a key. Provider adapters are small and injectable so tests run with a fake client.
- `generate.py` ports the study's Gemini and OpenAI adapters. It has no default model ID.
- A video generation script is not included. Video APIs and their parameters change too fast, and the skill gives the prompt contract and the user or host runs the model.

### 8.3 Tests

`skills/ui-art-direction/tests/`, run with `python3 -m unittest discover`. Synthetic images are generated inside the tests, so no fixtures are committed. Required cases: wireframe renders every box and wraps long labels; palette picks a visible accent, flags a monochrome image, and every suggested pair meets the contrast it reports; compare scores identical images at the top, identifies a deliberately altered tile as the worst, and reports its method; board handles mixed aspect ratios; `generate.py` refuses to run without a model and never writes a key into a sidecar; `frames.py` is skipped when `ffmpeg` is absent. The tests are not wired into `pnpm validate` (Decisions, D9).

### 8.4 DESIGN.md mapping

DESIGN.md is Google Labs' open format for design-system context (YAML tokens plus prose rationale), open-sourced under Apache 2.0 and marked alpha. This design was written without reading the current specification. The builder reads the current spec before writing the mapping in `references/build-spec.md`. If it cannot be read, the skill ships `tokens.json` and `tokens.css` only and states that a DESIGN.md export is a follow-up. The mapping never blocks the release.

## 9. Frontmatter

Starting text for the description (the builder may tune it, and must keep the triggers and the exclusions, and keep it inside 200–1200 characters, checked by `validate-frontmatter`):

```yaml
---
name: ui-art-direction
description: >-
  Art-directs a screen, dashboard, or site in image and video models before
  any code exists, then builds it and verifies the build against the approved
  mockup: layout lock, out-of-UI references distilled into a visual DNA,
  concept mockups, blind-critic iteration, motion found with image-to-video, a
  build spec, and a fidelity loop. Use when a UI must not look templated, when
  the user brings reference images or asks for a distinctive, creative, or
  "not generic" design, when restyling an existing app with a new visual
  identity, or when turning an approved comp into a faithful build. Works in
  any web stack and with any image or video model, or with none (prompts for
  the user to run). Triggers include image-first, mockup, moodboard, art
  direction, reskin, redesign, hero, landing page, design to code, and
  fidelity. Do NOT use for charts and KPI cards (bi-dashboard), UX research
  or wireframing, native mobile builds, or logo and brand identity design.
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
```

## 10. Family study: `docs/studies/ui/`

Format and depth follow `docs/studies/arc/`, lighter. Not a skill and not a plan: it fixes responsibilities and seams before any member starts.

- `README.md`: family goal, members table, the **overlap map** (which section of `ui-art-direction` each member deepens and the shrink rule), suggested build order, open questions for the maintainer.
- One file per planned member, at most about 60 lines each: responsibility and non-goals, triggers, core concepts, workflow table, actions and artifacts, the expert judgments to inject.
- `i18n/origin.pt-BR.md`: the original Portuguese study, byte-identical when copied, with the SHA-256 of the raw original recorded in `README.md` (section 11). It sits under `i18n/` because `AGENTS.md` allows localized content only there.

| Planned member | Deepens                                         | Standalone value                                                          |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `ui-fidelity`  | `references/fidelity-and-lock.md`, `compare.py` | Any comp (Figma export, screenshot) to a verified build                   |
| `ui-motion`    | `references/motion.md`, `frames.py`             | Still to clip to motion spec to GSAP, CSS, or Motion code                 |
| `ui-reskin`    | `references/reskin.md`                          | New visual identity for a running app, theme-level, tests green           |
| `ui-assets`    | `references/build-spec.md` asset pipeline       | Art plates to responsive, alpha-aware, optimized assets with focal points |

Suggested build order, study only, not committed: `ui-fidelity`, `ui-motion`, `ui-assets`, `ui-reskin`. Reason: fidelity has the most value outside the paradigm and the least churn; reskin is mostly a route in this release and should wait for field use.

Open questions to record in the study README: the shrink policy (same open question as `arc` question 1); whether `ui-fidelity` should depend on `bi-dashboard` for chart pages; whether the Python scripts get a CI job (D9); whether a video helper belongs in `ui-motion` once an API stabilizes.

## 11. Source study handling

`skills/image-first-ui-design/` is untracked and has no git history. Its description is 170 characters, below the 200 that `validate-frontmatter` requires, so it fails the gate while it sits under `skills/`. It also would stay a second, unpublished copy of the skill.

Decision: after the English skill exists, and before the gates are run, move the study out of `skills/`:

1. Copy `SKILL.md` byte for byte to `docs/studies/ui/i18n/origin.pt-BR.md`. The study is Portuguese, and `i18n/` is where `AGENTS.md` allows localized content.
2. Verify with a checksum that source and copy are identical, and record the SHA-256 of the raw original in `docs/studies/ui/README.md`.
3. Only then remove the folder `skills/image-first-ui-design/`.

Prettier may reflow the copy when it is committed, because the pre-commit hook runs `prettier --write` on staged Markdown. That is accepted: the recorded checksum identifies the raw original, and `.prettierignore` is not edited.

`docs/studies/arc/` was untracked when this design was written. The maintainer has since committed it on its own branch (`arc-family-study`, pull request #126), so it is not in this branch's working tree; read it with `git show arc-family-study:docs/studies/arc/README.md` until that pull request merges. `docs/studies/ui/` is created on this branch and committed only when the maintainer asks; until then it is untracked. Consequences:

- Nothing tracked links to `docs/studies/`: not the roadmap, not the READMEs, not the localized READMEs. A fresh clone in CI has no such folder, so a link from a tracked file would be dead there. The roadmap lists the planned members in a table and names the study by path in plain text.
- Until `docs/studies/ui/` is committed, the moved original has no git history behind it. The checksum and the on-disk copy are the safety net, and the handoff message says so.
- This spec and its plan follow `bi-dashboard` (written to `docs/specs/` and `docs/plans/`) and are committed only when the maintainer asks.

Approving this design approves the move. Do not touch `docs/studies/arc/`.

## 12. Verification of the skill itself

A skill that shapes agent behavior is tested before it ships. The `skill-judge` score checks structure, not behavior. The check is bounded on purpose: one baseline, one build, one fix round, then the remaining gaps are recorded and the release goes ahead. It is a release step, not an open-ended loop.

**What is verified, and what is not.** The behavioral runs cover Phases 0–2 and the first hand-off to the user, where the discipline failures happen: layout lock before images, the prompt contract, one change per round, the storyboard for sites, the baton, the cost gate, and not writing code while waiting for images. Phases 3–7 are verified by the script tests (8.3) and by a fresh agent reading each reference and saying whether it could execute the phase from that file alone. Their behavior, including the separation of the blind critic and the final fidelity report, is unverified until first real use. That limit is stated in the changeset summary and in the README.

**Scenarios.** Three, each run in assisted mode by a subagent that follows a persona sheet written by the harness:

1. New screen: "Build a distinctive operations dashboard for a logistics company."
2. New site: "Landing page for a niche hardware product, it must not look like a template."
3. Reskin: a tiny static app fixture, built in a scratch directory and never published, and "give it a new visual identity without breaking anything."

**Persona.** The sheet answers in advance: the request, a one-line brand direction for scenario 3, yes to a first round of up to four images, no to any video. A run ends when the agent first asks the user to generate or attach images. The harness supplies no images.

**Order.**

1. Baseline: the three prompts without the skill, one run each. Record behavior verbatim in the results table of the implementation plan.
2. Write the skill. Section 7.2 is the floor for structure: the files, the phase contract, the four rules, the routes, and the scripts are not trimmed. Inside a reference, content may be cut only where the baseline already satisfied the matching predicate and the content does not define the paradigm.
3. With the skill: the same three runs.
4. At most one fix round, on the wording behind a failed predicate, then a re-run of the failing scenarios only.
5. Predicates still failing are recorded as known gaps and do not block the release.

**Pass predicates** (observable, evaluated at the hand-off):

- `brief.md` and a layout lock exist before the first image prompt is written.
- Every image prompt names the role of each reference image and lists the layout regions.
- The first round changes one declared variable and says which, and it asks for two to four images.
- The agent states how many images it asks the user to generate, and asks before any video. In assisted mode the cost is the user's time and quota, so the gate still applies.
- The agent writes no application code and waits at the hand-off.
- Each step names the file to attach and the file to save back, and `STATUS.md` records phase, mode, and next step.
- A site run produces a storyboard, not one image.
- A control-plate prompt is among the first prompts.

**Micro-tests.** The wording of two shaping rules, the cost gate and the blind-critic brief, is tested with one fresh single-shot call per repetition, at least five repetitions each, against a no-guidance control. Every flagged match is read by hand. One round, same stop rule.

**Evidence.** Raw transcripts stay in the scratch directory and are neither committed nor published. The results table (scenario, predicate, baseline, with skill) and the known gaps go in the implementation plan under `docs/plans/`.

## 13. Packaging and wiring

Same mold as `bi-dashboard` and `arc-decisions`.

- `package.json` for the skill: `@llodev/ui-art-direction`, version `0.0.0`, MIT, `type` `module`, `engines.node` `>=24`, `publishConfig.access` `public`, `files` as in section 6, repository and homepage like the siblings. Description and README quote: `Art-direct a UI in image models first, then build it in code and verify it against the mockup.`
- Meta-package `packages/ui`: copy of `packages/bi` with `@llodev/ui`, `peerDependencies` pinning `@llodev/ui-art-direction` at `^0.1.0` even while the branch says `0.0.0` (a `^0.0.0` range would not contain `0.1.0` and would force a major on the meta), `devDependencies` `workspace:*`, `files: ["README.md"]`, description `Meta-package: installs the @llodev/ui-* family (image-first UI design).`
- `README.md` and the two i18n READMEs per the sibling mold (language selector block, install, use, contents table, license). The contents table lists `scripts/` and the Python and Pillow requirement.
- `.claude-plugin/marketplace.json`: one plugin, `category: ai-tools`, `source.git-subdir`, `path: skills/ui-art-direction`, `version: 0.0.0`, `author.name: llodev`, same description and keywords as `package.json`. `metadata.version` of the marketplace stays `1.12.0`. No marketplace entry for the meta-package.
- Root `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`: a catalog section for `@llodev/ui`, the repository-layout tree (`ui-art-direction/` after `bi-dashboard/`, `ui/` after `bi/` under packages), and the sentence that names family prefixes (gains `ui-`). All three files.
- `docs/roadmap.md`: the opening sentence that lists the families gains `ui-*`, and §9 gains a `ui-*` subsection after `arc-*`, with the shipped member and the planned members table (priority from section 10). It links to nothing under `docs/studies/` (section 11).
- `scripts/snapshots/skill-judge-baseline.json` and `scripts/snapshots/skill-judge-golden.json`: one new key `skills/ui-art-direction/SKILL.md`. Record the real score. If it is under 70, fix only missing triggers or broken structure, then re-score once. Do not use `SKIP_SKILL_JUDGE_GATE`.
- `pnpm-lock.yaml`: the new workspace packages' hunk only. No unrelated drift.
- One changeset, both packages, `minor`.
- No entry in `skills-lock.json` or `tarball-snapshot.json` (pm-tasks-scoped), no `.size-limit` entry, no canary trusted publisher, no change to `AGENTS.md`, no change to any other skill, no edit to `.prettierignore`.

Gates this must pass: `validate-frontmatter` (kebab-case name, description 200–1200), `published-content-lint` (no `CLAUDE.md`, `AGENTS.md`, `docs/specs`, `docs/roadmap`, `this repo`, `our repo`, `apps/api/src`, `apps/web/src` in any published `.md`, `.json`, `.yml`, or `.txt`; the lint does not read `.py`, but the scripts follow the same rule), `marketplace-parity` (plugin `0.0.0` equals package `0.0.0`), the `skill-judge` ratchet, `make validate`, `make pre-release`.

## 14. Decisions

Calls made by the author, open to change before the build starts. D1–D4 shape the result; the rest are mechanical.

| #   | Decision                                                                                                                                                                           | Reason                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Family `ui`, member `ui-art-direction`, meta `@llodev/ui`. "Image-first" stays in tags, description, and README as the paradigm name.                                              | Short prefix like `bi-` and `arc-`; "art direction" names the role split: the agent directs image models, code is production.                                              |
| D2  | One complete member now; later members deepen one phase each.                                                                                                                      | Maintainer's choice (option A). Same shape as `arc-decisions`.                                                                                                             |
| D3  | Scripts are Python with Pillow, not Node.                                                                                                                                          | Node has no built-in decoding for JPEG or WebP, and the study already needs Pillow-level image work. A Node version would add `sharp` to every consumer.                   |
| D4  | Eight phases (0–7) plus six routes, replacing the study's A0–A7 "actions".                                                                                                         | Matches the repository's phase tables and `MANDATORY` read gates. Routes keep the study's "each action can be used alone".                                                 |
| D5  | `STATUS.md` baton in the pack folder.                                                                                                                                              | Image work spans sessions. Taken from the baton idea in the installed `stitch-loop` skill.                                                                                 |
| D6  | One bare-prompt control plate per exploration.                                                                                                                                     | Makes "originality" visible instead of self-reported. _(hypothesis; the pressure scenarios will show whether it earns its cost.)_                                          |
| D7  | Blind critic as a separate agent when the host has subagents; a timeboxed adversarial self-pass when it does not, labeled as weaker.                                               | The author grading their own mockups is the study's weakest point.                                                                                                         |
| D8  | No model IDs anywhere in published content.                                                                                                                                        | They change faster than releases. The study contradicted itself here.                                                                                                      |
| D9  | Python tests live in `skills/ui-art-direction/tests/`, run by hand, not wired into `pnpm validate` or CI.                                                                          | CI today is Node-only. Wiring Python is a repository decision and is listed as an open question.                                                                           |
| D10 | Source study moved to `docs/studies/ui/i18n/origin.pt-BR.md`, checksum recorded, folder removed after a verified byte-identical copy (section 11).                                 | Untracked, no history, fails `validate-frontmatter` under `skills/`. The `i18n/` path satisfies the language rule in `AGENTS.md`.                                          |
| D11 | Web only in this release.                                                                                                                                                          | Build recipes (CSS, canvas, video) are web.                                                                                                                                |
| D12 | Work on branch `ui-art-direction-v0.1.0` cut from `main`, separate from the `arc-family-study` branch. No commit, push, pull request, or `npm publish` unless the maintainer asks. | Branch rule for non-pm-tasks skills (`<skill>-vX.Y.Z`, as `bi-dashboard-v0.1.0`). Agent rule: commit only on request.                                                      |
| D13 | Family study is README, four short member studies, and the original study under `i18n/`.                                                                                           | Enough to fix the seams; lighter than the `arc` study.                                                                                                                     |
| D14 | Behavioral verification is bounded: Phases 0–2 and the first hand-off, one baseline, one build, one fix round, remaining gaps recorded, release goes ahead (section 12).           | Each fix loop costs more than the information it adds. Later phases are covered by script tests, a read-through, and first real use, and the README says so.               |
| D15 | `docs/studies/ui/` is committed with the UI branch only when the maintainer asks, and nothing tracked links to it.                                                                 | The `arc` study went through its own pull request (#126). A fresh clone in CI has no such folder until it is committed, so a link from a tracked file would be dead there. |

## 15. Left to the builder

Exact wording of every reference and anti-pattern; prompt templates; the example product's content; the per-script CLI flags beyond the contract in 8.1; the tile grid default and thresholds in `compare.py` (advisory, never a hard gate in the prose); how the DESIGN.md mapping reads once the current spec is read; which anti-pattern entries to cut if a file runs long; the README and i18n copy.

## 16. Release

One changeset, both packages, `minor`. After merge, `release.yml` moves `0.0.0` to `0.1.0`. `@llodev/ui-art-direction` and `@llodev/ui` have never been published, so the first version must be published from the maintainer's machine, and the trusted publisher attached afterwards, per the first-publish rule in `AGENTS.md`. This work does not run `npm publish`. At handoff it prints the commands from `AGENTS.md` for both packages and waits. It stops at a branch that passes `make validate` and `make pre-release`.

`changeset version` needs a GitHub token that can read `llodev/skills`. If the repo `.env` token returns 401, rerun with `GITHUB_TOKEN="$(gh auth token)"`. Do not modify `.env` and do not print the token. The peer warning `0.0.0` versus `^0.1.0` during that dry run is expected.
