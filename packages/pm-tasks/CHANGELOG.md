# @llodev/pm-tasks

## 3.1.1

### Patch Changes

- [#62](https://github.com/llodev/skills/pull/62) [`01056c4`](https://github.com/llodev/skills/commit/01056c4b4b3f37c574ead17a843505d213444a6c) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - Meta-package now installs the full released family — added `@llodev/pm-tasks-jira` and `@llodev/pm-tasks-linear` to the peer/dev dependencies and the install list (previously only core + Trello + Asana). No API change; installing `@llodev/pm-tasks` now pulls in all five released adapters.

## 3.1.0

### Minor Changes

- [#41](https://github.com/llodev/skills/pull/41) [`dc31cdf`](https://github.com/llodev/skills/commit/dc31cdffe7dad3338f07190cdec43d71c9eb6f8b) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - Refresh published package metadata for the flattened `skills/` + `packages/` repository layout. `homepage` and `repository.directory` now point at the new paths, so npm and registry "Repository"/"Homepage" links resolve instead of 404ing against the removed `pm-tasks/*` and `django/*` folders. Documentation-only for consumers — no API, runtime, or behavior changes.

## 3.0.0

### Patch Changes

- Updated dependencies [[`d8da409`](https://github.com/llodev/skills/commit/d8da409a0a08a481264f8bf64e7bf6a501a16793)]:
  - @llodev/pm-tasks-core@1.2.0
  - @llodev/pm-tasks-asana@1.2.0
  - @llodev/pm-tasks-trello@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies []:
  - @llodev/pm-tasks-core@1.1.0
  - @llodev/pm-tasks-asana@1.1.0
  - @llodev/pm-tasks-trello@1.1.0

## 1.0.0

First stable release. Meta-package: `npm i @llodev/pm-tasks` installs the entire family (core + Trello + Asana) via peer dependencies.

- Updated dependencies [[`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838)]:
  - @llodev/pm-tasks-core@1.0.0
  - @llodev/pm-tasks-trello@1.0.0
  - @llodev/pm-tasks-asana@1.0.0
