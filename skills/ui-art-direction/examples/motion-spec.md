# Example: Phase 4 motion notes

> Example of Phase 4 in [`SKILL.md`](../SKILL.md), following [`motion.md`](../references/motion.md). Same fictional product as [`brief.md`](brief.md), starting from the approved v3 in [`lineage.md`](lineage.md). Below the line is the draft `design/service-overview/spec/motion.md`.

How the clip was made: the user confirmed two takes of one 8 s clip prompt before they were generated, and no retry was run. The input was `mockups/APPROVED.png`. The prompt is saved as `prompts/clip-01.md` and its copy `prompts/clip-02.md`, the takes as `video/clip-01.mp4` and `video/clip-02.mp4`, each with its sidecar (`video/clip-01.json`). The clip stays a reference: the user did not ask for it as an asset. The pulse and the point of light divide 8 seconds and loop; the star field is named as a drift:

```
Animate this UI screenshot as a live product screen. Locked-off camera, no zoom, no pan,
no cuts. Keep all UI text, panels, controls and layout perfectly still and legible.
Motion only in: the star field inside the service map drifts very slowly around its
center, a drift that does not need to close; the red star of the failing service brightens
and dims every 2 seconds; a point of light travels along the failing constellation line
every 4 seconds. Subtle, calm. The pulse and the point of light loop seamlessly in
8 seconds. Duration 8 seconds.
```

The user watched the clip at full speed and approved it by name; `lineage.md` gained `APPROVED clip: video/clip-01.mp4 (sidecar video/clip-01.json), chosen by the user on 2026-11-12`.

Keyframes, read from the contact sheet `video/frames-01/sheet.png`. The shortest period is the 2 s pulse, so the count is 16 (frames 0.5 s apart, a quarter of the pulse):

```bash
python3 scripts/frames.py video/clip-01.mp4 --out-dir video/frames-01 --count 16
```

---

Source: video/clip-01.mp4, from mockups/APPROVED.png
Motion focus: the failing star. Everything else stays quiet.
Discarded: a light sweep the model added across the dome slit at about 3 s, and the latency digits in the services list, which warped between frames `8/16` and `10/16`: noise, not effects. Cut for the budget: the point of light along the failing line, which competed with the failing star for the eye.

## Star field

- What moves: the star field inside the service map, around the map's center.
- Speed and rhythm: under 15 degrees between frames `1/16` and `16/16` (7.5 s), the smallest step an estimate to the nearest 15 degrees can show, so slower than one turn in 3 minutes; built at one turn in 30 minutes (estimated), linear, continuous. A drift, not a loop: it cannot close in an 8 s clip, so it is built as a slow rotation, not a looped video.
- What must stay still: service nodes, dependency lines, labels, and the map frame. Only the background stars turn.
- Trigger: ambient loop. The only ambient loop on the screen.
- Reduced motion: stops on the approved image's star field as a still.

## Failing star

- What moves: the node of a service whose health is Failing.
- Speed and rhythm: brightness 100% to 55% and back, 2 s, ease-in-out (estimated), no stagger; one pulse per failing service.
- What must stay still: its label, its health word, its position.
- Trigger: health changes to Failing on a data update; stops when health recovers.
- Reduced motion: no pulse; the node stays at full brightness with its ring shape and the word "Failing".

## Interaction layer

- Service row, hover or keyboard selection: its node and dependency lines brighten, other nodes dim to 40%, no layout shift; 150 ms, ease-out; trigger: hover or selection. Reduced motion: the same change, instant.
- Every control, focus: a 2 px warm-white ring with a 2 px offset; instant, never animated; trigger: focus. Reduced motion: unchanged.
- Assistant thread, new message: opacity in, nothing else; 240 ms, ease-out; trigger: message arrives. Reduced motion: appears at once.
- Proposed action ("Roll back deploy 4f2c1a"): color change, then a confirmation dialog, so nothing runs on the first press; 120 ms, ease-out; trigger: press. Reduced motion: unchanged, color only.
- Services and incidents, data update: values swap in place with no count-up and no row movement, and a thin progress mark in the top bar follows the real request; trigger: every 15 s. Reduced motion: the mark is replaced by "Updated 14:32:15".
