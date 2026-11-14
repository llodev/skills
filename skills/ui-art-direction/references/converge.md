# Phase 3 — Converge

Turn the Phase 2 board into one approved image, in controlled rounds, scored by someone who did not make it. Output: `lineage.md`, the critic's replies, a state sheet, `mockups/APPROVED.*` (the design lock; for a site, one lock file per section), and the mobile pass. Batch sizes and the cost gate are in `SKILL.md`.

## Files of a round

Round N lives in `mockups/vN/`: the candidates `mock-1.png`, `mock-2.png`, and so on, their sidecars, `board.png`, and `critic.md`, the critic's reply saved verbatim. `lineage.md` holds the numbers; `critic.md` holds the evidence. In round 1 the candidates follow the order of the values on the `Round-1 axis:` line of `dna.md` (`prompts/v1-<value>.md` makes `mock-<n>.png`), and the control plate is `mockups/v1/control.<ext>` from `prompts/control.md`. A later round has one prompt, `prompts/vN.md`, and reuses the round-1 control plate; it is never regenerated.

## Each round, in order

1. **Score blind.** Send the round's candidates to the blind critic (contract below) and save its reply as `mockups/vN/critic.md`. Round 1 is the Phase 2 round: the user saw its board unscored, and this is its first score.
2. **Show and ask.** Show the user every candidate with its scores, the failed ones included, and ask for a pick. A pick or leaning given at the Phase 2 hand-off sits on the `Open decisions` line of `STATUS.md` as a leaning, not as approval: the binding pick comes now, after the scores. Rewrite `STATUS.md` (`Phase: 3 - Converge`, `Approved: none`, `Next step:` the pick awaited, naming `design/<slug>/mockups/vN/board.png`) and wait.
3. **Log.** Once the user answers, append the round's entry to `lineage.md` (below).
4. **Check the stop rules** (below). A passing pick goes to the design lock.
5. **Next round.** Choose the one change, write `prompts/vN.md`, generate, make the board, and go back to step 1.

## Rounds

1. **One change per round.** Palette, OR lighting, OR density, OR one component. Two changes in one round and you cannot tell which one helped. The first round varies exactly one axis: the one Phase 1 recorded on the `Round-1 axis:` line of `dna.md`, with its values, which the Phase 2 prompts apply. `Change:` names it.
2. **Which change.** Lift the lowest criterion of the version you edit from; when several criteria tie for lowest, lift the one listed first in the rubric. When the user picks a passing candidate and still wants something changed, the change is the user's words, logged as `Change:`. When the user picks nothing, apply the rule above to the round's best version and say so.
3. **Edit from the best version.** The best version of a round is the candidate with the highest total of the critic's five scores; a tie goes to the higher identity score (the rubric's first criterion), then to the lowest-numbered file. When the user picks another candidate, from this round or an earlier one, the next round edits from the user's pick. Pass that image as Image 1 and the layout lock as Image 2, and describe only the delta. Do not re-prompt from scratch: it re-rolls everything that already works.

   ```
   Image 1 is the current best version. Keep everything: layout, text, palette, components, lighting.
   Image 2 is the layout lock: keep its regions and proportions; its gray color and labels are not part of the design.
   Change only: <the one change, concrete: "panel borders become 1px warm-gold hairlines">.
   ```

   A later round is two or three variants of that one change, at most three; the control plate is not regenerated, so it does not count. Make a board per round with the parent first. Native and assisted mode use the same prompt and references in the same order and write the sidecar by hand ([`modes-and-models.md`](modes-and-models.md) section 5).

   ```bash
   python3 scripts/generate.py --provider gemini --prompt design/<slug>/prompts/v2.md \
     --ref design/<slug>/mockups/v1/mock-2.png --ref design/<slug>/layout/wire.png \
     --aspect 16:9 --n 3 --out design/<slug>/mockups/v2/mock.png
   python3 scripts/board.py design/<slug>/mockups/v1/mock-2.png design/<slug>/mockups/v2/mock-1.png \
     design/<slug>/mockups/v2/mock-2.png design/<slug>/mockups/v2/mock-3.png \
     --out design/<slug>/mockups/v2/board.png --labels parent,mock-1,mock-2,mock-3
   ```

4. **Recombine** when two versions each won something: "layout and panels from image 1, lighting and central visual from image 2". A recombination is that round's one change.
5. Show every result to the user, the bad ones included. Hiding failed generations hides what the concept cannot do.

## The rubric

Score 1 to 5. A version passes only when **all five are at least 4**.

| Criterion       | 5 means                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | The concept line is recognizable at a glance                                                                                                                        |
| Layout fidelity | Every region and function from Phase 0 is present, in the locked arrangement                                                                                        |
| Legibility      | Text and data read at real size; contrast holds on every surface                                                                                                    |
| Buildability    | Art versus interface is obvious; every element can take one medium (CSS, SVG, image, video, canvas or WebGL, 3D); evidence names the hardest element and its medium |
| Originality     | Clearly distant from the control plate; the differences can be named                                                                                                |

## Blind-critic brief (contract)

The author does not grade their own work. Each round's candidates go to a fresh agent with no history of the run: spawn a fresh general-purpose subagent that can view images and starts empty, never a fork or a resumed session that carries this run. Copy its inputs into a temporary folder with neutral names (`brief.md`, `mock-1.png`, `baseline.png`, `layout-lock.png`) and hand over that folder, so no sidecar `.json` or prompt sits beside the images. In a fresh chat, attach them in the order listed below. Give one instruction: "Score each candidate with this rubric, in the output shape below; every score needs evidence you can point at in the image." The control plate is a yardstick and is not scored.

**Inputs, and nothing else:**

1. `brief.md`, with its `Concept:` line: identity is judged against that line, which Phase 1 copies there because the critic never sees `dna.md`. Layout fidelity is judged against the regions and functions it lists. A brief without its regions or its `Concept:` line is a defect: fix it first.
2. The candidate image or images, by file name.
3. The rubric table above, verbatim.
4. The control plate, labeled exactly "the generic baseline", so originality has a yardstick.
5. The layout image the prompts used, labeled exactly "the layout lock", so layout fidelity checks the arrangement as well as the brief's list: `layout/wire.png`; on a reskin, the skeleton render or the running app's screenshot; for a storyboard frame, that section's wireframe.

**Never send** `lineage.md`, `dna.md`, prompts, sidecars, reference images from `refs/`, earlier scores, or the author's notes or preferences. The critic is not told which version the author likes.

**Output, one block per image, in this shape and order:**

```
<file name>
identity: <1-5> | <one line of evidence: what in the image shows it>
layout fidelity: <1-5> | <evidence: region or function present, missing, or moved>
legibility: <1-5> | <evidence: the weakest text or data and where it is>
buildability: <1-5> | <evidence: the element hardest to build and its likely medium>
originality: <1-5> | <evidence: what differs from the generic baseline, or what does not>
verdict: pass | fail (lowest: <criterion>)
```

Evidence points at something visible ("sidebar labels are 9px gray on gray, top left"), never at taste ("feels a bit off"). A score without evidence is discarded and the critic is asked again, once; asking again generates no image, so it is not a retry loop under the cost gate. A second reply without evidence goes to the user.

**Hosts without subagents.** Paste the same brief and inputs into a fresh chat (another assistant or a new session) and save the reply as `critic.md`. If that is impossible, run a self-pass: score each criterion from the image and the brief before rereading `lineage.md`, write the evidence line first and the number second, and mark the score `(self-pass)`. A self-pass is weaker than a blind score; tell the user so when you present it.

## `lineage.md`

One entry per round, appended after the user answers, never edited. `Score` holds the critic's numbers, not the author's, one line per candidate in file order; `Critic:` cites the reply that holds the evidence. The heading names the parent version and, in parentheses, the file the next round edits from: the round's best, or both when the user picked another (`(best by critic: mockups/v3/mock-2.png; user pick: mockups/v3/mock-1.png)`). A parent's edited file is the last one its own heading names. `Why:` names the criterion being lifted and the critic's evidence for it.

```
## v3  <- from v2  (mockups/v3/mock-2.png)
Change: warmer gold light; the orbits become a route with data points
Why: lifts legibility, v2's lowest (3): the center competed with the chat panel
Critic: mockups/v3/critic.md
Score mock-1 (1-5): identity 4 · layout 5 · legibility 3 · buildability 4 · originality 4
Score mock-2 (1-5): identity 4 · layout 5 · legibility 4 · buildability 4 · originality 5
```

- **Round 1** is the Phase 2 round and the first round for the stop rules. Its heading has no parent: `## v1  <- none  (mockups/v1/<file>)`. `Change:` names the axis, its values, and the control plate `mockups/v1/control.<ext>` from `prompts/control.md`; the control plate is logged there and gets no `Score` line. `Why:` opens with `round 1: no parent; axis = <value list>`.
- **State sheet and mobile pass** are not rounds. Each is one line appended after the entries, naming its parent version and its run's sidecar: `States: mockups/states/sheet.png (from v3, mockups/v3/mock-2.png; sidecar mockups/states/sheet.json), unscored` and `Mobile: mockups/mobile/<file> (from v3, the lock; sidecar mockups/mobile/<stem>.json), unscored`. One is scored with the rubric, and gets a `Score` line, only when it is a candidate for a lock; the user decides, and by default neither is.

A full three-round run with a rejected version is in `examples/lineage.md`.

## Stop rules

- **Pass:** all five scores at least 4 and the user picks it. Both are required; a passing score without the user's choice is not approval. When the user picks a candidate with a score under 4, it is not approved: the next round edits from that pick, and its one change lifts the pick's lowest criterion.
- **Stop and ask**, whichever fires first, counting round 1: five rounds have run; **no gain**, two rounds in a row where the lowest score of the round's best version does not rise above the round before (equal is no rise); or the **same criterion** is below 4 on the round's best version three rounds running. Stop, show the user the lineage, and ask. The default to propose after five rounds or no gain is a return to Phase 1 with a different concept: more rounds on a dead concept cost money and converge on the generic. After the same criterion fails three times, the change you keep making is the wrong lever: propose a different variable, or the brief if the failure is layout.

## The design lock

0. **State sheet, after a passing pick, before the lock.** Generate one state sheet from the user's passing pick ([`mockup-prompting.md`](mockup-prompting.md) section 10): one image, count stated and confirmed. Save it as `mockups/states/sheet.<ext>` with its sidecar and its prompt as `prompts/states.md`. Verify it with the checks of [`mockup-prompting.md`](mockup-prompting.md) section 6, plus: every empty and error message in it is the brief's text. Show it to the user; it does not go to the critic, and `lineage.md` logs it unscored. If the sheet exposes a flaw in the pick (a state the look cannot carry legibly, a function the states lose), the pick is not locked: log the flaw as the next round's `Change:` and run that round.
1. Copy the chosen file to `mockups/APPROVED.<ext>`. A run's sidecar is shared by all its images (`mock.json` for `mock-1.png` and `mock-2.png`; a single-image run such as round 1's has `mock-1.json`), so the sidecar stays in `mockups/vN/` and the lock line cites it with the chosen image's file name. **For a site,** the hero is `mockups/APPROVED.<ext>` and each storyboard frame `S<N>` is copied to `mockups/APPROVED-s<N>.<ext>`, its lock line citing its sidecar the same way. Every frame goes to the critic like a candidate, with its section's wireframe as the layout lock, and the critic adds one line for the whole board: `continuity: <1-5> | <evidence: what carries or breaks at which boundary>`. A continuity score below 4 sends the frames at that boundary back for a round.
2. Append to `lineage.md`, one line per lock file: `APPROVED: vN (mockups/vN/<file>; sidecar mockups/vN/<stem>.json) -> mockups/APPROVED.<ext>, chosen by the user on <date>`.
3. **Mobile pass, after the lock.** One round from the approved desktop ([`mockup-prompting.md`](mockup-prompting.md) section 11), image count stated and confirmed, when the brief names a mobile viewport. Results go in `mockups/mobile/`, named like a round's images (`mock-1.png`), with the prompt as `prompts/mobile.md`. Show them to the user; `lineage.md` logs each one unscored. When the user wants a mobile image as a lock, it goes to the critic like a candidate, with `layout/wire-mobile.png` as the layout lock (Phase 0 renders it with `python3 scripts/wireframe.py`; on a reskin, `layout/current-<screen>-mobile.png`), and gets its own lock line, `APPROVED: mobile (mockups/mobile/<file>; sidecar mockups/mobile/<stem>.json), chosen by the user on <date>`; the file is not copied.
4. Update `STATUS.md`: `Phase: 3 - Converge` done; `Approved:` every lock path, separated by `; ` (`design/<slug>/mockups/APPROVED.png; design/<slug>/mockups/mobile/mock-1.png`); `Next step:` Phase 4 if motion matters, else Phase 5, naming the lock; open decisions.

After the lock, nothing in the image changes without reopening Phase 3: a new round, a new blind score, a new lock line. "Just a small tweak" in Phase 5 or 6 is a silent redesign. The comp-in-hand route skips the blind score but still records the lock line, with the source named.

| Red flag                                          | Do instead                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| "Palette and lighting together saves a round"     | One change. Two rounds cost less than a lost signal                             |
| "My own scores are fine, the critic is overhead"  | Blind critic, or a labeled self-pass                                            |
| "The critic needs lineage for context"            | The context is the bias. Brief, images, rubric, control plate, layout lock only |
| "Tweak the approved image while writing the spec" | Reopen Phase 3                                                                  |

## Exit check

- [ ] Every round has a `lineage.md` entry with `Change`, `Why`, `Critic`, and the critic's scores, and its reply is saved as `mockups/vN/critic.md`.
- [ ] The approved version scores at least 4 on all five criteria, from a blind critic or a self-pass labeled as weaker, and the user chose it explicitly after seeing the scores.
- [ ] `mockups/APPROVED.*` exists (for a site, also one `APPROVED-s<N>.*` per storyboard frame, plus the continuity line), and `lineage.md` has a lock line for each, citing the source image and its sidecar.
- [ ] A state sheet from the passing pick was made before the lock in `mockups/states/` (one image, count confirmed) and logged, or the user declined it.
- [ ] When the brief names a mobile viewport, the mobile pass ran after the lock into `mockups/mobile/` (one round, count confirmed) and was logged, or the user declined it.
- [ ] `STATUS.md` names every lock path on `Approved:` and the next phase.
