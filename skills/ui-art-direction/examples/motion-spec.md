# Example: Phase 4 motion notes

> Example of Phase 4 in [`SKILL.md`](../SKILL.md), following [`motion.md`](../references/motion.md). Same fictional product as [`brief.md`](brief.md), starting from the approved v3 in [`lineage.md`](lineage.md). Below the line is the draft `design/service-overview/spec/motion.md`.

How the clip was made: the user confirmed one 8 s clip before it was generated, and no retry was run. The input was `mockups/APPROVED.png`. The prompt is saved as `prompts/clip-01.md`, the clip as `video/clip-01.mp4` with its sidecar `video/clip-01.json`. The pulse and the point of light divide 8 seconds and loop; the star field is named as a drift:

```
Animate this UI screenshot as a live product screen. Locked-off camera, no zoom, no pan,
no cuts. Keep all UI text, panels, controls and layout perfectly still and legible.
Motion only in: the star field inside the service map drifts very slowly around its
center, a drift that does not need to close; the red star of the failing service brightens
and dims every 1.6 seconds; a point of light travels along the failing constellation line
every 4 seconds. Subtle, calm. The pulse and the point of light loop seamlessly in
8 seconds. Duration 8 seconds.
```

The user watched the clip at full speed and approved it by name; `lineage.md` gained `APPROVED clip: video/clip-01.mp4 (sidecar video/clip-01.json), chosen by the user on 2026-11-12`.

Keyframes, read from the contact sheet `video/frames-01/sheet.png`. The shortest period is the 1.6 s pulse, so the count is 20 (frames 0.4 s apart, a quarter of the pulse):

```bash
python3 scripts/frames.py video/clip-01.mp4 --out-dir video/frames-01 --count 20
```

---

Source: `video/clip-01.mp4`, from `mockups/APPROVED.png`. Motion focus: the failing star. Everything else stays quiet.

Discarded: the model added a light sweep across the dome slit at about 3 s, and the latency digits in the services list warped between frames `10/20` and `12/20`. Both are noise, not effects. The point of light along the failing line was cut too: it competed with the failing star for the eye.

## Star field

- What moves: the star field inside the service map, around the map's center.
- Speed and rhythm: about 1.5 degrees between frames `1/20` and `20/20` (7.6 s), so one turn in about 30 minutes; linear, continuous. A drift, not a loop: it cannot close in an 8 s clip, so it is built as a slow rotation, not a looped video.
- What must stay still: service nodes, dependency lines, labels, and the map frame. Only the background stars turn.
- Trigger: ambient loop. The only ambient loop on the screen.
- Reduced motion: stops on the approved image's star field as a still.

## Failing star

- What moves: the node of a service whose health is Failing.
- Speed and rhythm: brightness 100% to 55% and back, 1.6 s, ease-in-out (estimated), no stagger; one pulse per failing service.
- What must stay still: its label, its health word, its position.
- Trigger: health changes to Failing on a data update; stops when health recovers.
- Reduced motion: no pulse; the node stays at full brightness with its ring shape and the word "Failing".

## Interaction layer (not in the clip)

- Hover or keyboard selection of a service row: its node and dependency lines brighten in 150 ms, ease-out; other nodes dim to 40%. No layout shift. Reduced motion: the same change, instant.
- Focus: an instant 2 px warm-white ring with a 2 px offset on every control; never animated.
- New assistant message: opacity in over 240 ms, nothing else. Reduced motion: appears at once.
- Proposed action ("Roll back deploy 4f2c1a"): pressing it opens a confirmation dialog; nothing runs on the first press. Press feedback is a color change in 120 ms.
- Data updates every 15 s: values swap in place with no count-up and no row movement; a thin progress mark in the top bar follows the real request. Reduced motion: the mark is replaced by "Updated 14:32:15".
