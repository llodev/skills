# ui-reskin — design study

Status: sketch, 2026-11-14. Not a skill. Decides structure and seams only.

## 1. Responsibility and non-goals

Gives a running app a new visual identity without breaking it: an inventory of routes, components, states, and functions; the running screenshot as the layout reference; mockups that keep the information architecture and restyle only; every new element mapped to a component that already exists; and a theme-level change (tokens, variants, art layer) with tests green. Deepens `references/reskin.md` of `ui-art-direction`.

Non-goals (refuses):

- Changing information architecture, navigation, flows, or copy. That is a redesign; it routes to `ui-art-direction` from Phase 0.
- Rewriting logic, state management, or data fetching to fit a look.
- Migrating component libraries or frameworks as part of the reskin.
- Restyling charts beyond the theme colors they already read (`bi-dashboard` owns chart communication).
- Code-first restyling without an image step (`frontend-design`, `impeccable`, `ui-ux-pro-max`).

## 2. Triggers

1. "Give our admin panel a new look. Nothing can stop working."
2. "Restyle the app to the new brand without touching the flows."
3. "Make it feel premium, but the users must still find everything where it is."
4. "Apply this moodboard to our existing settings and billing screens."
5. "Dark theme with a new identity, same components, tests must pass."

## 3. Core concepts

- **Frozen information architecture:** the screenshot of the running app is image 2 in every prompt, with "keep the exact information architecture and components; restyle only".
- **Inventory before identity:** routes, components, states, and functions are listed first; the list is the acceptance check at the end.
- **Map, do not add:** each element in the new mockup maps to an existing component or a variant of it. A new component is a decision recorded, not a side effect.
- **Theme-level change:** tokens, component variants, and an art layer. Logic files stay out of the diff.
- **Three-way comparison:** before, after, and mockup, side by side, per screen and state.

## 4. Workflow

| #   | Input                                 | Action                                                                                    | Output                        |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Running app                           | Capture target screens and states; list routes, components, states, functions             | Inventory, `before/` captures |
| 2   | Inventory, design system, brand rules | Record what is fixed (brand palette, type, components) and what may vary                  | Reskin brief                  |
| 3   | Brief, concept, captures              | Explore and converge with the capture as layout reference (`ui-art-direction` Phases 1–3) | Approved restyle mockups      |
| 4   | Approved mockups, inventory           | Map every visible element to an existing component or variant; flag the gaps              | Component map                 |
| 5   | Map, mockups                          | Extract tokens and variants; plan the change as theme, variants, and art layer only       | Theme spec                    |
| 6   | Theme spec                            | Implement on a separate branch; run the existing test suite after each slice              | Theme change, green tests     |
| 7   | Build, mockups, `before/`             | Compare before, after, and mockup (`ui-fidelity` when installed); confirm every function  | Reskin report                 |

## 5. Actions and artifacts

- **Inventory:** route, screen, components, states, functions, owner.
- **Reskin brief:** fixed elements, variable elements, screens in scope.
- **Component map:** mockup element, existing component, variant, gap decision.
- **Theme spec:** token diff, variant list, art layer assets.
- **Reskin report:** three-way comparisons per screen and state, function checklist, test results, intentional differences.

## 6. Expert judgments to inject

- **If a mockup needs a new layout, it is not a reskin.** Stop and offer the redesign route instead of bending components.
- **Change tokens before components, components before screens.** Heuristic: most of a reskin should land in tokens and variants; screen-level overrides are a smell.
- **Keep the old theme switchable until the reskin is accepted,** so a regression can be compared and rolled back.
- **States are where reskins break:** focus rings, disabled, error, empty, and loading are checked on every screen, not only the default state.
- **The existing tests are the contract.** A test changed to pass is a function that changed; it needs the user's approval.
