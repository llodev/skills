# ui-motion — design study

Status: sketch, 2026-11-14. Not a skill. Decides structure and seams only.

## 1. Responsibility and non-goals

Finds how an approved still should move, then turns that into code: an image-to-video exploration with the interface held still, keyframes read from the clip, a motion spec (what moves, speed, rhythm, what must stay still), micro-interactions the clip cannot show, and an implementation in CSS, GSAP, or Motion with reduced-motion and a motion budget. Deepens `references/motion.md` and `scripts/frames.py` of `ui-art-direction`.

Non-goals (refuses):

- Running a paid video generation without the user's confirmation, or naming a current model ID. The user or host runs the model; the skill writes the prompt contract.
- Video as a product (ads, explainers, edited films), and motion graphics outside a UI.
- Chart animation semantics, such as what a transition between two chart states means (`bi-dashboard`).
- Designing the still. A still is approved first (`ui-art-direction` Phases 0–3, or a comp in hand).
- Delivering the clip itself as an optimized background asset (`ui-assets`).

## 2. Triggers

1. "Make this landing page hero feel alive, but keep the text readable."
2. "How should this dashboard move? I have the approved mockup."
3. "Turn this reference clip into real CSS and GSAP animations."
4. "Design the transition between the list view and the detail view."
5. "Our animations feel random. Give us a motion system."

## 3. Core concepts

- **Locked camera, static UI:** the clip may move only named art layers. If the model deforms text or controls, that part is discarded and only the art motion is kept.
- **Start and end frames:** a transition is generated between two approved stills, not invented from one.
- **Clip as evidence, not as spec:** keyframes are read into numbers (durations, easing, loop length, stagger) before any code.
- **Motion layers:** ambient (loops in the art), feedback (hover, focus, press), narrative (scroll and route transitions). Each has its own budget.
- **Motion budget:** how many things may move at once on a screen, and the cost ceiling (main-thread time, GPU layers).
- **Reduced motion as a design, not a switch-off:** a static or cross-fade alternative is specified for each moving element.

## 4. Workflow

| #   | Input                               | Action                                                                                             | Output               |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Approved still, brief               | Name the layers that may move and the ones that must stay still; set the motion budget             | Motion intent        |
| 2   | Motion intent                       | Write the image-to-video prompt (locked camera, UI static, motion only in named layers); cost gate | Prompt in `prompts/` |
| 3   | Prompt, still (or start/end frames) | User or host runs the model; review clips for UI deformation                                       | `video/` candidates  |
| 4   | Chosen clip                         | `python3 scripts/frames.py VIDEO --out-dir DIR --count 8`; read timing from the contact sheet      | Keyframes, sheet     |
| 5   | Keyframes, clip                     | Write the motion spec: element, property, duration, easing, loop, trigger, reduced-motion form     | `spec/motion.md`     |
| 6   | Spec, component inventory           | Add micro-interactions (hover, focus, press, enter, exit) the clip cannot show                     | Completed spec       |
| 7   | Spec, project stack                 | Choose CSS, GSAP, or Motion per element; implement with tokens for durations and easing            | Motion code          |
| 8   | Running build                       | Check the budget, reduced-motion behavior, and paused state when the tab is hidden                 | Motion QA notes      |

## 5. Actions and artifacts

- **Prompt contract** per clip, versioned in `prompts/`, with a provenance sidecar; a **keyframe sheet** from `frames.py` beside each reviewed clip.
- **Motion spec** (`spec/motion.md`): element, property, duration, easing, delay or stagger, loop, trigger, reduced-motion alternative.
- **Motion tokens:** named durations and easings, shared by CSS and the animation library. **Motion QA notes:** budget, reduced-motion, and performance checks.

## 6. Expert judgments to inject

- **Motion follows meaning.** Heuristic: if a movement does not explain a change, show feedback, or set atmosphere in the art layer, cut it.
- **Interface text never animates from the clip.** UI enters and responds through code; only the art layer borrows the clip's motion.
- **CSS first, a library when there is choreography** (sequencing, scroll-linked timelines, interruptible springs). Exception: the project already standardizes on one library.
- **Animate transform and opacity;** treat layout-property animation as a performance defect unless measured.
- **Ambient loops are slow and few.** Heuristic: one ambient loop per screen, long enough that its repetition is not noticed.
- **Every moving element has a reduced-motion form written in the spec before it is built.**
