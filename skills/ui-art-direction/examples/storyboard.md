# Example: scroll storyboard for a landing page

> Example of a site in Phase 2 of [`SKILL.md`](../SKILL.md), following [`mockup-prompting.md`](../references/mockup-prompting.md). The product is fictional and separate from the dashboard in the other examples. The frame entries below are `design/halyard-landing/mockups/v2/storyboard.md`.

A site is not one screen. Round 1 explored only the first viewport: the control plate plus three hero candidates on one declared axis (material). The user picked a direction from that board. This storyboard is the later round, v2: one frame per remaining section, made in that chosen direction.

## The product

Halyard is a masthead wind instrument for small sailboats: solar powered, it sends wind speed and direction to the skipper's phone. Price 340 USD, ships in two weeks. The audience is weekend sailors who race club regattas.

Concept line, from Phase 1: a page that reads like a weather fax pulled from a boat's chart table. Gray thermal paper, blue-black print, isobar lines, wind barbs, one signal orange for the product's own readings. The round-1 pick was `thermal-paper` over `chart-vellum` and `printed-nylon`.

## Before generating

The agent told the user, and waited for a yes:

> Four frames, S2 to S5, one per remaining section, at 16:9, 1440 px wide. Each frame gets the hero you picked, `mockups/v1/mock-2.png` (thermal paper), as the identity reference and that section's wireframe (`layout/wire-s2.png` to `layout/wire-s5.png`) as the layout lock. Four images in one round. Say yes, or pick which sections to do first.

The user said yes. Frames are saved as `mockups/v2/story-02.png` to `story-05.png`, each with its sidecar, and shown on one board in scroll order with the hero first.

## Frames

### S1 hero — mockups/v1/mock-2.png

- **Contains:** headline "Know the wind before it reaches your sails."; subline "Halyard sits at the masthead and sends true wind to your phone, every second."; buttons "Buy Halyard, 340 USD" and "How it works".
- **Composition:** isobar field across the full width; the instrument small at upper right, at the top of a mast line; headline lower left, set on the paper, not on the art.
- **Art plate:** the isobar field and the instrument drawing, no text. Headline and buttons are real HTML over it.
- **Transition:** none; this is the round-1 frame the others continue from.

### S2 how it works — mockups/v2/story-02.png

- **Contains:** three steps, "Mount it on the masthead", "Pair it with the Halyard app", "Sail with true wind on your wrist or phone".
- **Composition:** one isobar line becomes a printed track with three wind-barb stations; each step sits beside its station.
- **Art plate:** the line and the three barbs. Step titles and copy are HTML. Numbers 1 to 3 are earned here: this is a real sequence.
- **Transition from S1:** the isobars run past the fold and continue into this frame's top 20 percent. The seam is designed: S1 and S2 later serve as the start and end frames of one transition clip, so the scroll shows no edge.

### S3 specs — mockups/v2/story-03.png

- **Contains:** weight 210 g; wind range 0 to 60 kn; accuracy ±0.5 kn and ±3°; radio range 40 m; runs 72 h in the dark on a full charge.
- **Composition:** exploded drawing of the instrument on the left half, printed as a fax; spec table on the right half as ruled lines.
- **Art plate:** the exploded drawing only. The table is an HTML table with the real values.
- **Transition from S2:** the third barb enlarges into the exploded drawing. Scroll-linked, 0.5 of scroll speed, no clip.

### S4 logbook — mockups/v2/story-04.png

- **Contains:** three owner entries, each a photograph, boat class, and one line ("Club dinghy, Lake Calder: caught the header 20 seconds before the fleet").
- **Composition:** the photographs printed as halftone strips, like received fax images, staggered down the page.
- **Art plate:** the halftone treatment is a CSS filter over licensed owner photographs, decided here and recorded for `spec/assets.md`. The photographs are content, not design comps.
- **Transition from S3:** hard cut. The page changes register from drawing to photographs, so a white rule and 120 px of paper separate them.

### S5 buy — mockups/v2/story-05.png

- **Contains:** "Halyard, 340 USD"; "Ships in two weeks"; "In the box: instrument, masthead bracket, USB-C cable"; "30-day returns"; button "Buy Halyard".
- **Composition:** one printed panel, centered on the isobar field from S1, which returns at lower contrast to close the page; the footer is plain HTML on paper.
- **Art plate:** the returning isobar field. Price, list, and button are HTML.
- **Transition from S4:** the last strip's bottom edge tears into the buy panel's top edge. Static, no motion.

## After the storyboard

In Phase 3 the blind critic scores each frame against the rubric, with that section's wireframe as the layout lock, and adds one continuity line for the board. The lock is the hero as `mockups/APPROVED.png` and each frame as `mockups/APPROVED-s2.png` to `mockups/APPROVED-s5.png`, with one lock line each in `lineage.md`; Phase 7 compares each section against its own lock file. The mobile pass comes after the lock: S1 and S3 are re-composed at 390 × 844, because the hero headline and the specs table do not fit the desktop arrangement.
