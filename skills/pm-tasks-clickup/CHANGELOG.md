# @llodev/pm-tasks-clickup

## 1.0.1

### Patch Changes

- [#133](https://github.com/llodev/skills/pull/133) [`6e1ecee`](https://github.com/llodev/skills/commit/6e1ecee689f5f1236a2fccfb85340159cec00dc9) Thanks [@lloliveiradev](https://github.com/lloliveiradev)! - Republish with a valid package manifest. 1.0.0 reached the registry with `"@llodev/pm-tasks-core": "workspace:^"` in `dependencies`, which npm cannot install (`EUNSUPPORTEDPROTOCOL`), so `npx @llodev/pm-tasks-clickup init` and any install of the package failed. 1.0.1 is published by the release workflow, which rewrites that specifier to a real version range. No code change; do not use 1.0.0.
