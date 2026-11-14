# Phase 1 — Concept and references

Find a visual concept from **outside** the world of interfaces and turn it into attributes a prompt and a build can use. This phase writes the concept line, `refs/` with `refs/SOURCES.md`, and `dna.md`. It needs `brief.md` and the layout lock from [`brief-and-layout.md`](brief-and-layout.md).

## 1. The concept line

One sentence: **a <screen> that feels like <something outside UI>.**

- "A dashboard that feels like an observatory."
- "An onboarding flow that feels like a ferry crossing at dawn."
- "A billing page that feels like a watchmaker's ledger."

Rules:

- The second half names a place, an object, a practice, or a scene. Something you could photograph or find in a museum, not an adjective.
- It must suggest concrete material, light, and shape. If you cannot list three references for it in a minute, it is too abstract.
- Write two or three candidate lines and let the user pick one, or run two as rival directions in Phase 2.
- The concept line goes at the top of `dna.md` and into every prompt's VISUAL IDENTITY section.

## 2. Brand adjectives are not a direction

"Warm, tactile, editorial" has a most likely look, and an agent with no concept step ships it: cream paper, a high-contrast serif, a terracotta accent. That is the adjective's statistical center, the same look every other team gets from the same words. Adjectives describe the target feeling. They do not choose a look.

Do not map adjectives straight to a palette, a typeface, or a texture. Run this procedure instead:

1. **Keep the adjectives as acceptance.** Write them in `brief.md` under Acceptance: "a first-time visitor would call it warm, tactile, editorial". They judge the result; they do not produce it.
2. **Name the obvious look.** Write down what the adjectives produce by default ("cream paper, serif, terracotta"). It becomes the first negative reference (section 4).
3. **Write concept lines that satisfy the adjectives differently.** For "warm, tactile, editorial": "a luthier's bench under one lamp" (warm wood, gut string, brass), "a glaze test wall in a ceramics studio" (tactile glazes, kiln color), "a 1970s radio studio" (felt, walnut, amber meters). Editorial is a matter of hierarchy and composition, so it does not need paper.
4. **Source references for each line from outside UI** (section 3).
5. **Declare the divergence axis** for the first round (section 6). The Phase 2 control plate carries the adjectives verbatim as its only direction (no concept, DNA, or identity image), so it shows what the adjectives alone produce next to the candidates, and the distance check in [`../anti-patterns/generic-ai-look.md`](../anti-patterns/generic-ai-look.md) names what is different.

A mandatory brand palette is not an adjective. It is a constraint from the brief and stays fixed; the concept then works through light, material, art, and composition.

## 3. Sourcing references

Look where creativity is not interface work: illustration, digital art, photography, architecture, film stills, 3D renders, posters, scientific imagery, craft objects, museum open-access collections. Pinterest, Behance, and ArtStation are good starts. Use Dribbble and UI galleries only to check buildability, never as the identity source: a dashboard reference produces another dashboard.

- Collect three to eight candidates in `refs/`, with plain file names (`refs/observatory-dome.jpg`).
- Record each in `refs/SOURCES.md`: file, link, author when known, license or "inspiration only".
- Keep one image per idea. Three photos of the same observatory are one reference.
- Show the candidates to the user before writing DNA cards for all of them.
- When sourcing fails (rate limits, blocked or dead links), say so in `refs/SOURCES.md`. Fewer than three references is acceptable then. In assisted mode, ask the user at the round-1 hand-off for named files (`refs/<name>.jpg`) or a link. A concept with no reference image runs words-only in round 1, and only if that candidate's prompt file (`prompts/v1-<value>.md`) says so. Never drop a concept silently.

## 4. Negative references

A negative reference is a look the result must not land on. Record them at the top of `dna.md` under `Not:`, as named looks or as files in `refs/not/`.

- Always include the adjective default from section 2, when the brief has adjectives. The control plate shows it: the adjectives go into the control verbatim as its only direction, and a brief with no adjectives gets a control with no direction.
- Include the current house style of the closest competitor, when the user names one.
- Use the list to review candidates and to write the distance note on the board. Inside a prompt, phrase the positive instead ("cool north light", not "no warm light"): naming a thing in a prompt tends to invite it.

## 5. Reference budget

Each generation call gets **one identity reference plus the layout lock**. More identity images dilute: the model averages them and the concept blurs.

- A second identity image is allowed only to lend one named attribute, and its role sentence in the prompt says so ("Image 3: material only, take the brushed titanium surface").
- Three images per call is the ceiling.
- The DNA card carries the rest of the concept in words, so the prompt does not need more pictures.

## 6. Divergence axes

Variants must differ on purpose. Four images that each change the subject, the palette, and the layout at once cannot be compared, and the choice becomes a coin toss.

| Axis         | Poles to pick from                                                    |
| ------------ | --------------------------------------------------------------------- |
| **Mood**     | calm ↔ tense, intimate ↔ monumental, playful ↔ austere                |
| **Material** | glass, metal, paper, fabric, stone, wood, light itself                |
| **Light**    | dawn, noon, dusk, night; hard ↔ soft; single source ↔ ambient         |
| **Density**  | sparse with large art ↔ dense with small art; art as backdrop ↔ inset |

Rules:

- Round 1 holds the concept line, the layout lock, and the content fixed, and varies **one declared axis** across its two or three candidates. Example: concept "observatory", axis light: dusk, deep night, red-lamp darkroom.
- To compare two concept lines, the concept is the axis, and everything else is held.
- Write the axis and its values in `dna.md`, and the axis with its one value at the top of each `prompts/v1-<value>.md`, so the board and [`converge.md`](converge.md) can name what changed.

## 7. The DNA card

Fill one card per chosen reference in `dna.md`, under the concept line, the brand constraints from the brief, the `Not:` list, and the declared axis. See [`examples/dna-card.md`](../examples/dna-card.md).

```
## <short concept name>  (refs/<file>.jpg)
Palette: background, surfaces, 1-2 accents (approximate hex)
Light: where it comes from, hard or soft, glow, contrast
Materials and textures: glass, metal, paper, grain, noise, fine lines
Shapes and motifs: orbits, grids, curves, angles, particles, technical drawings
Composition: center of mass, symmetry, density, breathing room
Suggested typography: voice (technical, editorial, geometric), weight, case
Implied motion: what would ask to move (smoke, orbit, pulse)
Risks: legibility, contrast, noise, protected elements (characters, brands)
```

For the Palette row, read the reference's colors:

```bash
python3 scripts/palette.py design/<slug>/refs/observatory-dome.jpg --colors 6 --swatch design/<slug>/refs/observatory-dome-swatch.png
```

It prints suggested roles (`background`, `surface`, `foreground`, `muted-foreground`, `accent`), their contrast ratios, and notes. A near-monochrome reference gets a note: pick the accent by hand. These hex values describe the reference, not the product; tokens are set in Phase 5 from the approved mockup.

Agree on the concept with the user. When the concept is the declared round-1 axis (concepts run as rivals), the round-1 board is the agreement and Phase 2 may start. Otherwise stop here and agree on the concept (or the pair) first.

## 8. IP rules

- A reference lends **attributes**, never the work. No identifiable character, logo, trademark, or artwork appears in a mockup or an asset.
- Do not name a living artist or a studio in a prompt to borrow their style. Describe the attributes from the DNA card.
- Record every source in `refs/SOURCES.md`. Files in `refs/` never ship as product assets; final art is generated or licensed.
- If a mockup reproduces a protected element anyway, mark it in the Risks row and remove it in the next round.

## Exit check

- [ ] `dna.md` opens with one concept line that names something outside UI, not an adjective.
- [ ] `refs/` holds three to eight references (fewer only when sourcing failed, noted in `refs/SOURCES.md`), each recorded with origin and license.
- [ ] `dna.md` has a `Not:` list, including the adjective default when the brief has adjectives.
- [ ] The divergence axis for round 1 and its values are declared.
- [ ] Each chosen reference has a DNA card with all eight fields, and the user agreed on the concept, or the concept is the round-1 axis and the board will be the agreement.
