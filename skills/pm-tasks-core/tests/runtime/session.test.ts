import { describe, it, expect } from "vitest";
import { generateSession } from "../../src/runtime/session.js";

describe("generateSession", () => {
  it("returns a 12-character string", () => {
    expect(generateSession()).toHaveLength(12);
  });

  it("uses only base36 characters", () => {
    expect(generateSession()).toMatch(/^[0-9a-z]{12}$/);
  });

  it("returns a unique value on each call (100 iterations, no collision)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(generateSession());
    expect(set.size).toBe(100);
  });
});
