# Example: Phase 3 lineage

> Example of Phase 3 in [`SKILL.md`](../SKILL.md), following [`converge.md`](../references/converge.md). Same fictional product as [`brief.md`](brief.md) and [`dna-card.md`](dna-card.md). Below the line is `design/service-overview/lineage.md` as the run leaves it: one entry per round, appended after the user answered, one line of the blind critic's scores per candidate with the critic's reply cited, the state sheet line before the lock line, and the mobile pass line after it.

---

## v1 <- none (mockups/v1/mock-2.png)

Change: round 1, four images from `layout/wire.png` and `refs/observatory-dome.jpg`: the control plate `mockups/v1/control.png` from `prompts/control.md` (not scored) plus three candidates on the light axis, `mock-1` dusk, `mock-2` night, `mock-3` darkroom (`prompts/v1-<value>.md`); `mock-2` has the highest total, and the user picked it after the scores.
Why: round 1: no parent; axis = light: dusk, night, darkroom. `mock-3` was too dark to read the services list and `mock-1` drifted toward the control's navy. Night against the control plate: identity, warm black, brass, and star white instead of navy and cyan; composition, one bright star-chart band where the control has a KPI row over equal cards; typography, engraved-scale numerals in sentence case where the control has one neutral sans at every size. Lowest score of `mock-2`, legibility 3: "star points sit behind the latency column".
Critic: mockups/v1/critic.md
Score mock-1 (1-5): identity 3 · layout 5 · legibility 4 · buildability 4 · originality 3
Score mock-2 (1-5): identity 4 · layout 5 · legibility 3 · buildability 4 · originality 4
Score mock-3 (1-5): identity 4 · layout 5 · legibility 2 · buildability 4 · originality 4

## v2 <- from v1 (best by critic: mockups/v2/mock-1.png; user pick: mockups/v1/mock-2.png)

Change: a soft dark halo behind every number; the star field stays everywhere (three variants, `mock-1` to `mock-3`).
Why: lifts legibility, v1's lowest (3), from the critic's evidence in `mockups/v1/critic.md`. `mock-1` and `mock-2` tie at 17; `mock-1` is best on the higher identity score. Every variant failed: stars still behind digits (legibility 3 or 2), and a halo per live number would have to move with every update (buildability 2). The user went back to v1's night.
Critic: mockups/v2/critic.md
Score mock-1 (1-5): identity 4 · layout 4 · legibility 3 · buildability 2 · originality 4
Score mock-2 (1-5): identity 3 · layout 5 · legibility 3 · buildability 2 · originality 4
Score mock-3 (1-5): identity 4 · layout 3 · legibility 2 · buildability 2 · originality 4

## v3 <- from v1 (mockups/v3/mock-2.png)

Change: stars and glow confined to the service map; every panel that holds text gets a matte oiled-steel surface with nothing behind it (three variants, `mock-1` to `mock-3`).
Why: lifts legibility, still the lowest of v1's `mock-2`, the user's pick; the halo of v2 was the wrong lever, so this round removes the art from behind the text instead (`mockups/v2/critic.md`: "the halos read as smudges over the latency column"). Kept `mock-2` against the control plate: identity, warm black, brass, and matte oiled steel instead of navy and cyan; composition, the star field held inside the service map where the control has a KPI row over equal cards; typography, engraved-scale numerals in sentence case where the control has one neutral sans at every size.
Critic: mockups/v3/critic.md
Score mock-1 (1-5): identity 4 · layout 5 · legibility 4 · buildability 4 · originality 4
Score mock-2 (1-5): identity 4 · layout 5 · legibility 5 · buildability 4 · originality 4
Score mock-3 (1-5): identity 3 · layout 5 · legibility 5 · buildability 4 · originality 3

States: mockups/states/sheet.png (from v3, mockups/v3/mock-2.png; sidecar mockups/states/sheet.json), unscored

APPROVED: v3 (mockups/v3/mock-2.png; sidecar mockups/v3/mock.json) -> mockups/APPROVED.png, chosen by the user on 2026-11-12

Mobile: mockups/mobile/mock-1.png (from v3, the lock; sidecar mockups/mobile/mock-1.json), unscored
