# ui-art-direction Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution here deviates from the skill defaults in two ways, both on purpose: no task commits (Global Constraints), and no per-task reviewer for content tasks (Execution model).

**Goal:** Package the untracked Portuguese study `skills/image-first-ui-design` as `@llodev/ui-art-direction` plus the `@llodev/ui` meta-package and a family study, on branch `ui-art-direction-v0.1.0`, ready for a `0.0.0` to `0.1.0` minor release.

**Architecture:** One English `SKILL.md` of about 200 lines routes eight phases to ten reference files, two anti-pattern files, and six examples. Six small Python scripts (Pillow required) replace the study's `forge.py`. The package is wired into the marketplace, catalog, roadmap, and release gates like `bi-dashboard`. The behavior is checked once against a no-skill baseline.

**Tech Stack:** Markdown skills, Python 3.10+ with Pillow (numpy and ffmpeg optional), `unittest`, pnpm workspaces, Changesets, Node >=24.

**Spec:** `docs/specs/2026-11-14-ui-art-direction-family-design.md` (call it "the spec"). Executors read it before any task. Section numbers below refer to it.

## Global Constraints

- Names, exactly: folder, frontmatter `name`, marketplace plugin `ui-art-direction`; package `@llodev/ui-art-direction`; meta `@llodev/ui` at `packages/ui`.
- On this branch `package.json` `version`, `metadata.version`, and the marketplace plugin `version` are `0.0.0`. Meta `peerDependencies["@llodev/ui-art-direction"]` is `^0.1.0`, `devDependencies` is `workspace:*`.
- Skill `package.json` `files`: `SKILL.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `anti-patterns`, `references`, `examples`, `scripts`, `docs`. `tests/` is not published. `engines.node` `>=24`, MIT, `LICENSE` copied from the repo root.
- Published content is English. Portuguese and Spanish live only in `docs/i18n/` of the skill and in the root `docs/i18n/`.
- Published `.md`, `.json`, `.yml`, `.txt` files must not contain: `CLAUDE.md`, `AGENTS.md`, `docs/specs`, `docs/roadmap`, `this repo`, `our repo`, `apps/api/src`, `apps/web/src`, `.superpowers/`, `sandbox/`. The `.py` files follow the same rule.
- No image or video model ID in any published file. Family names without a version are allowed (Veo, Kling, Seedance, Seedream, GPT Image, Nano Banana, Flux Kontext, Runway, Wan).
- Scripts: `python3 scripts/<name>.py`, never a bare path, in every prose mention. Pillow required; numpy, ffmpeg, provider SDKs imported or called lazily with a clear message. No network except `generate.py`. Keys only from the environment, never printed or written.
- Frontmatter description is 200–1200 characters. `SKILL.md` is about 200 lines (hard cap 240). Reference sizes follow spec 7.2.
- Branch `ui-art-direction-v0.1.0`, already created from `main` and separate from the `arc-family-study` branch (pull request #126). No `git commit`, `git push`, pull request, or `npm publish` by any task (spec D12). The maintainer commits.
- Do not edit: `AGENTS.md`, any other skill, `.prettierignore`, `skills-lock.json`, `tarball-snapshot.json`, size-limit config, `docs/studies/arc/` (not in this branch's tree; it lives on `arc-family-study`), marketplace `metadata.version` (stays `1.12.0`).
- Nothing tracked links into `docs/studies/` (spec section 11).
- Run Python with `PYTHONDONTWRITEBYTECODE=1` so no `__pycache__` lands in a published directory.
- Scratch directory `$SCRATCH` = `/private/tmp/claude-501/-Users-lloli-Workspace-studies/df2e96e6-2e83-4ed8-ac36-04298a0dedf2/scratchpad/ui-art-direction`. Persona sheets, the fixture app, transcripts, and the lint script live there and are never committed or published.
- Repo root for all commands: `/Users/lloli/Workspace/studies/projects/skills`.

## Execution model

- Implementers are opus. Judges and reviewers are opus. Test subjects for the behavioral runs are sonnet, the same model with and without the skill, so the two columns compare.
- Content tasks (5–9, 12) have no per-task reviewer. Their gate is the mechanical lint of Task 13 and the whole-branch review of Task 17. Script tasks (2–4) are gated by their own tests.
- Waves: **A** Tasks 1, 2, 10, 12 in parallel. **B** Tasks 3, 4, 5, 6, 7, 8 in parallel after A (5–8 need Task 1's findings; 3–4 need Task 2's `_common.py`). **C** Task 9 (needs Task 2). **D** Tasks 11, 13, 15, 14. **E** Tasks 16, 17. No two parallel tasks write the same file.
- Every brief carries: the spec path, this plan's Global Constraints, the task's Files and Interfaces, and the study coverage matrix row it owns.

## Pre-mortem (what the briefs must name)

- **Removes, not only adds:** the old folder and the `forge.py` text go away. The matrix below proves every study element has a new home before Task 14 deletes anything.
- **Config defaults:** the real `files` list publishes `scripts/`, so a stray `__pycache__` ships. Verified by `npm pack --dry-run` in Task 14.
- **Order of side effects:** the only destructive step (removing the old folder) happens after a checksum-verified copy and before the gates, never earlier.
- **Parallel writers:** disjoint files only. `pnpm-lock.yaml`, `marketplace.json`, root READMEs, and the roadmap are touched by Task 11 alone.
- **Cross-file contracts:** reference file names, phase names, and the script CLI table below are fixed here. A writer that needs a different name stops and reports.

## Study coverage matrix

Source: `skills/image-first-ui-design/SKILL.md` until Task 14. Each row names the file that must carry the content.

| Study element                                                             | Destination                                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Two organizing principles; "function fixed, form free"                    | `SKILL.md` four rules                                               |
| Action map and typical flows                                              | `SKILL.md` phase table and routes                                   |
| Capabilities and modes, model choice, costs                               | `references/modes-and-models.md`, cost gate in `SKILL.md`           |
| Artifact folder tree                                                      | `SKILL.md` pack folder, `references/brief-and-layout.md`            |
| A0 brief and layout lock                                                  | `references/brief-and-layout.md`                                    |
| A1 references and DNA card                                                | `references/concept-and-dna.md`, `examples/dna-card.md`             |
| A2 prompt template and rules                                              | `references/mockup-prompting.md`                                    |
| A3 one-change rule, recombine, `lineage.md`, five-criterion rubric        | `references/converge.md`, `examples/lineage.md`                     |
| A4 video prompt and `motion.md` notes                                     | `references/motion.md`, `examples/motion-spec.md`                   |
| A5 tokens, type, shape and depth, components, assets, motion              | `references/build-spec.md`                                          |
| A6 layers, delegation prompt, recipes (glass, hairlines, video bg, grain) | `references/implementation.md`                                      |
| A6 fidelity loop                                                          | `references/fidelity-and-lock.md`                                   |
| A7 reskin steps                                                           | `references/reskin.md`                                              |
| General rules (IP, traceability, honesty, cost, accessibility)            | `SKILL.md` rules, `anti-patterns/process.md`, `modes-and-models.md` |
| Delivery checklist                                                        | end of `references/fidelity-and-lock.md`                            |
| `forge.py` subcommands wireframe, board, palette, compare, generate       | `scripts/` Tasks 2–4                                                |

## Script CLI contract (fixed, used by Tasks 2–9)

| Script         | Command                                                                                                                                     | Stdout                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `wireframe.py` | `python3 scripts/wireframe.py SPEC.json --out WIRE.png`                                                                                     | output path                                                                                  |
| `board.py`     | `python3 scripts/board.py IMG [IMG ...] --out BOARD.png [--labels a,b,c] [--cols N] [--width PX]`                                           | output path                                                                                  |
| `palette.py`   | `python3 scripts/palette.py IMAGE [--colors N] [--out tokens.json] [--swatch SWATCH.png]`                                                   | JSON `{roles, contrast, notes}`; with `--out` also writes the full JSON and a sibling `.css` |
| `compare.py`   | `python3 scripts/compare.py REFERENCE IMPLEMENTATION --out SHEET.png [--grid 4x3] [--worst 3] [--report REPORT.json]`                       | the report JSON (section "Task 3")                                                           |
| `frames.py`    | `python3 scripts/frames.py VIDEO --out-dir DIR [--count 8]`                                                                                 | frame paths, then the contact sheet path `DIR/sheet.png`                                     |
| `generate.py`  | `python3 scripts/generate.py --provider {gemini,openai} --model ID --prompt FILE_OR_TEXT [--ref IMG ...] [--aspect 16:9] [--n 1] --out PNG` | output paths; `--model` may come from env `IMAGE_MODEL`                                      |

All scripts: `--help` works, human messages go to stderr, exit code `0` on success, `2` on bad input or a missing optional dependency, `1` on a runtime failure.

## Review Focus

Failure modes the spec implies and no sibling task would otherwise test. Each has a test or check in the task named.

- A `wire.json` with a box that runs past 100%, a box with no label, or an empty `boxes` list. Expected: clamped to the frame, no crash (Task 2).
- A palette source that is one flat color or nearly monochrome. Expected: no crash, `notes` explains the low confidence, reported contrast equals recomputed contrast (Task 2).
- A screenshot whose size or aspect differs from the mockup. Expected: resized to the reference size without cropping, `resized` and `aspect_mismatch` reported, never silent (Task 3).
- A provider that returns no image (safety block, text-only reply). Expected: exit `1`, nothing written, no sidecar, no key in any output (Task 4).
- A reference file or `SKILL.md` that cites a script flag or a file that does not exist. Expected: caught before the review (Task 13).

---

### Task 1: Baseline runs without the skill (RED)

**Files:**

- Create (scratch): `$SCRATCH/persona-1.md`, `persona-2.md`, `persona-3.md`, `$SCRATCH/fixture-app/{index.html,styles.css,app.js}`, `$SCRATCH/baseline/{run-1,run-2,run-3}/` (transcript and any files the subject wrote), `$SCRATCH/baseline-results.md`

**Interfaces:**

- Consumes: spec section 12.
- Produces: `$SCRATCH/baseline-results.md` with, per scenario, the verbatim excerpts that show each failed predicate, a predicate table (the eight predicates of spec 12, pass or fail), and a list "what the skill must say" naming each observed failure and the rationalization behind it, in the subject's words.

- [ ] **Step 1: Write the persona sheets.** Same text for baseline and with-skill runs. Each states: the request (scenarios 1–3 of spec 12, verbatim); "you have no image-generation tool; the user has an image app and can run prompts and bring images back"; answers pre-supplied (yes to a first round of up to four images, no to any video, scenario 3 brand direction "warm, tactile, editorial, not corporate"); "stop at the first point where you need the user to generate or attach images, or if you would otherwise write application code, say so and stop"; the subject's working directory is `$SCRATCH/baseline/run-N/` and it writes nowhere else.
- [ ] **Step 2: Build the scenario 3 fixture.** A static notes app with three working functions (add, delete, filter) and plain styling, in `$SCRATCH/fixture-app/`; copy it into `run-3/`.
- [ ] **Step 3: Dispatch three sonnet subjects in parallel, one per persona, with no skill and no mention of it.** Save each transcript.
- [ ] **Step 4: Dispatch one opus judge** with the three transcripts and the eight predicates. It returns the predicate table and quotes. It does not see the spec's intent, only the predicates.
- [ ] **Step 5: Write `baseline-results.md`.** Done when every failed predicate has a verbatim quote and a "must say" line.

### Task 2: Scripts `_common.py`, `wireframe.py`, `board.py`, `palette.py`

**Files:**

- Create: `skills/ui-art-direction/scripts/{_common.py,wireframe.py,board.py,palette.py}`
- Test: `skills/ui-art-direction/tests/{test_wireframe.py,test_board.py,test_palette.py}`

**Interfaces:**

- Consumes: the study's `forge.py` (embedded in `skills/image-first-ui-design/SKILL.md`, section "Anexo: forge.py") for the behavior of `wireframe`, `board`, `palette`.
- Produces (exact):

```python
# _common.py
def font(size: int): ...                          # truetype if found, else PIL default
def relative_luminance(rgb: tuple[int, int, int]) -> float: ...
def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float: ...
def hex_of(rgb: tuple[int, int, int]) -> str: ... # "#RRGGBB", uppercase
def write_sidecar(image_path, data: dict): ...    # <stem>.json beside the image, indent 2, ensure_ascii False; returns Path
# wireframe.py
def wrap_label(draw, label: str, font, max_width: float) -> list[str]: ...
def render_wireframe(spec: dict): ...             # returns a PIL Image
def main(argv: list[str] | None = None) -> int: ...
# board.py
def build_board(paths: list, labels: list[str] | None, cols: int | None, width: int): ...  # PIL Image
def main(argv: list[str] | None = None) -> int: ...
# palette.py
def analyze(image_path, colors: int = 24) -> dict: ...   # keys: source, swatches, roles, contrast, notes
def main(argv: list[str] | None = None) -> int: ...
```

Each test file starts with `sys.path.insert(0, <skill>/scripts)`. Run from the repo root: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/ui-art-direction/tests -v`.

- [ ] **Step 1: Write the failing tests** (names and the assertion each pins):
  - `test_wireframe_renders_every_box_at_spec_size`: output size equals `spec["size"]`, each box region differs from the page color.
  - `test_wrap_label_never_exceeds_max_width_except_single_long_word`.
  - `test_wireframe_survives_unlabeled_box_box_past_100_percent_and_empty_boxes`: no exception, image still has the spec size.
  - `test_board_handles_mixed_aspect_ratios_and_default_labels`: labels default to `v1..vN`.
  - `test_palette_picks_visible_accent`: synthetic image (dark page, light text block, gold block): `roles["accent"]` has contrast >= 3.0 against `roles["background"]` and differs from `roles["foreground"]`.
  - `test_palette_flags_monochrome_image`: `notes` is non-empty.
  - `test_palette_single_flat_color_does_not_crash`.
  - `test_palette_reported_contrast_matches_recomputed`: each entry equals `contrast()` of the two roles within 0.01.
  - `test_cli_missing_input_exits_2_with_message_on_stderr` for each script.
- [ ] **Step 2: Run the suite.** Expected: errors for missing modules.
- [ ] **Step 3: Implement the four modules.** Port the study's behavior faithfully (octree quantize, role heuristics, the low-confidence note, label wrapping). Fix what the tests expose (clamping, degenerate inputs). No new features.
- [ ] **Step 4: Run the suite.** Expected: all pass.

### Task 3: Scripts `compare.py` and `frames.py`

**Files:**

- Create: `skills/ui-art-direction/scripts/{compare.py,frames.py}`
- Test: `skills/ui-art-direction/tests/{test_compare.py,test_frames.py}`

**Interfaces:**

- Consumes: Task 2 `_common.font`, `board.build_board`.
- Produces (exact):

```python
# compare.py
def compare_images(reference, implementation, grid: tuple[int, int] = (4, 3),
                   worst: int = 3, use_numpy: bool | None = None) -> dict: ...
# {"method": "ssim" | "luminance-mae", "overall": float, "resized": bool,
#  "aspect_mismatch": bool,
#  "tiles": [{"col": int, "row": int, "box": [x0, y0, x1, y1], "score": float}],
#  "worst": [{"col": int, "row": int, "score": float}]}      # lowest first
def main(argv: list[str] | None = None) -> int: ...
# frames.py
def extract_frames(video, out_dir, count: int = 8) -> list: ...
def main(argv: list[str] | None = None) -> int: ...
```

Pinned behavior: scores are 0–1, higher is closer. SSIM runs on grayscale downscaled so the longer side is at most 1280, uniform 7-pixel window, `C1=(0.01*255)**2`, `C2=(0.03*255)**2`, used only when numpy imports and `use_numpy` is not `False`; otherwise `1 - mean(|a-b|)/255` and `method` says `luminance-mae`. The implementation image is resized to the reference size without cropping; `resized` is true if the size changed; `aspect_mismatch` is true if the aspect ratios differ by more than 2 percent. The sheet is reference, implementation, and a difference heat map side by side. The worst tiles are saved as `<out stem>-tile-<col>-<row>.png`, each showing the reference crop beside the implementation crop. `frames.py` takes frames at `(i + 0.5) / count` of the duration from `ffprobe`, and the contact sheet is `DIR/sheet.png`. If `ffmpeg` is not on the path it exits `2` with a message.

- [ ] **Step 1: Write the failing tests:**
  - `test_identical_images_score_one`: `overall >= 0.999`, every tile `>= 0.999`.
  - `test_altered_tile_is_the_worst`: paint a block inside tile (col 2, row 1) of a 4x3 grid; `worst[0]` is `(2, 1)`.
  - `test_method_is_ssim_with_numpy_and_mae_without`: `use_numpy=False` gives `luminance-mae`.
  - `test_size_mismatch_is_resized_and_reported`: half-size input gives `resized` true, no exception.
  - `test_aspect_mismatch_is_flagged`.
  - `test_cli_writes_sheet_and_worst_tile_crops_and_prints_json`.
  - `test_frames_without_ffmpeg_exits_2` (patch `shutil.which` to return `None`; runs everywhere).
  - `test_frames_extracts_count_frames` (skipped when `ffmpeg` is absent).
- [ ] **Step 2: Run the suite.** Expected: new tests fail.
- [ ] **Step 3: Implement `compare.py` and `frames.py` to the pinned behavior.**
- [ ] **Step 4: Run the suite.** Expected: all pass, `test_frames_extracts_count_frames` skipped on this machine (no `ffmpeg`).

### Task 4: Script `generate.py`

**Files:**

- Create: `skills/ui-art-direction/scripts/generate.py`
- Test: `skills/ui-art-direction/tests/test_generate.py`

**Interfaces:**

- Consumes: Task 2 `_common.write_sidecar`.
- Produces (exact):

```python
ADAPTERS: dict  # provider name -> Callable[[str, str, list, str, int], list[bytes]]  (model, prompt, refs, aspect, n)
def resolve_model(cli_model: str | None, env) -> str: ...   # SystemExit(2) if neither flag nor IMAGE_MODEL
def generate(provider: str, model: str, prompt: str, refs: list, aspect: str, n: int) -> list[bytes]: ...
def save_outputs(images: list[bytes], out, meta: dict) -> list: ...
def main(argv: list[str] | None = None) -> int: ...
```

Pinned behavior: no default model ID anywhere. The Gemini and OpenAI adapters are ported from the study with their SDK imports inside the adapter and a `pip install` hint on `ImportError` (exit `2`). The OpenAI size map is the study's. One output is written to `--out`; several to `<stem>-1<suffix>`, `<stem>-2<suffix>`. The sidecar holds `model`, `provider`, `aspect`, `refs`, `prompt`, `outputs`, `created_at` (UTC ISO) and nothing from the environment. `--n` above 4 prints a stderr line telling the agent to confirm with the user first (it does not block). The prompt argument is a path if the file exists, else literal text.

- [ ] **Step 1: Write the failing tests** (tests replace `ADAPTERS[...]` with fakes; no SDK, no network):
  - `test_resolve_model_prefers_flag_then_env_and_exits_2_with_docs_hint_when_missing`.
  - `test_no_image_returned_exits_1_and_writes_nothing`: no output file, no sidecar.
  - `test_secret_in_environment_never_reaches_sidecar_stdout_or_stderr`: set `GEMINI_API_KEY=SECRET123`.
  - `test_multiple_outputs_are_numbered_and_one_sidecar_written`.
  - `test_missing_reference_file_exits_2`.
  - `test_missing_sdk_exits_2_with_install_hint`.
- [ ] **Step 2: Run the suite.** Expected: new tests fail.
- [ ] **Step 3: Implement `generate.py`.**
- [ ] **Step 4: Run the suite.** Expected: all pass.

### Task 5: `SKILL.md`

**Files:**

- Create: `skills/ui-art-direction/SKILL.md`

**Interfaces:**

- Consumes: spec sections 5, 7.1, 9; `baseline-results.md`; the matrix; the script CLI table.
- Produces: the skill entry point. Headings, in order: `# Art direction before code`; opening paragraph; `## How to use this skill` (phase table of spec 5.2, then the routes table of spec 5.4, then the precedence line of spec 7.1); `## The four rules`; `## Modes and the cost gate`; `## The pack folder` (the compact tree of spec 5.5); one `## Phase N — <name>` per phase 0–7 with the `**MANDATORY — READ ENTIRE FILE**` and `**Do NOT load**` lines in the `bi-dashboard` style; `## When the work is going wrong` (red-flags table, below); `## References` (file and "load when" table, all ten references and both anti-pattern files).

- [ ] **Step 1: Write the file.** Frontmatter is the spec section 9 text; keep the triggers and exclusions, stay in 200–1200 characters. Form follows the failure type (writing-skills, "Match the form to the failure"): the failures from `baseline-results.md` that are discipline lapses under pressure (writing code because the user said "just build it", skipping the layout lock, asking for more than four images, grading one's own mockup) get a short prohibition and a row in the red-flags table (thought, reality), five rows at most. Shape failures get a positive contract (what the output contains, in order). The cost gate appears once.
- [ ] **Step 2: Check length and frontmatter.**

Run: `python3 -c "import re,sys;s=open('skills/ui-art-direction/SKILL.md').read();d=re.search(r'description: >-\n((?:  .*\n)+)',s).group(1);n=len(' '.join(x.strip() for x in d.splitlines()));print(n,len(s.splitlines()));assert 200<=n<=1200 and len(s.splitlines())<=240"`
Expected: prints the two numbers, no assertion error.

### Task 6: References for phases 0–2

**Files:**

- Create: `skills/ui-art-direction/references/{brief-and-layout.md,modes-and-models.md,concept-and-dna.md,mockup-prompting.md}`

**Interfaces:**

- Consumes: spec 7.2 rows for these four files (their "Must contain" lists and target lines), the matrix, `baseline-results.md`, the script CLI table.
- Produces: four files, each opening with its phase and closing with an exit check. `brief-and-layout.md` contains the skeleton-render recipe (CSS that neutralizes color, borders, and media on the running app, captured at the target size) and the `wire.json` format with its percent coordinates. `modes-and-models.md` contains the provenance sidecar fields of Task 4 and the rule that IDs are confirmed in provider docs and passed by flag or environment. `mockup-prompting.md` contains the study's prompt template translated, one sentence per reference image stating its role, the control-plate prompt, the storyboard rule for sites, the state sheet, and the mobile pass derived from the approved desktop.

- [ ] **Step 1: Write the four files.**
- [ ] **Step 2: Check sizes against spec 7.2 targets** with `wc -l`. A file outside its range by more than 20 percent is justified in the report.

### Task 7: References for phases 3–5

**Files:**

- Create: `skills/ui-art-direction/references/{converge.md,motion.md,build-spec.md}`

**Interfaces:**

- Consumes: spec 7.2 rows, 8.4, the matrix, `baseline-results.md`, the script CLI table.
- Produces: `converge.md` holds the five criteria (identity, layout fidelity, legibility, buildability, originality; all at least 4), the blind-critic brief written as a contract (inputs: `brief.md`, the image, the rubric, never `lineage.md`; output: one score and one line of evidence per criterion), the weaker self-pass for hosts without subagents, the stop rules, and the design lock. `motion.md` holds the image-to-video prompt contract, start and end frames for transitions, `python3 scripts/frames.py` usage, and the motion-spec reading. `build-spec.md` holds tokens with `python3 scripts/palette.py`, the buildability triage table (CSS, SVG, image, video, canvas or WebGL, 3D), the asset pipeline, and the DESIGN.md mapping.

- [ ] **Step 1: Read the current DESIGN.md specification** (`https://github.com/google-labs-code/design.md`, and the Stitch docs page for it) with WebFetch. Record in the report whether it was readable and which fields were mapped.
- [ ] **Step 2: Write the three files.** If the DESIGN.md spec was not readable, `build-spec.md` ships `tokens.json` and `tokens.css` and states that a DESIGN.md export is a follow-up (spec 8.4).
- [ ] **Step 3: Check sizes against spec 7.2.**

### Task 8: References for phases 6–7 and the reskin route

**Files:**

- Create: `skills/ui-art-direction/references/{implementation.md,fidelity-and-lock.md,reskin.md}`

**Interfaces:**

- Consumes: spec 7.2 rows, the matrix, `baseline-results.md`, the script CLI table, the `compare.py` report shape from Task 3.
- Produces: `implementation.md` holds the three layers, the delegation brief, the four recipes (frosted glass, luminous hairlines, video background, grain) with their CSS, deriving mobile and states from the lock, and accessibility and reduced-motion requirements. `fidelity-and-lock.md` holds deterministic capture (fixed viewport and scale, fonts loaded, animations disabled, live content masked, with a Playwright example), the loop with `python3 scripts/compare.py` reading `worst` tiles first, the ordering of fixes (layout, color and light, type, detail), the intentional-differences register, accessibility and performance checks on the real render, the visual-regression baseline, and the delivery checklist. Scores are advisory; the prose never presents a number as a pass.
- [ ] **Step 1: Write the three files.**
- [ ] **Step 2: Check sizes against spec 7.2.**

### Task 9: Anti-patterns and examples

**Files:**

- Create: `skills/ui-art-direction/anti-patterns/{generic-ai-look.md,process.md}`, `skills/ui-art-direction/examples/{brief.md,dna-card.md,lineage.md,motion-spec.md,storyboard.md,wire.json}`

**Interfaces:**

- Consumes: spec 7.3 and 7.4, `baseline-results.md`, Task 2 `wireframe.py`.
- Produces: anti-patterns in the numbered Symptom, Cause, Fix format of `skills/arc-decisions/anti-patterns/architecture.md`. `generic-ai-look.md` opens with the distance check before any list of tells. Examples use one fictional product throughout (an operations dashboard with a conversational panel) and one landing-page storyboard. `wire.json` is valid input for `wireframe.py`. `lineage.md` shows three rounds, one rejected, with scores.

- [ ] **Step 1: Write the files.**
- [ ] **Step 2: Verify `wire.json`.**

Run: `PYTHONDONTWRITEBYTECODE=1 python3 skills/ui-art-direction/scripts/wireframe.py skills/ui-art-direction/examples/wire.json --out $SCRATCH/wire-check.png`
Expected: prints the output path, exit 0.

### Task 10: Skill package files and meta-package

**Files:**

- Create: `skills/ui-art-direction/{package.json,LICENSE,CHANGELOG.md,README.md,docs/i18n/README.pt-BR.md,docs/i18n/README.es-ES.md}`, `packages/ui/{package.json,LICENSE,CHANGELOG.md,README.md}`

**Interfaces:**

- Consumes: spec 6 and 13; molds `skills/bi-dashboard/*` and `packages/bi/*`.
- Produces: skill `package.json` per spec 13 (description `Art-direct a UI in image models first, then build it in code and verify it against the mockup.`; keywords `agent-skill`, `ui`, `design`, `image-first`, `mockup`; `files` as in Global Constraints). `CHANGELOG.md` is the header `# @llodev/ui-art-direction` only. The README adds a Requirements section (Python 3.10+ and Pillow; optional numpy, ffmpeg, a provider SDK) and a Known limits section stating that Phases 3–7 are verified by script tests and a read-through, not by behavioral runs (spec 12). The meta `package.json` is the `packages/bi` one with `@llodev/ui`, description `Meta-package: installs the @llodev/ui-* family (image-first UI design).`, and the peer range of Global Constraints.
- [ ] **Step 1: Create the files from the molds.** Translations keep the structure of the English README line for line.
- [ ] **Step 2: Verify JSON and versions.**

Run: `node -e "const s=require('./skills/ui-art-direction/package.json'),m=require('./packages/ui/package.json');if(s.version!=='0.0.0'||m.peerDependencies['@llodev/ui-art-direction']!=='^0.1.0'||!s.files.includes('scripts'))process.exit(1)"`
Expected: exit 0.

### Task 11: Wiring (marketplace, catalog, roadmap, lockfile, changeset)

**Files:**

- Modify: `.claude-plugin/marketplace.json`, `README.md`, `docs/i18n/README.pt-BR.md`, `docs/i18n/README.es-ES.md`, `docs/roadmap.md`, `pnpm-lock.yaml`
- Create: `.changeset/ui-art-direction-first-release.md`

**Interfaces:**

- Consumes: spec 13 wiring list; Task 10 package files; the `bi-dashboard` entries as the mold.
- Produces: one marketplace plugin entry appended after the last one (`category: ai-tools`, `version: 0.0.0`, same description and keywords as the package). In all three READMEs: the catalog section `### @llodev/ui — image-first UI design skills` with the two-row table in the sibling format, the layout tree lines (`ui-art-direction/` after `bi-dashboard/`, `ui/` after `bi/`), and the prefix sentence gaining `ui-`. Roadmap: the opening sentence gains `ui-*`; section 9 gains a `ui-*` subsection after `arc-*` with the shipped member and the planned-members table (`ui-fidelity` High, `ui-motion` Medium, `ui-assets` Medium, `ui-reskin` Low), linking to nothing in `docs/studies/`. The changeset lists both packages as `minor`, headed `feat(ui-art-direction): first release of the ui-art-direction skill`, and its body states the Phase 3–7 verification limit.
- [ ] **Step 1: Make the edits.** Table columns keep their alignment; localized READMEs use `../../` relative links like their siblings.
- [ ] **Step 2: Update the lockfile.** Run `pnpm install --lockfile-only`. Expected: the diff of `pnpm-lock.yaml` adds only the two new importers. Any other hunk is reverted and reported.
- [ ] **Step 3: Check parity.** Run `node scripts/checks/marketplace-parity.mjs`. Expected: exit 0.

### Task 12: Family study `docs/studies/ui/`

**Files:**

- Create: `docs/studies/ui/{README.md,ui-fidelity.md,ui-motion.md,ui-reskin.md,ui-assets.md}`

**Interfaces:**

- Consumes: spec section 10; the arc study as the format, read with `git show arc-family-study:docs/studies/arc/README.md` and `git show arc-family-study:docs/studies/arc/arc-observability.md` (the folder is not in this branch's tree).
- Produces: the README (family goal, members table, overlap map with the shrink rule, suggested build order, open questions, and one line `Origin SHA-256: PENDING`, which Task 14 fills). Each member study is at most 60 lines in the arc format: Responsibility and non-goals, Triggers, Core concepts, Workflow table (`# | Input | Action | Output`), Actions and artifacts, Expert judgments. English only. No file outside `docs/studies/` links here.
- [ ] **Step 1: Write the five files.**
- [ ] **Step 2: Check line counts** (`wc -l`): member studies at most 60.

### Task 13: Mechanical consistency lint (scratch, not committed)

**Files:**

- Create (scratch): `$SCRATCH/lint_ui.py`

**Interfaces:**

- Consumes: everything published under `skills/ui-art-direction/` and `packages/ui/`.
- Produces: a script that exits non-zero and prints `file:line: message` for each of: a cited `references/*.md`, `anti-patterns/*.md`, `examples/*`, or `scripts/*.py` that does not exist; a `python3 scripts/<name>.py` flag that `--help` of that script does not list; a banned literal from Global Constraints; a model ID pattern (a family name followed by a version number or `-<digit>`); frontmatter length outside 200–1200; a `SKILL.md` that lacks a `MANDATORY` line for any of the ten references or whose line count exceeds 240; a matrix destination missing a marker term (`feTurbulence`, `backdrop-filter`, `APPROVED`, `lineage`, `buildability`, `control plate`, `storyboard`, `STATUS.md`).

- [ ] **Step 1: Write the lint.** Check it against a deliberately broken copy (a cited missing file) and see it fail.
- [ ] **Step 2: Run it on the real tree.** Expected: no output, exit 0. Fix findings in place; each fix is one edit to the owning file.

### Task 14: Move the original, then gates

**Files:**

- Create: `docs/studies/ui/i18n/origin.pt-BR.md`
- Modify: `docs/studies/ui/README.md` (checksum line)
- Delete: `skills/image-first-ui-design/`

- [ ] **Step 1: Copy and verify.** Run `cp skills/image-first-ui-design/SKILL.md docs/studies/ui/i18n/origin.pt-BR.md` (create the folder first), then `shasum -a 256` on both. Expected: identical hashes. Stop if they differ.
- [ ] **Step 2: Record the hash** in the `Origin SHA-256:` line of `docs/studies/ui/README.md`.
- [ ] **Step 3: Remove the old folder** with `rm -r skills/image-first-ui-design`.
- [ ] **Step 4: Format only what we own.** Run `pnpm exec prettier --write` on `skills/ui-art-direction`, `packages/ui`, `docs/studies/ui/*.md`, `docs/specs/2026-11-14-*.md`, this plan. Never on `docs/studies/ui/i18n/origin.pt-BR.md`.
- [ ] **Step 5: Run the checks.**
  - `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/ui-art-direction/tests` (all pass, one skipped)
  - `python3 $SCRATCH/lint_ui.py` (clean)
  - `make validate` (expected: passes; if the skill-judge entry is not yet there the ratchet is checked in Step 6)
  - `cd skills/ui-art-direction && npm pack --dry-run --json` then assert the file list has no `tests/`, no `__pycache__`, and contains `scripts/generate.py`.
  - `find skills/ui-art-direction -name __pycache__` prints nothing.
- [ ] **Step 6: Run `make pre-release`** after Task 15. Expected: exit 0 without `SKIP_SKILL_JUDGE_GATE`.

### Task 15: skill-judge score

**Files:**

- Modify: `scripts/snapshots/skill-judge-baseline.json`, `scripts/snapshots/skill-judge-golden.json`

**Interfaces:**

- Consumes: the installed `skill-judge` skill and `skills/ui-art-direction/SKILL.md`.
- Produces: one key `skills/ui-art-direction/SKILL.md` appended after the last existing key in each file. Baseline: `{"score": <0-100>, "version": "0.0.0", "capturedAt": "2026-11-14", "notes": "<D1..D8 and the /120 total>"}`. Golden: `{"dimensionScores": {}, "rubricChecksum": "manual", "rubricVersion": "v1", "totalRaw": <same 0-100 number>}`. The 0–100 score is `round(total / 120 * 100)`.

- [ ] **Step 1: Dispatch an opus agent** to load `skill-judge` and score `SKILL.md`. It returns D1–D8 and the total.
- [ ] **Step 2: Write both entries.** If the score is under 70, fix only missing triggers or broken structure in `SKILL.md`, then re-score once.
- [ ] **Step 3: Check equality.** Baseline `score` equals golden `totalRaw`.

### Task 16: Behavioral runs with the skill (GREEN), micro-tests, one fix round

**Files:**

- Modify (only if a predicate fails): the file whose wording caused it; `skills/ui-art-direction/README.md` and `.changeset/ui-art-direction-first-release.md` if known gaps remain
- Modify: this plan, section "Behavioral results"

- [ ] **Step 1: Run the three personas with the skill.** Same sonnet subjects and personas as Task 1, plus the instruction "Read `/Users/lloli/Workspace/studies/projects/skills/skills/ui-art-direction/SKILL.md` first and follow it; its scripts are in that skill folder". Save the transcripts.
- [ ] **Step 2: Dispatch the opus judge** with the transcripts and the eight predicates.
- [ ] **Step 3: Micro-test the two shaping rules.** For the cost gate and the blind-critic brief: five single-shot calls with the rule text in the prompt and five with no guidance, same tempting task, every flagged match read by hand. Variance counts: five different shapes means the wording is not binding.
- [ ] **Step 4: One fix round.** Edit only the wording behind a failed predicate, re-run only the failing scenarios. Predicates still failing are recorded as known gaps and do not block.
- [ ] **Step 5: Record the results table** (scenario, predicate, baseline, with skill) and the known gaps below.

### Task 17: Whole-branch review and handoff

- [ ] **Step 1: Dispatch one opus reviewer** over the whole change with the spec, this plan, and the matrix. It reports findings as `file:line`, ranked, covering: spec coverage by section, matrix coverage, cross-file consistency, whether the content is opinionated or generic, and the published-content rules.
- [ ] **Step 2: Fix the findings in one round**, then re-run Task 14 Step 5 and `make pre-release`.
- [ ] **Step 3: Fill the usage report below** and the root-cause ledger for any fix round.
- [ ] **Step 4: Hand off.** Report: the branch, what is untracked and committable (including `docs/studies/ui/`, which is committed only if the maintainer asks), that the original now exists only at `docs/studies/ui/i18n/origin.pt-BR.md` with its checksum, and the first-publish commands from `AGENTS.md` for `@llodev/ui-art-direction` and `@llodev/ui`. Do not run them.

## Behavioral results

_Baseline (Task 1), no skill, 3 sonnet subjects, opus judge. Raw evidence stays in the scratch folder and is not committed._

|                                               | run-1 (ops dashboard)              | run-2 (landing page)                | run-3 (notes reskin)                  |
| --------------------------------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------- |
| P1 brief + layout lock before first prompt    | FAIL: no image step at all         | FAIL: prompts written after code    | FAIL: no image step at all            |
| P2 reference roles + layout regions in prompt | FAIL: no image step at all         | FAIL: no references, no regions     | FAIL: no image step at all            |
| P3 one declared variable, 2-4 images          | FAIL: no image step at all         | FAIL: four subjects, no variable    | FAIL: no image step at all            |
| P4 states image count, asks before video      | FAIL: no image step at all         | PASS                                | FAIL: no image step at all            |
| P5 no app code, waits at hand-off             | FAIL: built full working dashboard | FAIL: built full page first         | FAIL: rewrote styles.css, no hand-off |
| P6 attach/save-back files + status file       | FAIL: no image step at all         | FAIL: save path only, no status     | FAIL: no image step at all            |
| P7 storyboard of page sections                | N/A                                | FAIL: gallery photos, no storyboard | N/A                                   |
| P8 control-plate prompt early                 | FAIL: no image step at all         | FAIL: no control plate              | FAIL: no image step at all            |

Reading: every run went straight to code and treated images as optional. Their output was not generic (asphalt-and-road-paint dashboard, violet-and-gold synth page), so the skill's value claim is the process: exploration in images before code, a locked layout, a hand-off, a blind score, a fidelity loop. Task 16 results follow.

**With the skill (Task 16)**, same three sonnet subjects, same situation sheet, opus judge, one run per scenario. Each run ends at its first request for images, so only phases 0-2 are exercised.

| Predicate                                        | run-1 dashboard | run-2 landing page | run-3 reskin                                           |
| ------------------------------------------------ | --------------- | ------------------ | ------------------------------------------------------ |
| P1 brief and layout lock before the first prompt | PASS            | PASS               | PASS                                                   |
| P2 reference roles and layout regions in prompts | PASS            | PASS               | FAIL (control prompt had no regions), fixed, see below |
| P3 one declared variable, two to four images     | PASS            | PASS               | PASS                                                   |
| P4 states image count, asks before any video     | PASS            | PASS               | PASS                                                   |
| P5 no app code, waits at the hand-off            | PASS            | PASS               | PASS (app files byte-identical to the fixture)         |
| P6 attach and save-back files, status file       | PASS            | PASS               | PASS                                                   |
| P7 storyboard planned as a later round           | N/A             | PASS               | N/A                                                    |
| P8 control-plate prompt among the first prompts  | PASS            | PASS               | PASS                                                   |

Baseline for comparison: P1-P8 failed in all three runs, except P4 in the landing page run. All three baseline runs went straight to code.

**Fix round (one, as the plan allows).** The judge also listed where the skill caused trouble. Seven edits, no re-run of the whole scenario:

1. The control-plate template had no LAYOUT section, which is why run-3's control had no regions (the only failed predicate). Added it; the exit check now says the control drops only VISUAL IDENTITY.
2. Brand adjectives in the control were ambiguous between two references. Rule now: if the brief has adjectives, they go verbatim into the control as its only direction; otherwise no direction.
3. The concept agreement was not a stop in SKILL.md and all three runs merged it into the round-1 board. Now: when the concept is the round-1 axis, the board is the agreement.
4. No fallback when reference images cannot be fetched (three runs improvised three answers). Added one: say so in `SOURCES.md`, fewer than three is acceptable, ask the user for named files at the hand-off, never drop a concept silently.
5. Skeleton capture assumed Playwright or manual DevTools; added a path with a temporary page copy and the browser's own headless screenshot.
6. The base of paths in the STATUS `Next step` line was unstated; now "as a path from the project root".
7. The reskin test record did not fit the five-line STATUS; it now goes in `brief.md` under Tests.

P2 re-check: a targeted single-shot (three repetitions of writing the control prompt from the revised reference for the run-3 brief) instead of a full re-run, because the fix is a template change. Result: 3/3 control prompts had a LAYOUT section with the region list, the role sentence for image 1, the brand words verbatim as the only direction, CONTENT and QUALITY BAR, and no VISUAL IDENTITY section. P2 now passes for run-3's brief.

**Micro-tests (shaping rules, 5 repetitions each, with a no-guidance control).**

| Rule                      | With the rule                                                                               | Control (no rule)                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Cost gate                 | 5/5: four images with the control included, no video, no question (inside the gate)         | 4/5 planned four images, 1/5 planned six; 0/5 planned video; 0/5 asked |
| Blind-critic output shape | 5/5 exact shape (five `n \| evidence` lines plus verdict), 285-372 words, no taste language | 0/5 in shape: invented criteria, 811-1032 words                        |

The cost gate changed behavior in one of five repetitions: on this model and task the control was already conservative, so this is weak evidence that the gate is needed. Video and retry loops were not exercised. The critic contract clearly binds the output shape; the accuracy of the scores was not measured.

**Read-through of Phases 3-7 (spec 12, Task 17 review).** Six fresh sonnet agents, one per reference (`converge`, `motion`, `build-spec`, `implementation`, `fidelity-and-lock`, `reskin`), each given only `SKILL.md` and that file, asked whether they could execute the phase from those two alone and where they would have to guess. Verdicts: all six "could execute with gaps", none blocked; 36 gaps (six each). They are recorded here and not fixed: the skill allows one fix wave and it was spent on the final review. Groups:

- **Undefined file locations and logging.** The round-1 lineage entry (no parent version, several candidates, one `Score` line), what "best version" means when a round has several candidates, where the state sheet and the mobile pass are saved and whether they are logged or scored, the sidecar of the chosen image (a run's sidecar is shared by its images), clip and prompt file names under `video/` and `prompts/`, where art plates and video files live in the pack and in the app, who approves a clip.
- **Tool choices the references leave to the project.** How to capture a screen without Playwright (and how to serve a plain HTML app), how to measure contrast on rendered pixels, which accessibility scan, how to get INP or profile a scroll, how to render candidate fonts next to the mockup, how Playwright Test reads the baseline folder, how tokens reach Tailwind and under which names.
- **Internal contradictions.** `build-spec.md` says an element fitting no medium reopens Phase 3, but data-bound interface components (service map, gauges, chat) are components, not art, and belong in no triage row; `SKILL.md` forbids loading `motion.md` outside Phase 4, while `build-spec.md` sends a run that skipped Phase 4 to its fields; the example capture script mixes pack-relative and project-root paths and waits only for fonts; the sample motion prompt asks for a seamless 8 s loop with a 3 s sweep; `reskin.md` assumes components and variants in a plain notes app, forbids touching logic files while the notes are built in script, and gives no fallback outside a git repo; on a reskin Phase 0's wireframe step and the screenshot-based lock overlap.

**Gap-closing round (after the read-through).** One opus implementer closed the 36 gaps above in `SKILL.md`, eight references and two examples (rulings in the brief: round-1 lineage shape and "best" rule, `mockups/states/` and `mockups/mobile/`, sidecar citation, `video/`, `prompts/`, `assets/` and `backup/` names, a "Checks on a render" paragraph in `SKILL.md` for capture, contrast, accessibility and performance, triage versus data-bound components, the `motion.md` pointer removed, a consistent capture example, a consistent sample motion prompt, and a reskin that works on a plain app outside git). Lint 0 findings, 60 tests, `make validate` exit 0. Two choices the rulings did not cover: the user's pick, not the highest total, decides which version the next round edits; a locked mobile image keeps its `mockups/mobile/<file>` name instead of an `APPROVED-*` copy.

**Second read-through (verification, not a second fix round).** Six fresh sonnet agents, one per reference, each with a concrete scenario (observability dashboard for converge, build-spec and implementation; desk-lamp landing page for motion; Vite project without Playwright for fidelity; plain notes app outside git for reskin) and an uncapped, stricter definition of a gap. Verdict in all six: could execute with gaps, none blocked. Gap counts: converge 17, build-spec 16, fidelity-and-lock 18, motion 14, implementation 13, reskin 13 (91). The counts are not comparable with the first pass (that one was capped at six per reference and asked about general executability). They are mostly second-order: file names for a fallback capture, thresholds and pass criteria, mobile and site details, ownership of a log or file. The reports are in the scratchpad. The ones that look like real contradictions, left open on purpose:

- `converge.md` says the round-1 axis is declared in Phase 1, `SKILL.md` says Phase 2; and the Phase 2 hand-off asks the user to pick before any critic score exists while Phase 3 scores first.
- The difference register is `qa/differences.md` in one place and a section of `qa/fidelity.md` in another.
- `implementation.md`: "one pass never moves two targets" against a pass that does mobile and states together; reduced motion listed as both early and last.
- `build-spec.md`: the Phase 5 output says `tokens.css (or the project's theme)` while Phase 5 writes no app code.
- The Playwright capture fixes color scheme, locale, time zone and reduced motion; the no-Playwright fallback (`headless --screenshot`) cannot, and the reference does not say what to do.

**Rounds after the second read-through (requested by the user: "as round as possible before publishing").**

- **Round 2 (gaps and contradictions).** One opus implementer applied seven rulings on contradictions (round-1 axis in `dna.md` plus a `Concept:` line in `brief.md`; user leaning at the Phase 2 hand-off versus a binding pick after the critic's scores; the difference register is `qa/differences.md`; build passes by target; `spec/tokens.css` lives in the pack only; the no-Playwright fallback; production build over dev server) and decided defaults for the gaps. New `references/capture-and-checks.md` (85 lines) took the capture and measurement material out of `SKILL.md` and `fidelity-and-lock.md`. 89 of 91 gaps closed, the rest skipped because the reader declined to open a delegated file.
- **Third read-through** (same six scenarios, readers allowed to open the files a phase delegates to): all six "could execute with gaps", none blocked; 110 gaps (converge 12, motion 13, reskin 17, build-spec 21, implementation 22, fidelity-and-lock 25), about 18 of them genuine cross-file contradictions. The count rose because readers who follow delegated files find more to ask; it is not a convergence metric, so the count was not chased.
- **Round 3 (contradictions only).** 25 rulings: the edit prompt keeps the prompt contract; STATUS at the lock names the next phase; sidecar naming; screenshot numbering; reduced motion in the fallback is reported as unverified when the build's motion is JS-driven; comp-in-hand checklist exceptions; logo rule (never generated), art-plate role sentence, `effects-scrim-opacity`, spacing base rule, scratch renders in `spec/scratch/`; passes per section on multi-section sites; scroll-linked layers carry `depth`; `breakpoints-md`; focus-ring and scrim recipes; design-system precedence; entry check; loop-seam test; video mode independent of image mode; at most three layers per clip; reskin brief order and screenshot role sentence; skeleton switch judged on candidates. Lint 0 findings, 60 tests, `make validate` exit 0. The contradiction fixes were not re-verified by a fourth read-through.
- **Re-score after the rounds: 101/120 (84), down from 109/120 (91).** D1 16, D2 13, D3 14, D4 14, D5 13, D6 11, D7 8, D8 12. The judge's weaknesses: exact file names, tie-break rules and fixed formats read as rigid bookkeeping for a creative task (D6, D8); repeated content between `SKILL.md`, references and anti-patterns, and generic knowledge (WCAG thresholds, capture boilerplate, Tailwind mapping) (D1); one contradiction (candidates per later round, fixed: at most three variants of one change). The baseline records 84. The trade is the one the rounds made: closing readers' gaps adds detail, and detail costs judgment room. A trim pass would recover points but may reopen gaps.

**Known gaps.**

- Phases 3-7 were not run end to end; they are covered by script tests and by three read-throughs (the last found about 110 mostly second-order gaps; the contradictions among them were fixed and not re-read). The accuracy of the blind critic's scores and the final fidelity report are unverified.
- The critic contract gained a third input (the layout lock image) after its micro-test, which ran on the earlier contract.
- After the behavioral runs, seven fix-round edits and then a final-review wave changed behavior-shaping text. Only the control-prompt fix (P2) was re-exercised; the concept-agreement rule, the sourcing fallback, the STATUS path base, the reskin test record, the skeleton capture path, the state sheet and mobile pass ownership, the site locks, and the narrower triggers were not.
- The cost gate's necessity is weakly evidenced (one repetition in five exceeded four images without it); video and retry loops were not exercised.
- `frames.py` was only exercised with a stubbed ffmpeg. The with-skill runs could not generate images, so the quality of the resulting mockups is untested. One run per scenario and model: no variance estimate.
- The recorded skill-judge score belongs to the text one description edit before the final one.

## Usage report

Tokens and durations are as reported in the task notifications (micro-test, P2 re-check and read-through figures are approximate; resumed agents report their own total). Subagents ran partly in parallel, so durations do not add up to wall-clock time.

| Role            | Task                                                   | Model  | Tokens        | Duration |
| --------------- | ------------------------------------------------------ | ------ | ------------- | -------- |
| Reviewer        | Spec builder check                                     | opus   | 107,201       | 130 s    |
| Implementer     | T12 family study                                       | opus   | 89,145        | 198 s    |
| Implementer     | T10 package files and meta                             | opus   | 100,726       | 237 s    |
| Implementer     | T2 wireframe, board, palette                           | opus   | 89,596        | 252 s    |
| Implementer     | T4 generate.py                                         | opus   | 82,629        | 209 s    |
| Implementer     | T3 compare, frames                                     | opus   | 91,736        | 285 s    |
| Test subject x3 | T1 baseline, no skill                                  | sonnet | 400,358       | 1698 s   |
| Judge           | T1 baseline vs predicates                              | opus   | 62,600        | 108 s    |
| Implementer     | T5 SKILL.md                                            | opus   | 100,325       | 209 s    |
| Implementer     | T7 references 3-5                                      | opus   | 119,216       | 339 s    |
| Implementer     | T9 anti-patterns, examples                             | opus   | 128,305       | 470 s    |
| Implementer     | T8 references 6-7, reskin                              | opus   | 141,809       | 481 s    |
| Implementer     | T6 references 0-2                                      | opus   | 128,907       | 501 s    |
| Implementer     | T11 wiring                                             | opus   | 98,373        | 193 s    |
| Judge           | T15 skill-judge, first pass                            | opus   | 83,874        | 80 s     |
| Fix round 1     | T9 rebase example domain (resumed)                     | opus   | 181,706       | 298 s    |
| Micro-tests x20 | cost gate and critic contract, 5 reps with and without | sonnet | 950,000       | 340 s    |
| Test subject x3 | T16 with the skill                                     | sonnet | 511,177       | 2194 s   |
| Judge           | T16 with-skill vs predicates                           | opus   | 125,009       | 242 s    |
| Fix round 2     | T6 and T8 behavioral fixes (resumed)                   | opus   | 306,028       | 250 s    |
| Test subject x3 | P2 re-check, control prompt                            | sonnet | 165,000       | 75 s     |
| Reviewer        | T17 whole-branch review                                | opus   | 282,125       | 822 s    |
| Fix wave        | Final review: A scripts and tests, B documentation     | opus   | 327,917       | 1041 s   |
| Judge           | skill-judge re-score                                   | opus   | 95,171        | 80 s     |
| Test subject x6 | Read-through of references 3-7 and reskin              | sonnet | 406,026       | 600 s    |
| Fix round 4     | Gap closing, Phases 3-7 (user-requested)               | opus   | 217,180       | 907 s    |
| Test subject x6 | Second read-through, scenarios per reference           | sonnet | 394,060       | 87 s     |
| Fix round 5     | Gaps and contradictions, round 2 (user-requested)      | opus   | 291,486       | 1226 s   |
| Test subject x6 | Third read-through, readers may open delegated files   | sonnet | 529,581       | 167 s    |
| Fix round 6     | Contradictions, round 3 (resumed after a rate limit)   | opus   | 184,077       | 256 s    |
| **Total**       |                                                        |        | **6,791,343** |          |

Fix rounds: 6 (T9 example domain; behavioral runs; final review wave; and three user-requested rounds after the read-throughs), plus the implementer-reported bad-input guards that were accepted without a round.

Root causes of the fix rounds, for the next plan:

1. **T9 example domain (brief gap, mine).** The dispatch paraphrased the spec's example product ("observability dashboard") as "logistics company", which was nearly the same as a tested scenario. Copy domain choices from the spec verbatim.
2. **Behavioral runs (skill defect).** The control-plate template omitted LAYOUT while its own exit check required it; a ruling on brand adjectives and the concept-agreement stop were left ambiguous across two files. Run the behavioral check earlier, on a draft of the references, before polishing them.
3. **Final review wave (plan and spec defects, mine).** The plan never scheduled the read-through that spec 12 promised, yet the README and changeset claimed it; the plan pinned "prompt is a path if the file exists, else literal text" from the study; the wireframe default size and the generation aspect disagreed; the state sheet and mobile pass had no owner phase. A whole-branch review of the plan against the spec before dispatch would have caught most of them.
