import test from "node:test";
import assert from "node:assert/strict";
import { setFrontmatterVersion } from "./sync-version.mjs";

const SKILL = `---
name: ts-ddd-entity
description: >-
  Create, review, or guide Domain Entity implementation in a TypeScript + DDD
  codebase. Use when: the request touches \`*.entity.ts\` files under
  \`src/<bc>/domain/entities/\` or their tests under
  \`test/<bc>/domain/entities/\`; a deliberately short line.
metadata:
  version: 0.1.0
---

# Body

version: 9.9.9 in the body must not change
`;

test("setFrontmatterVersion — changes only the metadata.version line", () => {
  const next = setFrontmatterVersion(SKILL, "0.2.0");
  assert.equal(next, SKILL.replace("  version: 0.1.0", "  version: 0.2.0"));
});

test("setFrontmatterVersion — returns the source unchanged when already in sync", () => {
  assert.equal(setFrontmatterVersion(SKILL, "0.1.0"), SKILL);
});

test("setFrontmatterVersion — adds version to an existing metadata block", () => {
  const src = "---\nname: x\nmetadata:\n  author: me\n---\nbody\n";
  assert.equal(
    setFrontmatterVersion(src, "1.0.0"),
    "---\nname: x\nmetadata:\n  version: 1.0.0\n  author: me\n---\nbody\n",
  );
});

test("setFrontmatterVersion — adds the metadata block when missing", () => {
  const src = "---\nname: x\n---\nbody\n";
  assert.equal(
    setFrontmatterVersion(src, "1.0.0"),
    "---\nname: x\nmetadata:\n  version: 1.0.0\n---\nbody\n",
  );
});

test("setFrontmatterVersion — ignores a version key outside metadata", () => {
  const src = "---\nname: x\nother:\n  version: 5.0.0\nmetadata:\n  version: 0.1.0\n---\n";
  assert.equal(
    setFrontmatterVersion(src, "0.2.0"),
    "---\nname: x\nother:\n  version: 5.0.0\nmetadata:\n  version: 0.2.0\n---\n",
  );
});

test("setFrontmatterVersion — throws without frontmatter", () => {
  assert.throws(() => setFrontmatterVersion("# no frontmatter\n", "1.0.0"));
});
