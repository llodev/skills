# Phase 3 — Converge

Turn the Phase 2 board into one approved image, in controlled rounds, scored by someone who did not make it. Output: `lineage.md`, blind scores, a state sheet, `mockups/APPROVED.*` (the design lock; for a site, one lock file per section), and the mobile pass. Batch sizes and the cost gate are in `SKILL.md`.

## Rounds

1. **One change per round.** Palette, OR lighting, OR density, OR one component. Two changes in one round and you cannot tell which one helped. The first round varies exactly one declared axis from Phase 1 (mood, material, light, or density) and names it in `Change:`.
2. **Edit from the best version.** Pass the current best image as the first reference and describe only the delta. Do not re-prompt from scratch: it re-rolls everything that already works. The best version of a round is the candidate with the highest total of the critic's five scores; a tie goes to the higher identity score (the rubric's first criterion). When the user picks a different candidate, the next round edits from the user's pick.

   ```
   Image 1 is the current best version. Keep everything: layout, text, palette, components, lighting.
   Change only: <the one change, concrete: "panel borders become 1px warm-gold hairlines">.
   ```

3. **Recombine** when two versions each won something: "layout and panels from image 1, lighting and central visual from image 2". A recombination is that round's one change.
4. Show every result to the user, the bad ones included. Hiding failed generations hides what the concept cannot do.

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

The author does not grade their own work. Each round's candidates go to a fresh agent with no history of the run: a subagent that can view images and starts empty, never a fork or a resumed session that carries this run. Hand over the files as paths from the project root (or, in a fresh chat, attached in the order listed below) with one instruction: "Score each candidate with this rubric, in the output shape below; every score needs evidence you can point at in the image." The control plate is a yardstick and is not scored.

**Inputs, and nothing else:**

1. `brief.md` (layout fidelity is judged against the regions and functions it lists; a brief without its regions is a Phase 0 defect, fix it first).
2. The candidate image or images, by file name.
3. The rubric table above, verbatim.
4. The control plate, labeled exactly "the generic baseline", so originality has a yardstick.
5. The layout image the prompts used, labeled exactly "the layout lock", so layout fidelity checks the arrangement as well as the brief's list: `layout/wire.png`; on a reskin, the skeleton render or the running app's screenshot; for a storyboard frame, that section's wireframe.

**Never send** `lineage.md`, `dna.md`, prompts, reference images from `refs/`, earlier scores, or the author's notes or preferences. The critic is not told which version the author likes.

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

**Hosts without subagents.** Paste the same brief and inputs into a fresh chat (another assistant or a new session) and save the reply. If that is impossible, run a self-pass: score each criterion from the image and the brief before rereading `lineage.md`, write the evidence line first and the number second, and mark the score `(self-pass)`. A self-pass is weaker than a blind score; tell the user so when you present it.

## `lineage.md`

One entry per round, appended, never edited. `Score` holds the critic's numbers, not the author's. The heading names the version it edited from and the round's best candidate; a round with several candidates has one `Score <label>` line per candidate, in file order.

```
## v3  <- from v2  (mockups/v3/mock-2.png)
Change: warmer gold light; the orbits become a route with data points
Why: v2 read cold and the center competed with the chat panel
Score mock-1 (1-5): identity 4 · layout 5 · legibility 3 · buildability 4 · originality 4
Score mock-2 (1-5): identity 4 · layout 5 · legibility 3 · buildability 4 · originality 5
```

- **Round 1** is the Phase 2 round and the first round for the stop rules. Its heading has no parent: `## v1  <- none  (mockups/v1/<best file>)`. `Change:` names the declared axis, its values, and the control plate's prompt file; the control plate is logged there and gets no `Score` line.
- **State sheet and mobile pass** are not rounds. Each is one line appended after the entries, naming its parent version and its run's sidecar: `States: mockups/states/sheet.png (from v3, mockups/v3/mock-2.png; sidecar mockups/states/sheet.json), unscored` and `Mobile: mockups/mobile/<file> (from v3, the lock; sidecar mockups/mobile/<stem>.json), unscored`. One is scored with the rubric, and gets a `Score` line, only when it is a candidate for a lock; the user decides, and by default neither is.

A full three-round run with a rejected version is in `examples/lineage.md`.

## Stop rules

- **Pass:** all five scores at least 4 and the user picks it. Both are required; a passing score without the user's choice is not approval. When the user picks a candidate with a score under 4, it is not approved: the next round edits from that pick, and its one change targets the pick's lowest criterion.
- **No gain:** about five rounds where the lowest score of the round's best version does not rise. Stop iterating and go back to Phase 1 with a different concept. More rounds on a dead concept cost money and converge on the generic.
- **Same criterion fails three rounds running** (below 4 on the round's best version): the change you keep making is the wrong lever. Change a different variable, or go back to the brief if the failure is layout.

## The design lock

0. **State sheet, before the lock.** Generate one state sheet from the leading direction ([`mockup-prompting.md`](mockup-prompting.md) section 10): one image, count stated and confirmed. The leading direction is the user's pick when there is one, otherwise the best version of the latest round. Save it as `mockups/states/sheet.<ext>` with its sidecar and its prompt as `prompts/states.md`. Verify it with the checks of [`mockup-prompting.md`](mockup-prompting.md) section 6, plus: every empty and error message in it is the brief's text. Show it with the round; it does not go to the critic, and `lineage.md` logs it unscored.
1. Copy the chosen file to `mockups/APPROVED.<ext>`. A run's sidecar is shared by all its images (`mock.json` for `mock-1.png` and `mock-2.png`), so the sidecar stays in `mockups/vN/` and the lock line cites it with the chosen image's file name. **For a site,** the hero is `mockups/APPROVED.<ext>` and each storyboard frame `S<N>` is copied to `mockups/APPROVED-s<N>.<ext>`, its lock line citing its sidecar the same way. Every frame goes to the critic like a candidate, with its section's wireframe as the layout lock, and the critic adds one line for the whole board: `continuity: <1-5> | <evidence: what carries or breaks at which boundary>`. A continuity score below 4 sends the frames at that boundary back for a round.
2. Append to `lineage.md`, one line per lock file: `APPROVED: vN (mockups/vN/<file>; sidecar mockups/vN/<stem>.json) -> mockups/APPROVED.<ext>, chosen by the user on <date>`.
3. **Mobile pass, after the lock.** One round from the approved desktop ([`mockup-prompting.md`](mockup-prompting.md) section 11), image count stated and confirmed, when the brief names a mobile viewport. Results go in `mockups/mobile/`, named like a round's images, with the prompt as `prompts/mobile.md`. Show them to the user; `lineage.md` logs each one unscored. When the user wants a mobile image as a lock, it goes to the critic like a candidate (with `layout/wire-mobile.png` as the layout lock) and gets its own lock line, `APPROVED: mobile (mockups/mobile/<file>; sidecar mockups/mobile/<stem>.json), chosen by the user on <date>`; the file is not copied.
4. Update `STATUS.md`: phase 3 done, approved file, next step (Phase 4 if motion matters, else Phase 5), open decisions.

After the lock, nothing in the image changes without reopening Phase 3: a new round, a new blind score, a new lock line. "Just a small tweak" in Phase 5 or 6 is a silent redesign. The comp-in-hand route skips the blind score but still records the lock line, with the source named.

| Red flag                                          | Do instead                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| "Palette and lighting together saves a round"     | One change. Two rounds cost less than a lost signal                             |
| "My own scores are fine, the critic is overhead"  | Blind critic, or a labeled self-pass                                            |
| "The critic needs lineage for context"            | The context is the bias. Brief, images, rubric, control plate, layout lock only |
| "Tweak the approved image while writing the spec" | Reopen Phase 3                                                                  |

## Exit check

- [ ] Every round has a `lineage.md` entry with `Change`, `Why`, and the critic's scores.
- [ ] The approved version scores at least 4 on all five criteria, from a blind critic or a self-pass labeled as weaker, and the user chose it explicitly.
- [ ] `mockups/APPROVED.*` exists (for a site, also one `APPROVED-s<N>.*` per storyboard frame, plus the continuity line), and `lineage.md` has a lock line for each, citing the source image and its sidecar.
- [ ] A state sheet from the leading direction was made before the lock in `mockups/states/` (one image, count confirmed) and logged, or the user declined it.
- [ ] When the brief names a mobile viewport, the mobile pass ran after the lock into `mockups/mobile/` (one round, count confirmed) and was logged, or the user declined it.
- [ ] `STATUS.md` names the approved file and the next phase.
