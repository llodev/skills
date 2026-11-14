# Process anti-patterns

Check the run against this list at every phase gate. Each entry gives the symptom, the cause, and the fix. The first six are what a capable agent does by default when asked for a distinctive UI without this skill.

## 1. Designing in code first

**Symptom:** the first artifact is `index.html` and a stylesheet. The look is decided while writing CSS, and images, if any, come after.

**Cause:** a coding agent invents the layouts it already knows how to implement. Exploring in code is slow, so it explores once.

**Fix:** diverge in image, converge in code. Phases 0 to 3 produce no application code. The first code is written in Phase 6, from an approved mockup and a spec.

## 2. Treating images as optional because everything can be drawn in CSS

**Symptom:** "I did not need any images for this." The map, textures, and ornaments are drawn in SVG and CSS, and no image is generated.

**Cause:** the agent sees images as assets. Anything it can draw, it does not need to generate, so the image step looks redundant.

**Fix:** images in Phases 2 and 3 are not assets. They decide the look: composition, light, material, type scale, several directions side by side. Code cannot show four directions in a minute. Run the image step even when every final element will be CSS ([`mockup-prompting.md`](../references/mockup-prompting.md)).

## 3. Building before approval

**Symptom:** the full page or app is built and tested before the user has seen any direction. Questions come after the build. "A first working version is enough."

**Cause:** a coding agent's default deliverable is running code, and stopping at a hand-off with no code feels unfinished.

**Fix:** stop at the hand-off. After Phase 2, show the board, state what you need from the user (a choice, or the files to attach), update `STATUS.md`, and end the turn. Phase 6 starts only from `mockups/APPROVED.*`.

## 4. Images only as asset fill or later decoration

**Symptom:** the layout is built, and images are requested for gallery slots ("I need four images for the gallery"), or offered later as textures ("if you want more tactility later").

**Cause:** once the code exists, an image can only fill a slot or add a surface. It can no longer change the direction.

**Fix:** generate full-screen comps first, then art plates. An art plate (illustration, background, texture) is cut from an approved comp in Phase 5, not invented for an empty slot ([`build-spec.md`](../references/build-spec.md)).

## 5. Skipping the layout lock

**Symptom:** the first prompt goes out with no `brief.md` and no `layout/wire.png`. Each mockup has a different arrangement, and one of them drops a function.

**Cause:** the layout feels obvious, or the agent plans to fix it in code.

**Fix:** Phase 0 writes the brief and renders the lock before any prompt: `python3 scripts/wireframe.py design/<slug>/layout/wire.json --out design/<slug>/layout/wire.png`, or a skeleton render of the running app ([`brief-and-layout.md`](../references/brief-and-layout.md)). The lock goes into every prompt as the layout reference.

## 6. Direction written only inside prompts

**Symptom:** "Style line to keep in every prompt: warm lamp light, deep violet and gold." The direction lives in a prompt suffix, with no brief, concept line, or DNA card behind it.

**Cause:** the direction was already decided in code, so a separate written direction feels redundant.

**Fix:** the concept line and the DNA card are files (`dna.md`) written in Phase 1. Prompts quote them. A prompt is never the only place the direction exists.

## 7. Text-only prompts with no reference roles

**Symptom:** "Documentary photo of a finished product on a workbench, seen from slightly above." No image is attached, no role is stated, no layout regions are named.

**Cause:** the agent holds no reference files and writes prompts for subject matter, not for page composition.

**Fix:** follow the prompt contract: LAYOUT, VISUAL IDENTITY, CONTENT, QUALITY BAR. Name each attached image's role in the prompt ("image 1 is the identity reference, borrow its palette and light, not its subject; image 2 is the wireframe, follow it exactly") ([`mockup-prompting.md`](../references/mockup-prompting.md)).

## 8. Changing several variables in one round

**Symptom:** four images with four different subjects, palettes, and layouts. Or v3 changes the light, the density, and a component at once, and nobody can say which change helped.

**Cause:** the round is optimized for variety or for a consistent set, not for a comparison.

**Fix:** round 1 is the control plate plus two or three candidates on one declared axis (mood, material, light, or density), four images at most, control included. For a site, round 1 explores the first viewport only. Later rounds change one thing, edit from the best version, and generate two to four candidates ([`converge.md`](../references/converge.md)).

## 9. Baking text into art

**Symptom:** the hero illustration has the headline painted into it, or the art plate carries button labels and chart numbers.

**Cause:** the mockup is a single image, and the agent cuts art from it without separating art from interface.

**Fix:** art is art, interface is interface. Ask for the clean plate ("the same artwork without any UI and without any text"). Every word in the build is real text in a real component.

## 10. Approving without buildability triage

**Symptom:** the user approves a mockup with a liquid-metal central visual and a light that wraps around panels, and Phase 6 discovers it needs WebGL and three weeks.

**Cause:** the rubric's buildability score was given from impression, with no element and no medium named.

**Fix:** the blind critic's buildability evidence names the hardest element and its medium (CSS, SVG, image, video, canvas or WebGL, 3D); an element nobody can build within the brief's constraints lowers buildability below 4. The Phase 5 triage then confirms a medium for every element, and an element with no medium reopens Phase 3 with that element as the one change.

## 11. Chasing a pixel score

**Symptom:** Phase 7 loops on `python3 scripts/compare.py` until `overall` rises, moving elements by a pixel or two, while a missing hairline glow and a wrong typeface stay.

**Cause:** a number is easy to optimize and to report.

**Fix:** tile scores are advisory. Read the worst tiles' crops, fix in order of impact (layout, color and light, type, detail), and record intentional differences (real data, real text, accessibility) in the report. A fidelity claim cites the crops, not only a number ([`fidelity-and-lock.md`](../references/fidelity-and-lock.md)).

## 12. Designing desktop only

**Symptom:** the approved mockup is 16:9, and the mobile layout is whatever the CSS collapses into. Empty, loading, and error states are invented during the build.

**Cause:** mockups are generated at one size, and states never appear in a hero image.

**Fix:** Phase 3 makes a state sheet (empty, loading, error, hover, focus) before the lock and derives mobile in a separate pass from the approved desktop after it ([`converge.md`](../references/converge.md)); Phase 6 builds both from those images.

## 13. Lorem or gibberish in mockups

**Symptom:** the mockup shows "Lorem ipsum", or text that looks like words and is not.

**Cause:** the prompt gave no content, or the model could not render the text it was given.

**Fix:** the prompt's CONTENT block carries the real strings from `brief.md`. Check every image before showing it; a mockup with gibberish is regenerated or edited, not approved. Legibility is scored on the real text.

## 14. Reusing a protected work as an element

**Symptom:** the mockup contains a recognizable character, logo, livery, or artwork from a reference, and it is cut into an asset.

**Cause:** the reference was sent as content to copy, not as a source of attributes.

**Fix:** a reference lends identity only: palette, light, texture, material, shape. Say "borrow from image 1, do not copy its subject". Record sources in `refs/SOURCES.md`, and use only generated or licensed art in the product.

## 15. Hiding bad generations from the user

**Symptom:** the user sees two polished images. The six that ignored the layout or garbled the text were dropped silently.

**Cause:** the agent wants the round to look successful.

**Fix:** show every image of the round on the board, failures included, and say what failed. Rejected rounds stay in `lineage.md`. Say plainly what could not be built faithfully.

## 16. Running a paid retry loop without asking

**Symptom:** a generation failed or looked wrong, and the agent ran it again, then again, or generated eight images "to have options".

**Cause:** each retry feels small, and the cost is not visible to the agent.

**Fix:** generation is paid. Ask before any round of more than four images, before any video, and before any retry loop. State the image count when asking. Frames for a storyboard are a later round with their own count and confirmation.

## 17. Grading one's own mockup

**Symptom:** the agent that wrote the prompts scores its own images at 5 for originality and approves them.

**Cause:** the author sees the intention, not the image, and knows which parts were meant to be good.

**Fix:** the author does not grade their own work. A blind critic, a fresh agent given only the brief, the image, the rubric, the control plate, and the layout lock, scores identity, layout fidelity, legibility, buildability, and originality. Approval needs every score at least 4 and an explicit choice by the user ([`converge.md`](../references/converge.md)).
