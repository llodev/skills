# Route — reskin

Goal: a new visual identity for an app that already works, without breaking it. This file runs with Phase 0 and before Phase 1; Phases 1 to 7 then run with the constraints below. Function is fixed down to the ids.

Phase 0 on this route, in order: name the slug after the app's folder (`notes-app`), protect the original (section 4), write the brief and `STATUS.md` as usual, capture the running app as the layout lock (section 2; the wireframe step is skipped, no `wire.json`), write the inventory (section 1), then run the baseline tests (section 5). Phase 0 ends only when the baseline is recorded.

## 1. Inventory, before any image

Add an inventory section to `brief.md`, in this order:

1. **Routes** in scope: URL and screen name.
2. **Components** per screen, with their file paths. An app without a component library has none: list its pages (HTML files or templates) and stylesheets per screen, and the DOM groups that act as components, each with its selector (`.note` in `style.css`). Wherever this file says component and variant, read selector and CSS rule.
3. **States** each component already has: empty, loading, error, hover, focus, disabled, selected.
4. **Functions that cannot disappear**: each user action and how to trigger it ("add a note: type in `#note-input`, press Enter").
5. **Hooks the code relies on**: ids, classes read by scripts, data attributes, test selectors, CSS rules the logic depends on (such as `[hidden] { display: none; }`), and markup that a script builds (note cards rendered in script). Read logic files to find them; never edit them. Logic files are the scripts, and in an HTML file with an inline script, that script block.
6. **Tests**: the command that runs them. The brief's standard sections have no place for it, so add a `Tests` heading to `brief.md` (section 5 below fills it).
7. **Dependencies**: what the new look needs from the user because it would mean editing logic, such as an `aria-label` on a button a script builds (section 3).

## 2. The running app is the layout reference

- Capture each target screen at the target viewport into `layout/current-<screen>.png`, as [`capture-and-checks.md`](capture-and-checks.md) says (a plain HTML app is served with `python3 -m http.server` from its folder). `<screen>` is the route's name in the inventory, `index` for a single page. That image is the layout lock; Phase 0 writes no wireframe on this route.
- Capture the populated state: sample data seeded through the app's own UI (typed in, or scripted with Playwright) or its storage (a `localStorage` entry set before load), never an empty screen unless the brief targets it. Log the seed under the `Tests` heading with the baseline.
- When the brief names a mobile viewport, also capture `layout/current-<screen>-mobile.png` at that width: it is the mobile layout lock, in place of `layout/wire-mobile.png`.
- Use the screenshot. Switch to the skeleton render (one of the paths in [`references/brief-and-layout.md`](brief-and-layout.md) section 3.2) only when the Phase 2 control plate comes back as the old look, which shows the old styling dominates the model's output; then rerun round 1 on the skeleton, its count confirmed. Do not write your own capture tool.
- In every Phase 2 prompt, state the screenshot's role and write this line, with the image number the prompt uses: **"Keep the exact information architecture and components of image 2; restyle only."** The concept reference carries identity only.
- The information architecture is frozen. A mockup that adds, drops, merges, or reorders an element fails layout fidelity in [`references/converge.md`](converge.md).

## 3. Map every new element to an existing component

In Phase 5, `spec/components.md` gets one row per element of the approved mockup:

| Mockup element | Existing component (file)     | New look             | Change kind    |
| -------------- | ----------------------------- | -------------------- | -------------- |
| note card      | `NoteItem`                    | paper card, hairline | token, variant |
| note card      | `.note` (`style.css`), no lib | paper card, hairline | token, rule    |
| page backdrop  | none                          | painted plate        | art layer      |

Change kind is one of: token, variant (in a plain app, a CSS rule on existing selectors), art layer, markup for accessibility. When the markup a change needs is built in script, do not edit the script: reach it through existing selectors, and record the missing markup (an `aria-label` on a script-built button) under the inventory's `Dependencies` heading for the user. An element with no existing component is either art or a mockup error to fix in the image. It is never a new feature.

## 4. Change the theme, not the logic

The diff contains only token files and theme config (linking a new stylesheet or loading web fonts counts as theme config: a `<link>` or `@import`), component styles and variants, the art assets and the markup slot that holds them, and markup changes for accessibility (`aria-label`, roles, labels, focus order).

Never in the diff: logic files (handlers, state, data fetching, routing), a renamed or removed id, class, or data attribute from the inventory, changed copy the brief did not ask for.

What a good reskin looks like: the app's script is byte-identical afterwards, every id is kept, the CSS keeps the rules the logic relies on, and the markup changed only to add `aria-label`s. Hold every reskin to that.

- **Restyle in place.** Edit the existing stylesheet's rules, keeping every rule the logic relies on (`[hidden]`, state classes). Tokens go in a new `tokens.css` linked before that stylesheet; art files go in an `assets/` folder beside it.
- **Art slot.** A CSS background on an existing element first; a new element only when the layout needs one, with an id no other element uses.

Protect the original first, before any other file is written. In a git repo, work on a branch `reskin/<slug>` and check with `git diff --stat` against the branch point: no logic file listed (`design/` is expected). Outside a git repo, copy the app to the backup first, `rsync -a --exclude design/ ./ design/<slug>/backup/` from the project root (or the `cp` equivalent that skips `design/`), and check from the project root with `diff -rq -x design design/<slug>/backup .`. Markup and style files listed as changed are expected; no script may be listed. Prove each script byte-identical by checksum: `shasum -a 256 <script>` at the baseline and after, both under the `Tests` heading; for an inline script, extract the block to a temporary file first.

| Thought                                     | Reality                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| "This handler would be cleaner if…"         | Out of scope. Tell the user; do not change it.                       |
| "Rename the class to match the new design." | Ids and classes are the contract with the code and the tests.        |
| "The new look needs one more panel."        | The architecture is frozen. Take it back to the brief with the user. |

## 5. Tests before and after

Run the existing tests before the first change and record the result in `brief.md` under the `Tests` heading: date, command, result. With no suite, the command is `no suite` and the result is a walk table: one row per inventoried function, pass or fail. Walk it with the project's test runner if it has one, else with Playwright through `npx` after asking the user (a dependency), else as a checklist the user ticks; after the reskin the same walk must give the same pass or fail on every row. A suite that is already red, or a walk row that fails at the baseline, means stop and tell the user: you cannot show you broke nothing. A red result is the only test result that also goes into `STATUS.md`, on its `Open decisions` line; no other `STATUS.md` line carries test results. Run the tests again after the reskin and record the after result under the same heading; it must match. Then walk every function in the inventory by hand. An existing visual-regression suite is expected to fail on the new look; update its baselines only after the user approves.

## 6. Before, after, mockup

```
P=design/<slug>
python3 scripts/board.py $P/layout/current-<screen>.png $P/qa/screenshot-01.png $P/mockups/APPROVED.<ext> \
  --out $P/qa/before-after-mockup.png --labels before,after,mockup
python3 scripts/compare.py $P/layout/current-<screen>.png $P/qa/screenshot-01.png --out $P/qa/layout-drift-01.png
```

The board is what the user approves. The second command uses the old screen as reference: the look should differ everywhere, so read its tile crops for moved or missing elements, not its scores. Fidelity against the mockup runs as in Phase 7.

## Exit check

- [ ] The inventory (routes, components, states, functions, hooks, tests, dependencies) and the baseline test result are in `brief.md` before Phase 1.
- [ ] The layout reference is the running app's screenshot or its skeleton render, and every image prompt carries the restyle-only line.
- [ ] Every element of the approved mockup maps to an existing component or to the art layer.
- [ ] The original was protected first (branch `reskin/<slug>`, or `design/<slug>/backup/` outside git), and the diff against it has no logic file; inventory ids and classes are unchanged; markup changes are accessibility or art only.
- [ ] Tests give the same result before and after, and every inventoried function works.
- [ ] `qa/before-after-mockup.png` exists and the user has seen it.
