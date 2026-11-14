# Phase 2 — Explore

Generate full screens that keep **the layout of the lock** and take **the identity of the concept**, show them beside a control plate, and hand the choice to the user. This phase writes one prompt file per image (`prompts/control.md`, `prompts/v1-<value>.md`), `mockups/v1/` (`control.<ext>`, `mock-1.png`, `mock-2.png`, …) with sidecars, a board, and, for a site, a scroll storyboard once a direction is chosen. It needs `brief.md`, the layout lock, `dna.md`, and the mode from [`modes-and-models.md`](modes-and-models.md).

## 1. Images decide what code cannot

Code draws only what its author already knows how to build, so a look designed in code is the author's default. An image model shows three directions in the time it takes to style one. The look is chosen by seeing alternatives side by side, and that needs images.

Do not skip this phase because "everything can be drawn in CSS". Do not build the screen first and generate images afterwards to fill slots.

| Red flag                                         | What it means                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| "I did not need any images for this."            | The look was never explored. Write the prompt.                       |
| "A first working version is enough."             | Phase 2 delivers a board and a question, not an app.                 |
| "The only part waiting on you is four photos."   | Images were demoted to asset fill. Generate full-screen comps first. |
| "This style line keeps the set consistent."      | Variants should differ on one declared axis, not match.              |
| A prompt with no reference images and no regions | It is a photo description, not a screen design. Use the contract.    |

## 2. The prompt contract

Write prompts in English; write the interface text in the product's language. Save each prompt as its own file: `prompts/control.md`, then `prompts/v1-<value>.md` per candidate, named by its axis value, with the axis and that value on its first line. The candidate it makes is `mockups/v1/mock-<n>.png`, `<n>` being the value's place on the `Round-1 axis:` line of `dna.md`. Never edit a prompt that already produced images; write a new version.

```
You are designing a high-fidelity UI screenshot for a real, usable product.

Image 1 is the identity reference: borrow its palette, light and materials, do not copy its subject.
Image 2 is the layout lock: follow its regions and proportions exactly; its gray color and labels are not part of the design.

LAYOUT (must follow exactly, image 2 is the wireframe):
- <region 1: what it contains>
- <region 2: what it contains>
- Aspect ratio <16:9>, flat screen capture, no device frame, no perspective, no hands.

VISUAL IDENTITY (borrow from image 1, do not copy its subject):
- Concept: <the concept line>
- Palette: <background>, <surfaces>, accents <accent>
- Lighting/materials: <e.g. soft volumetric glow, frosted glass panels, thin gold hairlines>
- Motifs: <e.g. orbital rings and data constellations around the central visualization>
- Mood: <2-4 adjectives>

CONTENT (render this exact text, crisp and legible):
- Title: "<...>"   Nav items: "<...>", "<...>"   Sample data: <...>

QUALITY BAR: production-grade product design, consistent spacing, readable typography
(min ~12px equivalent), realistic UI components (buttons, inputs, lists), no lorem ipsum,
no gibberish text, no watermark.
```

Contract rules:

- **One sentence per reference image, stating its role**, in the order the images are attached: identity, layout, or one named attribute ("Image 3: material only, take the brushed titanium surface"). An image with no role sentence gets copied whole.
- LAYOUT lists every region of the lock in the lock's words. CONTENT comes from the brief's real content, never invented.
- VISUAL IDENTITY comes from the DNA card. With a mandatory brand palette, the Palette line states the brand values and the axis varies light, material, art, or composition.
- The declared axis value of each candidate is the only thing that differs between the candidates' prompts (its first line and the line that carries it).
- The aspect ratio in the prompt and in `--aspect` is the aspect of the layout lock's `size` (`[1920, 1080]` is 16:9). A lock at one aspect under mockups at another re-proportions every region.

## 3. Full-screen comps versus art plates

- A **full-screen comp** is the whole screen at the target aspect, with interface, real text, and art together. Phase 2 makes comps: they decide the look.
- An **art plate** is the art layer alone: background, illustration, texture. **No UI, no text**, no buttons, no letters. Art plates are build assets, made after the lock from the approved comp ([`build-spec.md`](build-spec.md)).

Never ask for art plates in place of comps, and never ship a comp as a background: its baked-in text and controls are not real components. For an art plate, drop the LAYOUT and CONTENT sections and add: "Art only: no interface, no text, no letters, no logos. Leave calm space where <region> sits."

## 4. Round 1 and the control plate

Round 1 is **four images at most**: one control plate plus two or three candidates that differ on the axis Phase 1 recorded on the `Round-1 axis:` line of `dna.md`. A round of this size never trips the cost gate.

The **control plate** is the same screen generated with a bare prompt: the layout lock as the only reference, the same LAYOUT and CONTENT as the candidates, and never a concept, DNA, or identity image. If the brief has brand adjectives, put them in verbatim as the control's only direction: the control then shows what the adjectives alone produce. If it has none, the control has no direction. Save it as `prompts/control.md`; the image is `mockups/v1/control.<ext>`:

```
Image 1 is the layout lock: follow its regions and proportions exactly; its gray color and labels are not part of the design.
A high-fidelity UI screenshot of <purpose from the brief>, aspect ratio <16:9>, flat screen capture.
<Brand adjectives verbatim, only if the brief has them: "Warm, tactile, editorial.">
LAYOUT (image 1 is the wireframe): <the same LAYOUT block as the candidates>
CONTENT (render this exact text): <the same content block as the candidates>
QUALITY BAR: <the same quality bar as the candidates>
```

Show it on the board beside the candidates, labeled `control`. Under each candidate, write one line naming what is different from the control (light, material, composition, type voice). A candidate you cannot tell apart from the control has failed; the distance check is in [`../anti-patterns/generic-ai-look.md`](../anti-patterns/generic-ai-look.md).

Later rounds ([`converge.md`](converge.md)) are two or three variants of one change and reuse this control plate; it is never regenerated.

## 5. Run the round

Automatic mode:

```bash
python3 scripts/wireframe.py design/<slug>/layout/wire.json --out design/<slug>/layout/wire.png
python3 scripts/generate.py --provider gemini --prompt design/<slug>/prompts/control.md \
  --ref design/<slug>/layout/wire.png --aspect 16:9 --out design/<slug>/mockups/v1/control.png
python3 scripts/generate.py --provider gemini --prompt design/<slug>/prompts/v1-dusk.md \
  --ref design/<slug>/refs/observatory-dome.jpg --ref design/<slug>/layout/wire.png \
  --aspect 16:9 --out design/<slug>/mockups/v1/mock-1.png
```

Repeat the second call once per axis value (`v1-night.md` makes `mock-2.png`, `v1-darkroom.md` makes `mock-3.png`). Native mode: the same prompt files and references, in the same order, through the host's image tool; write each sidecar by hand. Assisted mode: one step line per call, in the form from [`modes-and-models.md`](modes-and-models.md).

## 6. Verify each image before showing it

Check every image against the brief and the lock, and write the result under it on the board:

- **Layout:** every region of the lock is present, in the same place, order, and proportion.
- **Text:** legible, spelled as in the brief, no gibberish, nothing invented.
- **Functions:** nothing from "functions that cannot disappear" is missing.
- **Buildability:** name any element that would be impossible or expensive to build (text along a 3D curve, a live photo in every card).
- **IP:** no character, logo, or recognizable artwork.
- **Frame:** no device frame, perspective, or hands.

Show every image, including the failed ones, with their defects named. Hiding a bad generation hides what the model does with this prompt.

## 7. The board

```bash
python3 scripts/board.py design/<slug>/mockups/v1/control.png design/<slug>/mockups/v1/mock-1.png \
  design/<slug>/mockups/v1/mock-2.png design/<slug>/mockups/v1/mock-3.png \
  --out design/<slug>/mockups/v1/board.png --labels control,mock-1,mock-2,mock-3 --cols 4
```

Present the board with the axis, one line per candidate (its axis value, difference from the control, defects), and one question: which direction leads, or which two to recombine.

## 8. The hand-off

After the board, **stop**. The board goes to the user unscored: the blind critic scores it at the start of Phase 3, and the user's binding pick comes after the scores. A pick or leaning the user gives now goes on the `Open decisions` line of `STATUS.md` as a leaning, not as approval. Update `STATUS.md` (`Phase: 2 - Explore`, `Next step:` the choice you are waiting for, every file as a path from the project root) and wait for the user.

- In assisted mode, the hand-off names the file to attach and the file to save back, for example: "Tell me which candidate leads. After the critic's scores and your pick, I will write `design/<slug>/prompts/v2.md`; attach `design/<slug>/mockups/v1/mock-<n>.png` (first) and `design/<slug>/layout/wire.png` (second) to your image app, run that prompt, and save the results as `design/<slug>/mockups/v2/mock-1.png`, `mock-2.png`, `mock-3.png`."
- Phases 0 to 3 write no application code. No components, no styles, no "first working version" while waiting.

## 9. Scroll storyboard for a site

A site is a sequence, not a screen. Round 1 explores only the **first viewport** (the hero), with the control plate and two or three candidates.

After the user picks a direction, the storyboard is **a later round**: one frame per remaining section, in scroll order, each at the target viewport aspect, each with the hero the user picked as the identity reference and that section's wireframe as the layout lock. State how many frames you will generate and confirm before generating them, as the cost gate requires. A six-section page is five more images. Phase 3 scores every frame and locks each one as `mockups/APPROVED-s<N>.<ext>` ([`converge.md`](converge.md)).

Record it in `mockups/v2/storyboard.md`, one entry per frame (see [`examples/storyboard.md`](../examples/storyboard.md)):

```
S2 features — mockups/v2/story-02.png
Contains: three capability rows with real copy, one inline product shot.
Transition from S1: the hero's horizon line becomes the first row divider; background darkens one step.
```

The transition note says what carries across the boundary (a color shift, a shape that persists, a hard cut). Adjacent frames later serve as first and last frames for transition clips in [`motion.md`](motion.md).

## 10. The state sheet

Phase 3 runs this as step 0 of the design lock ([`converge.md`](converge.md)), after the user's pick passes: one **state sheet** from that pick, an edit of the picked image that shows its key components in empty, loading, error, hover, and focus states, laid out as a grid on one plate, with real messages from the brief. One image, so one call; state the count and confirm first. Save the prompt as `prompts/states.md` and the image as `mockups/states/sheet.<ext>` with its sidecar. Verify it like any other image; `lineage.md` logs it unscored. It feeds the component inventory in [`build-spec.md`](build-spec.md).

## 11. The mobile pass

Mobile is **derived from the approved desktop**, never explored separately. Phase 3 runs it right after the lock ([`converge.md`](converge.md)), one round, image count stated and confirmed. Its layout lock is the mobile wireframe Phase 0 rendered, `layout/wire-mobile.png` (from `layout/wire-mobile.json`, size `[1080, 1920]`, so it has the 9:16 aspect sent as `--aspect`: the nearest ratio to a 390×844 phone that most models accept); on a reskin, `layout/current-<screen>-mobile.png`. Run the round: the approved desktop as identity reference, the mobile wireframe as the layout lock, the same content, aspect 9:16. Crop to the phone's aspect when reading it, and register the crop as [`fidelity-and-lock.md`](fidelity-and-lock.md) section 1 says. The prompt adds: "Same identity as image 1, reflowed for a phone; no new colors, materials, or motifs." Verify that every function from the brief is still reachable. Save the prompt as `prompts/mobile.md` and the results under `mockups/mobile/`, named like a round's images (`mock-1.png`), with their sidecar; `lineage.md` logs them unscored unless the user makes one a lock candidate ([`converge.md`](converge.md)).

## Exit check

- [ ] Round 1 had a control plate and two or three candidates on one declared axis, four images at most, at the layout lock's aspect, each with a sidecar and its own prompt file (each candidate's headed by the axis and its value).
- [ ] Every candidate prompt has one role sentence per reference image and the LAYOUT, VISUAL IDENTITY, CONTENT, and QUALITY BAR sections; the control prompt has the role sentence, LAYOUT, CONTENT, and QUALITY BAR, and no VISUAL IDENTITY.
- [ ] Every image was verified and shown on the board, failures included, with its difference from the control.
- [ ] For a site, the storyboard frame count was confirmed before generating, and each frame has a transition note.
- [ ] `STATUS.md` names the choice awaited; no application code was written.
