---
"@llodev/pm-tasks-clickup": patch
---

Republish with a valid package manifest. 1.0.0 reached the registry with `"@llodev/pm-tasks-core": "workspace:^"` in `dependencies`, which npm cannot install (`EUNSUPPORTEDPROTOCOL`), so `npx @llodev/pm-tasks-clickup init` and any install of the package failed. 1.0.1 is published by the release workflow, which rewrites that specifier to a real version range. No code change; do not use 1.0.0.
