# Example: Phase 3 lineage

> Example of Phase 3 in [`SKILL.md`](../SKILL.md), following [`converge.md`](../references/converge.md). Same fictional product as [`brief.md`](brief.md) and [`dna-card.md`](dna-card.md). Below the line is `design/service-overview/lineage.md` as the run leaves it: one entry per round, appended, one line of the blind critic's scores per candidate, the state sheet line before the lock line, and the mobile pass line after it.

---

## v1 <- none (mockups/v1/night.png)

Change: round 1, four images from `layout/wire.png` and `refs/observatory-dome.jpg`: the control plate from `prompts/v1-control.md` (not scored) plus three candidates on the declared light axis, `dusk`, `night`, and `darkroom` (`prompts/v1-<value>.md`); `night` has the highest total, and the user kept it.
Why: light decides legibility on a screen watched all shift; `darkroom` was too dark to read the services list and `dusk` drifted toward the control's navy. Night against the control plate: identity, warm black, brass, and star white instead of navy and cyan; composition, one bright star-chart band where the control has a KPI row over equal cards; typography, engraved-scale numerals in sentence case where the control has one neutral sans at every size. Lowest score of `night`, legibility 3: star points sit behind the latency column.
Score dusk (1-5): identity 3 · layout 5 · legibility 4 · buildability 4 · originality 3
Score night (1-5): identity 4 · layout 5 · legibility 3 · buildability 4 · originality 4
Score darkroom (1-5): identity 4 · layout 5 · legibility 2 · buildability 4 · originality 4

## v2 <- from v1 (mockups/v2/night-a.png)

Change: the star field continues behind the services list and the incidents panel as an art layer, so the concept reaches the left third (three candidates, `night-a` to `night-c`; `night-a` has the highest total).
Why: the critic's identity evidence for v1 was "the services list reads like any data table; the concept lives only in the center".
Score night-a (1-5): identity 5 · layout 4 · legibility 2 · buildability 2 · originality 5
Score night-b (1-5): identity 4 · layout 5 · legibility 2 · buildability 2 · originality 4
Score night-c (1-5): identity 5 · layout 3 · legibility 2 · buildability 2 · originality 5

## v3 <- from v1 (mockups/v3/night-b.png)

Change: stars and glow confined to the service map; every panel that holds text gets a matte oiled-steel surface with nothing behind it (three candidates, `night-a` to `night-c`; `night-b` has the highest total).
Why: v2 was rejected: stars behind the numbers (legibility 2 in every image), the sort control missing from the services list in two of three images (layout 4 and 3), and art under a live, scrolling list that would have to move with every scroll and update (buildability 2). Identity rose only by putting art under the interface, so this round edits from v1, whose only score below 4 was legibility, caused by the same stars behind text.
Score night-a (1-5): identity 4 · layout 5 · legibility 4 · buildability 4 · originality 4
Score night-b (1-5): identity 4 · layout 5 · legibility 5 · buildability 4 · originality 4
Score night-c (1-5): identity 3 · layout 5 · legibility 5 · buildability 4 · originality 3

States: mockups/states/sheet.png (from v3, mockups/v3/night-b.png; sidecar mockups/states/sheet.json), unscored

APPROVED: v3 (mockups/v3/night-b.png; sidecar mockups/v3/night-b.json) -> mockups/APPROVED.png, chosen by the user on 2026-11-12

Mobile: mockups/mobile/phone.png (from v3, the lock; sidecar mockups/mobile/phone.json), unscored
