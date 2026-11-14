# Phase 0 — Brief and layout lock: modes and models

Decide how images get made before the first prompt, and record it on the `Mode:` line of `STATUS.md`. The same prompts, references, and checks apply in every mode; only who presses the button changes.

## 1. Detect the mode

| Mode          | Detect                                                                                                                        | Who generates                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **automatic** | An image-model key is in the environment (`GEMINI_API_KEY`, `OPENAI_API_KEY`) or the project has its own image SDK or gateway | `python3 scripts/generate.py` or the project's SDK   |
| **native**    | The host agent has an image generation or image edit tool in its own tool list                                                | the agent, with that tool                            |
| **assisted**  | Neither of the above                                                                                                          | the user, in their own image app, one step at a time |

Check for keys by name only, never by value:

```bash
python3 -c 'import os; print([k for k in ("GEMINI_API_KEY", "OPENAI_API_KEY", "IMAGE_MODEL") if os.environ.get(k)])'
```

When more than one mode is available, ask once which to use. Without an answer, prefer automatic: the script writes provenance for you and runs the same way next session. Native mode is valid only if its tool accepts at least two input images in one call (identity reference plus layout lock); otherwise use it for single-image edits and run Phase 2 in another mode.

## 2. Assisted mode steps

The user is the generator, so every step names the files. One step, one line, in this form:

> Attach `<file>` to `<your image app>`, run `<prompt file>`, save the results as `<path>`.

For example: "Attach `design/obs/refs/observatory.jpg` (first) and `design/obs/layout/wire.png` (second) to your image app, run `design/obs/prompts/v1-dusk.md`, save the result as `design/obs/mockups/v1/dusk.png`."

- Give paths relative to the project root, and give the attach order: the prompt refers to "image 1" and "image 2".
- One step per prompt file. List a round's steps numbered in one message, put the first pending step on `Next step:` in `STATUS.md` with every file as a path from the project root, then stop and wait for the files.
- Ask the user which app and model they used. Write the provenance sidecar yourself (section 5) with what they report, or `unknown`.
- Never say "generate some images". A step without a file to attach and a path to save back is not a step.

## 3. Choosing models

Name families, not versions. What matters is capability:

**Image model, for mockups:**

- accepts several reference images in one call (at least the identity reference plus the layout lock);
- renders legible, correct text in the product's language at small sizes;
- edits from an input image, so a later round changes one thing in the best version instead of starting over;
- takes the layout lock's aspect ratio (16:9 for a `[1920, 1080]` lock, 9:16 for the mobile pass) without adding a device frame.

Families that have offered this: Nano Banana (Gemini Image), GPT Image, Seedream, Flux Kontext.

**Video model, for Phase 4:**

- image-to-video from the approved still, with a locked camera;
- first-frame and last-frame control, for transitions between storyboard frames;
- short clips that hold the UI static while named layers move.

Families that have offered this: Seedance, Wan, Kling, Veo, Runway. There is no video script; [`motion.md`](motion.md) gives the prompt and the user or host runs the model.

**Model IDs change faster than this skill.** Confirm the current ID in the provider's documentation at run time and pass it by `--model` or the `IMAGE_MODEL` environment variable. Never hard-code an ID in product code, a prompt file, or a pack document other than the sidecar that records what was used.

## 4. The cost gate

Every image and every second of video is a paid call, in every mode (API billing, a subscription quota, or the user's own credits).

- A round is **two to four images**. Round 1 is the control plate plus two or three candidates, four at most. A site's scroll storyboard is its own round, confirmed by frame count first ([`mockup-prompting.md`](mockup-prompting.md)).
- Ask before any round of more than four images, before any video, and before any retry loop.
- A failed or blocked call is reported to the user with its message. Re-running it is the user's decision, not an automatic retry.
- When you ask, state the count, the model family, and the mode. Quote a price only from the provider's pricing page.

`python3 scripts/generate.py` prints a reminder when `--n` is above 4. The reminder does not replace asking.

## 5. Provenance sidecar

Each run writes one JSON file beside its output, `<out stem>.json`, with these fields and nothing else:

| Field        | Holds                                                  |
| ------------ | ------------------------------------------------------ |
| `model`      | the model ID used                                      |
| `provider`   | `gemini`, `openai`, the host's tool, or the user's app |
| `aspect`     | the requested aspect ratio                             |
| `refs`       | reference image paths, in the order sent               |
| `prompt`     | the full prompt text sent                              |
| `outputs`    | the image paths written                                |
| `created_at` | ISO 8601 timestamp                                     |

No value from the environment goes into a sidecar. In native and assisted mode, write the same fields by hand.

## 6. `generate.py`

```bash
export IMAGE_MODEL=<current ID from the provider docs>
python3 scripts/generate.py --provider gemini \
  --prompt design/<slug>/prompts/v1-dusk.md \
  --ref design/<slug>/refs/observatory.jpg --ref design/<slug>/layout/wire.png \
  --aspect 16:9 --out design/<slug>/mockups/v1/dusk.png
```

- `--provider` is `gemini` or `openai`. Keys come from `GEMINI_API_KEY` or `OPENAI_API_KEY` and are never printed or written.
- No model given: exit 2 with a pointer to the provider docs. Missing SDK: exit 2 with the install command (`pip install google-genai` or `pip install openai`).
- One image writes `dusk.png` and the sidecar `dusk.json`. `--n 2` writes `dusk-1.png`, `dusk-2.png`, and one sidecar `dusk.json`; every extra image counts toward the round. Stdout is the output paths.
- A provider that returns no image (safety block, text-only reply) exits 1 and writes nothing.
- `--prompt` is a file path or literal text. An argument that looks like a path to a missing file exits 2 before any call, so a typo is never billed.
- `--ref` order is the order the prompt's "image 1", "image 2" refer to.
- `--aspect` is the aspect of the layout lock's `size`. The `openai` provider accepts only the aspects it has a size for and exits 2 listing them for any other; it returns 3:2 for 16:9 and 2:3 for 9:16. Note it on the board; Phase 7 handles an off-aspect mockup as [`fidelity-and-lock.md`](fidelity-and-lock.md) section 1 says.

## Exit check

- [ ] `Mode:` in `STATUS.md` is `automatic`, `native`, or `assisted`, matched to what was detected.
- [ ] For automatic mode, a model ID was confirmed in the provider docs and is set by `--model` or `IMAGE_MODEL`.
- [ ] The user has the cost gate: rounds of two to four, asked before more than four, any video, any retry.
- [ ] Every image already made has a sidecar with the seven fields.
