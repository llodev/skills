# Phase 4 — Motion (optional)

Find out how the locked design moves before writing code: an image-to-video model invents motion cheaply, and you read the clip into a spec. Output: clips in `video/`, their prompts in `prompts/`, keyframes, a draft `spec/motion.md`. Run this phase when the DNA card's implied motion matters to the concept; a static admin screen skips it. Every video needs the user's confirmation first (cost gate in `SKILL.md`).

The input is `mockups/APPROVED.*`, never an earlier version. Video families with image-to-video (Veo, Kling, Seedance, Runway, Wan, and others) are covered in `references/modes-and-models.md`.

## Prompt contract

Save each prompt as `prompts/clip-NN.md`, numbered with the clip it makes (`prompts/clip-01.md` makes `video/clip-01.mp4`). Five parts, all required:

1. **Camera:** locked-off. No zoom, no pan, no cuts.
2. **Stillness:** all UI text, panels, controls and layout stay perfectly still and legible.
3. **Motion only in named layers:** name each moving layer by what it is in the art ("the central black hole", "gold particles along the orbital rings"), with its speed. Never "animate the dashboard".
4. **Loop:** seamless, the last frame returns to the first; or a slow continuous drift (a field that turns or slides too slowly to close in one clip), recorded as a drift in `spec/motion.md`. In a loop, every period divides the duration (an 8 s loop takes periods of 1, 2, 4, or 8 s); a layer that cannot close in the clip is a drift, named as one in the prompt.
5. **Duration:** 5 to 10 seconds.

The sample is a loop: each layer completes a whole number of cycles in 8 seconds, so the last frame returns to the first.

```
Animate this UI screenshot as a live product screen. Locked-off camera, no zoom, no pan,
no cuts. Keep all UI text, panels and layout perfectly still and legible.
Motion only in: the glow of the central black hole swells and settles every 4 seconds;
gold particles travel once around the orbital rings in 8 seconds; data points pulse
softly one after another, every 2 seconds; a light sweep crosses the timeline every
4 seconds. Subtle, elegant. Seamless loop: at 8 seconds every layer is back where it
started. Duration 8 seconds.
```

If the model keeps moving the UI after one retry (ask before retrying), animate a clean art plate instead and composite the interface over it in code. Make the plate with the art-plate prompt of [`mockup-prompting.md`](mockup-prompting.md) section 3, the approved image as the reference; save it as `assets/plate-<id>.<ext>` with its sidecar and its prompt as `prompts/plate-<id>.md`. That path costs one more image and one more clip: ask before both, with the count. Phase 5 records this plate in `spec/assets.md` instead of making another.

## The clip and its approval

Save each clip as `video/clip-NN.mp4` with a sidecar `video/clip-NN.json` holding the seven fields of [`modes-and-models.md`](modes-and-models.md) section 5, written by hand: no script makes video. In assisted mode the step line asks the user to attach `mockups/APPROVED.<ext>` alone, run `prompts/clip-NN.md`, keep the still's aspect with no crop or letterbox (a cropped clip no longer lines up with the lock), save the result as `design/<slug>/video/clip-NN.mp4`, and say which app and model made it.

Show every clip to the user, the bad takes included. The user watches it at full speed, which an agent working from stills cannot, and approves one by naming its file; append the approval to `lineage.md` in the lock line style: `APPROVED clip: video/clip-NN.mp4 (sidecar video/clip-NN.json), chosen by the user on <date>`. Write `spec/motion.md` from the approved clip only.

## Start and end frames for transitions

A site's storyboard has one frame per section or page. For a transition, give the model two frames: the start (the current section's lock, `mockups/APPROVED.<ext>` or `mockups/APPROVED-s<N>.<ext>`) and the end (the next section's lock), and describe only the change between them ("the nebula contracts into the card grid; panels fade in last"). Support differs by video model: some accept only a first frame, some a first and a last frame, some neither in image-to-video mode. Check the provider's docs for the model you use before writing the prompt. The clip is a reference for the choreography; the transition itself is rebuilt in code in Phase 6.

## Keyframes

```bash
python3 scripts/frames.py video/clip-01.mp4 --out-dir video/frames-01 --count 8
```

Prints the frame paths, then the contact sheet path `video/frames-01/sheet.png`. The sheet labels frames `1/N` to `N/N`; frame `k/N` is taken at `(k - 0.5) / N` of the clip's duration, so on an 8 s clip with 8 frames, frame `k/8` sits at `k - 0.5` seconds. Frames are duration / count apart, so a motion shorter than about two spacings falls between frames. Use `--count 12` or more for fast motion; as a default chosen by judgment, raise the count until the spacing is at most a quarter of the shortest period (a 2 s pulse on an 8 s clip: `--count 16`). Requires `ffmpeg` and `ffprobe` on the path; without them the script exits 2 with a message. Then ask the user to install them (the default), or to describe each layer's motion from a player; mark every entry written from that description `(from the user's description)`.

## Reading the clip into `spec/motion.md`

The user's viewing is the full-speed watch; you work from the sheet. The file opens with `Source:` (the approved clip, for example `video/clip-01.mp4`, and the still it came from) and the motion focus; the build's delegation brief points at that clip. Then a `Discarded:` line, then one `## <layer>` heading per moving layer with these bullets, in this order:

- **What moves:** the layer, named as in the prompt.
- **Speed and rhythm:** period or distance per second, easing, cadence, stagger. Measure periods and distances on the sheet: a ring that turns 30 degrees between frames `2/8` and `6/8` of an 8 s clip turns 30 degrees in 4 s, so one turn takes 48 s. Easing and stagger cannot be read reliably from stills: write the value the prompt asked for or your estimate, marked `estimated`. Write "1 turn / 48 s, linear", "pulse 2 s ease-in-out (estimated), 150 ms stagger (estimated)", "sweep every 4 s".
- **What must stay still:** text, controls, panel edges, data.
- **Trigger:** ambient loop, on load, on scroll, or on interaction.
- **Reduced motion:** see below.

The interaction layer follows under `## Interaction layer`. A filled example is in `examples/motion-spec.md`.

**Discard deformed regions.** Compare the first and last frames of the sheet with the approved image. Where the model warped glyphs, drifted a panel, or melted a control, that region is noise: drop it, list it on the `Discarded:` line, and keep only the motion of the art layer. Never write a deformation into the spec as an "effect". The sheet's first and last frames are not the clip's ends, so they cannot prove a loop: the user, playing the clip on repeat, says whether the seam jumps; a layer that jumps is recorded as a drift.

## What the clip cannot show

The clip is ambient. Specify the interaction layer yourself, in the same file:

- Hover and press: 120 to 180 ms, ease-out; color or elevation change, no layout shift.
- Focus: an instant, visible ring; never animated in.
- Entry of new content (a chat message, a row, a toast): 200 to 300 ms, one property or two.
- Loading and data updates: skeleton or progress tied to the real request, not a decorative loop.

## Reduced motion

Every entry in `spec/motion.md` states its `prefers-reduced-motion` behavior. Ambient loops stop on a still frame (the approved image's art, or a chosen keyframe as the poster). Transitions become a short crossfade or nothing. Interaction feedback stays, as color change without movement. No element flashes more than three times per second.

## Motion budget

One orchestrated moment beats scattered effects. Pick the one place motion carries the concept (the central visual's loop, or the load sequence of the hero) and keep everything else quiet. At most one ambient loop per viewport; no fade-and-slide on every section (a generic tell, see `anti-patterns/generic-ai-look.md`). If two moving layers compete for the eye in the clip, cut one.

The approved clip is a motion reference. It becomes an asset (a looping background of the art layer) only when its UI-free region is clean, or when it was made from the art plate.

## Exit check

- [ ] Each clip's prompt, `prompts/clip-NN.md`, names the locked camera, the still UI, the moving layers, the loop (or a drift) and the duration; each clip, `video/clip-NN.mp4`, has its sidecar.
- [ ] The user approved one clip by name, and `lineage.md` has its `APPROVED clip:` line.
- [ ] `spec/motion.md` opens with `Source:` naming the approved clip, and has one entry per moving layer with what moves, speed and rhythm, what stays still, and trigger.
- [ ] Deformed regions are recorded as discarded, not as motion.
- [ ] Hover, focus, entry and loading behavior are specified even though the clip does not show them.
- [ ] Every entry states its reduced-motion behavior, and one moment is named as the motion focus.
