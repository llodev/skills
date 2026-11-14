# ui family — design study

Status: sketch, 2026-11-14. Not a skill, and not a plan. It fixes responsibilities and seams for the four planned `ui-*` members before any of them is started.

## Family goal

Give an agent art direction it does not have by default: design a UI in image and video models first, then build it in code and verify the build against the approved image.
Each skill is knowledge plus small helper scripts: no MCP, no init, no runtime.
`ui-art-direction` carries the whole pipeline at working depth, one reference file per phase; each later member goes deep on one phase, or on a job that phase also does outside the pipeline.

## Members

| Skill              | One-line scope                                                                                                       | Priority | Study                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| `ui-art-direction` | Brief and layout lock to concept, mockups, blind convergence, motion, spec, build, and fidelity check (this release) | —        | `skills/ui-art-direction/`       |
| `ui-fidelity`      | Any comp (Figma export, screenshot, approved mockup) to a build verified tile by tile, then locked                   | High     | [ui-fidelity.md](ui-fidelity.md) |
| `ui-motion`        | Still to clip to motion spec to CSS, GSAP, or Motion code, with reduced-motion and a budget                          | Medium   | [ui-motion.md](ui-motion.md)     |
| `ui-assets`        | Art plates to responsive, alpha-aware, optimized assets with focal points and no baked text                          | Medium   | [ui-assets.md](ui-assets.md)     |
| `ui-reskin`        | New visual identity for a running app at theme level, information architecture frozen, tests green                   | Low      | [ui-reskin.md](ui-reskin.md)     |

How they connect: `ui-art-direction` produces the pack folder `design/<slug>/` (brief, layout lock, `mockups/APPROVED.*`, `spec/`, `STATUS.md`). Each member reads the pack when it exists, or builds the minimum it needs (a brief and a reference image) when it does not, and writes back into the same folder so `STATUS.md` stays the single baton. `ui-reskin` calls `ui-fidelity` for its before/after/mockup check; `ui-motion` and `ui-assets` hand their outputs to the build that `ui-fidelity` verifies.

## Overlap map

### Sections of `ui-art-direction` that each member deepens

These are the duplication risks the family rule forbids. **Shrink rule:** when a member ships, the matching section of `ui-art-direction` shrinks to the default plus a one-line pointer naming the member. Two copies of the same guidance are a defect.

| `ui-art-direction` section                              | Member        | What stays in `ui-art-direction` after the shrink                                 |
| ------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| `references/fidelity-and-lock.md`, `scripts/compare.py` | `ui-fidelity` | Deterministic capture defaults, one compare pass, the delivery checklist, pointer |
| `references/motion.md`, `scripts/frames.py`             | `ui-motion`   | Image-to-video prompt contract, "UI stays still", reduced-motion rule, pointer    |
| `references/build-spec.md` § asset pipeline             | `ui-assets`   | Art versus interface split, "no baked text", clean-plate request, pointer         |
| `references/reskin.md`                                  | `ui-reskin`   | The route row, "keep the information architecture, restyle only", pointer         |

`SKILL.md` keeps the phase table, the four rules, routes, modes, and the cost gate in every case; the routes table gains a one-line pointer to the member.

### What the family does NOT cover, and who owns it

| Concern                                                        | Owner                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Chart title, form, highlight, KPI cards, chart storytelling    | `bi-dashboard` (chart communication). `ui-*` sets identity and atmosphere around it                                                  |
| Design directed in code (no image model)                       | `frontend-design`, `impeccable`, `ui-ux-pro-max`. Alternatives, not dependencies; Phase 6 may defer to any of them for build quality |
| UX research, information architecture, wireframing as research | Out of family                                                                                                                        |
| Logo, brand identity, illustration as a product                | Out of family                                                                                                                        |
| Native mobile builds                                           | Out of family in this release                                                                                                        |
| Choosing a model by ID                                         | Provider docs; the skill passes IDs by flag or environment                                                                           |

## Suggested build order

Study only, not committed.

1. **`ui-fidelity`** — the most value outside the paradigm (any comp, not only an approved mockup), the least churn (capture and tile scoring do not age with image models), and `ui-reskin` reuses it.
2. **`ui-motion`** — the second-largest phase, a clear standalone trigger ("animate this"), and the first test of the shrink rule on a reference plus a script.
3. **`ui-assets`** — narrow and mechanical, deepens one section of `build-spec.md`; worth it once real packs show which formats and crops recur.
4. **`ui-reskin`** — mostly a route in this release; wait for field use to show what a member adds beyond `references/reskin.md` plus `ui-fidelity`.

## Open questions for the maintainer

1. **Shrink policy.** When a member ships, does the matching `ui-art-direction` section shrink to the default plus a one-line pointer (a release of `ui-art-direction` each time), or stay as is while the member goes deeper? Same question as `arc` open question 1. Recommendation: shrink.
2. **`ui-fidelity` and `bi-dashboard`.** On a page with charts, should `ui-fidelity` depend on `bi-dashboard` (or the meta-package guarantee it) so chart regions are judged by chart rules, or only mask chart regions and name `bi-dashboard` as the owner?
3. **CI for the Python scripts.** The tests run with `python3 -m unittest discover` and are not wired into `pnpm validate` (spec D9). Do they get their own CI job once a second member ships scripts?
4. **Video helper in `ui-motion`.** A video generation script was left out because video APIs change too fast. Does one belong in `ui-motion` once an image-to-video API stabilizes, with the same rule as `generate.py` (no default model ID)?

## Origin

The original Portuguese study is kept at `docs/studies/ui/i18n/origin.pt-BR.md`, copied byte for byte from the untracked `skills/image-first-ui-design/SKILL.md`. The checksum identifies the raw original; Prettier may reflow the committed copy.

Origin SHA-256: eb5ce22a3c2445149eb943e3ec3358d5fc66c587bed9a400b9f2d5230cb956c0
