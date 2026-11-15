# Example: Phase 1 concept and DNA card

> Example of Phase 1 in [`SKILL.md`](../SKILL.md), following [`concept-and-dna.md`](../references/concept-and-dna.md). Same fictional product as [`brief.md`](brief.md): the Parallax Service Overview. Below the line is `design/service-overview/dna.md`.

How the concept was chosen: the user's adjectives were "calm, alert". Mapped straight to a look, they give a dark navy dashboard with cyan accents and a row of KPI cards, so that look went to the top of the `Not:` list. Three concept lines went to the user: "a dashboard that feels like an observatory at night", "a dashboard that feels like a lighthouse lamp room", "a dashboard that feels like a seismograph station". The user picked the observatory: a room where a few people watch a sky of points all night, notice the one that changes, and act through precise instruments. That is the on-call job, in a material the control plate will not produce.

---

Concept line: A dashboard that feels like an observatory at night.

Brand constraints (from the brief): the Parallax logo and #2f6fd6 stay in the top bar. Everything else is open.

Not:

- Dark navy with cyan or neon accents and a row of KPI cards (the default for "calm, alert").
- Near-black with a monospace face for every label and number.
- Stock "space" imagery: nebulae, planets, glowing galaxies behind the interface.

Round-1 axis: light: dusk, night, darkroom (red work lamps only)

Prompts `prompts/v1-dusk.md`, `prompts/v1-night.md`, `prompts/v1-darkroom.md` make `mockups/v1/mock-1.png` to `mock-3.png` in that order, each opening with this axis and its own value, plus `prompts/control.md` for the control plate. At the end of this phase the concept line was copied into `brief.md` as its last line, `Concept: A dashboard that feels like an observatory at night.`

References in `refs/`, each recorded in `refs/SOURCES.md` with link and license: `observatory-dome.jpg` (identity, the one used in every call), `setting-circle.jpg` (brass scale, kept for the material line of the card, not sent), `star-chart-plate.jpg` and `control-desk.jpg` (shown to the user, not chosen). Each call gets one identity reference plus `layout/wire.png`.

## Observatory dome at night (refs/observatory-dome.jpg)

- Palette: background #15110e (warm black of the dome interior), surfaces #241c16 (oiled steel) and #2e251d (raised panel), foreground #ece4d6 (warm white), accents #e8b04a (brass and sodium lamp) and #c2432f (red work lamp); star points #a9c4ff. Read with `python3 scripts/palette.py design/service-overview/refs/observatory-dome.jpg --colors 6 --swatch design/service-overview/refs/observatory-dome-swatch.png`, then the red accent picked by hand: the script chose a brown rib as the accent.
- Light: one cool band of sky through the dome slit, hard edged; low red work lamps on the desk; brass catches both. Dark overall, high contrast inside the slit.
- Materials and textures: riveted steel ribs, brass setting circles with engraved scales, a glass star-chart plate with a fine graticule, faint film grain.
- Shapes and motifs: concentric rings and graticule lines; engraved tick scales; the dome's radial ribs; stars of different sizes joined by faint constellation lines.
- Composition: the slit is a vertical bright band just left of center where the eye lands; dark, quiet edges; dense small scales around the bright band.
- Suggested typography: technical voice; a grotesque with engraved-scale numerals, tabular; regular and medium weights; sentence case, no uppercase labels. No serif, no monospace.
- Implied motion: the sky turns slowly behind the slit; one star flickers; the dome itself never moves.
- Risks: star points behind small numbers ruin legibility; red on warm black is low contrast for text; stars can read as decoration instead of data; photographs from an observatory or space-agency archive carry their own terms, and no observatory name, crest, or instrument maker's mark may appear in a mockup.
