# The generic AI look

Check every candidate mockup in Phases 2 and 3, and the build in Phase 7, against this file. Run the distance check first. The list of tells comes after it on purpose: tells change every season, and the check works on whatever the current default is.

## The distance check (run it before reading any tell)

1. Generate the control plate: the layout lock as the only reference, the brief's content, and a bare prompt with no concept and no DNA card (`prompts/control.md` makes `mockups/v1/control.png`, "a high-fidelity UI screenshot of an observability dashboard"). One per exploration, in round 1 with the candidates ([`mockup-prompting.md`](../references/mockup-prompting.md)).
2. Put it beside the candidates on one board: `python3 scripts/board.py mockups/v1/control.png mockups/v1/mock-1.png mockups/v1/mock-2.png mockups/v1/mock-3.png --labels control,mock-1,mock-2,mock-3 --cols 4 --out mockups/v1/board.png`.
3. For each candidate, write one sentence each on what is different from the control in:
   - **identity:** palette, light, material;
   - **composition:** where the mass sits, what the regions are made of, density;
   - **typography:** faces, case, scale contrast, figures.
4. If you cannot write one of the three sentences, that candidate is the control with a different coat. Do not show it as a direction. Change the declared axis, or go back to the concept line ([`concept-and-dna.md`](../references/concept-and-dna.md)).
5. In Phase 7, run it again with the screenshot of the build beside the approved mockup and the control plate. A build drifts toward the control one default at a time (a font fallback, a radius, a card wrapper). If the screenshot is closer to the control than to the mockup in any of the three, that is a fidelity defect ([`fidelity-and-lock.md`](../references/fidelity-and-lock.md)).

Write the three sentences under each candidate when you present the board. For the candidate the round keeps, they go into the `Why:` line of its `lineage.md` entry; a worked example is in [`lineage.md`](../examples/lineage.md).

## 1. A default chosen without examination

**Symptom:** the mockup or the build uses something from the list below, and nobody can say why it is there except that it is what came out.

**Cause:** image models and coding agents return the most likely answer to the prompt they got. Without a concept, references, and a declared variable, the most likely answer is the average of every product page they were trained on.

**Fix:** a default is not forbidden. It is forbidden as an unexamined choice. Keep it when the DNA card or the brief gives a reason (a sans for a data-dense table, a grid for a catalog), and write that reason in `spec/` next to the token. A tell with a written reason is a decision.

## 2. Brand adjectives mapped straight to the likeliest look

**Symptom:** the brief says "warm, tactile, editorial", and the result is cream paper, a serif, and a terracotta accent. Or "calm and alert" becomes dark navy with one bright accent. The result can be well made and still be the first idea anyone would have.

**Cause:** adjectives have obvious visual translations. With no exploration step between the adjective and the build, the obvious translation goes straight into the build. An agent working without this skill turned exactly "warm, tactile, editorial" into a cream sheet on a kraft table, with serif type and a terracotta accent.

**Fix:** adjectives are inputs to the concept line, not direction. Write the concept line from outside UI (a place, an object, a process), pick an identity reference that shows it, and fill the DNA card from the reference ([`concept-and-dna.md`](../references/concept-and-dna.md)). Then run the distance check.

## 3. Swapping one ban list for another

**Symptom:** after "no purple gradients, no Inter", every result is near-black with a monospace label face, or cream with a serif. The team now avoids the new cluster too, and the next cluster appears.

**Cause:** a list of things not to do still describes a target by exclusion. The model, or the agent, moves to the next most likely answer, which becomes the next generic look.

**Fix:** treat the entries below as questions, not bans. Distance is measured against the control plate of this run, not against a list. If a result avoids every tell and fails the distance check, it is still generic.

## 4. Inter by default

**Symptom:** _Image:_ one neutral sans at every size, medium weight, little contrast between headline and body. _Code:_ `font-family: Inter, system-ui, sans-serif` on the body and nothing else.

**Cause:** it is the most common face in the UI kits and templates the model has seen, and the safest fallback when no type direction exists.

**Fix:** type comes from the DNA card's suggested typography, mapped to an available face in [`build-spec.md`](../references/build-spec.md). If the answer is still a neutral sans, write which property of the concept it serves.

## 5. Indigo-to-purple gradients

**Symptom:** _Image:_ a blue-violet glow behind the hero or across buttons. _Code:_ `linear-gradient(135deg, #6366f1, #a855f7)` or a Tailwind `from-indigo-500 to-purple-500`.

**Cause:** the color of a decade of SaaS landing pages and default framework palettes.

**Fix:** palette roles come from the identity reference (`python3 scripts/palette.py`), then are adjusted for contrast. A gradient must exist in the reference's light, not as decoration.

## 6. A centered hero over three rounded cards

**Symptom:** _Image:_ headline and two buttons centered, three equal cards with an icon, a title, and two lines each. _Code:_ a flex row of three identical card components at equal width.

**Cause:** the most frequent marketing layout, and the easiest to generate and to build.

**Fix:** the layout lock decides the regions from the brief's content ([`brief-and-layout.md`](../references/brief-and-layout.md)). Three items earn three equal cards only when the content is three equal things; otherwise the composition comes from the DNA card.

## 7. Glass everywhere

**Symptom:** _Image:_ every panel frosted and translucent over a blurred blob. _Code:_ `backdrop-filter: blur()` on every surface.

**Cause:** glass is the model's shorthand for "premium UI", and it hides weak composition.

**Fix:** glass is a material, so it belongs only when the reference has glass. Use it on at most one layer, with text contrast measured on the worst background it can sit over ([`implementation.md`](../references/implementation.md)).

## 8. Bento grids

**Symptom:** _Image:_ a mosaic of rounded tiles of mixed sizes, each with one feature. _Code:_ a CSS grid of cards with `grid-row: span 2` on a few.

**Cause:** the current shape for "a lot of features at once" on product pages.

**Fix:** ask what the content's real structure is (a sequence, a comparison, a hierarchy) and let the layout lock follow it.

## 9. Emoji as icons

**Symptom:** _Image:_ a rocket, a lightning bolt, and a padlock emoji above feature titles. _Code:_ emoji characters in headings or buttons.

**Cause:** the model fills icon slots with the cheapest legible glyph.

**Fix:** one icon set, chosen in the spec for its stroke and corner style against the DNA card, or no icons.

## 10. Fade-and-slide on every section

**Symptom:** _Code:_ every section starts at `opacity: 0; transform: translateY(20px)` and animates in on scroll. _Video:_ the clip adds the same drift to every element.

**Cause:** the default of every scroll-animation library and the easiest motion to ask for.

**Fix:** motion comes from the motion notes: what moves, why, and what must stay still ([`motion.md`](../references/motion.md)). Most sections do not move at all.

## 11. Numbered markers on content that is not a sequence

**Symptom:** "01, 02, 03" above features, notes, or entries that have no order.

**Cause:** numbers read as editorial structure and fill space above a heading.

**Fix:** numbers only on steps, ranks, or anything the user must read in order. Elsewhere, the content's own label.

## 12. A single accent word in a headline

**Symptom:** _Image:_ one word of the headline in the accent color or in a gradient. _Code:_ a `<span class="accent">` inside every `<h1>`.

**Cause:** a template move that signals emphasis without deciding what the headline says.

**Fix:** emphasis comes from the copy and the type scale. Use color in a headline only when the concept gives it a meaning.

## 13. All-caps labels

**Symptom:** small uppercase, widely tracked labels above every section and field.

**Cause:** an easy way to make a page look designed and structured.

**Fix:** decide case per role in the spec. Uppercase is fine when the concept motivates it (engraved plates, stamped labels) and kept to two or three words; sentence case for everything read in full.

## 14. A trailing arrow on every link

**Symptom:** "Learn more →", "Read the docs →", "See pricing →".

**Cause:** the arrow fakes affordance and momentum on any text.

**Fix:** an arrow means "go to another place" and appears only there. Links look like links through the link style in the spec.

## 15. The current "tasteful" clusters

**Symptom:** _Image or code:_ a cream background with a high-contrast serif and a terracotta accent; or near-black with a monospace face for labels and a single bright accent.

**Cause:** these are what models and agents now produce when asked for something that does not look like a template. They are the second most likely answer, so they are generic too.

**Fix:** none of these elements is wrong in itself. The cluster is the tell. If the DNA card leads to one of them, keep it with its reason written down (entry 1) and check that the other two distance sentences still hold.
