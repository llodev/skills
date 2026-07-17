/**
 * Canonical VO test template — covers:
 *   - happy path for every enum member (closed-set iteration via Object.values)
 *   - invalid case (returns Result.fail with the named error constant)
 *   - rejection of non-string input
 *   - dual API: tryCreate returns Result, create throws on invalid input
 *   - call-site comparison MUST go through the enum, never a string literal
 *
 * Test location in this monorepo:
 *   libs/shared/test/vo/palette-key.vo.test.ts
 *   run via: pnpm --filter @acme/shared test
 *   cross-BC change → also run: pnpm --filter api typecheck && pnpm --filter api test
 */
import { PaletteKeyVO, PaletteKeyEnum, PALETTE_KEYS } from "./palette-key.vo";

describe("PaletteKeyVO", () => {
  it("accepts every key in the catalog (iterating the enum)", () => {
    for (const key of PALETTE_KEYS) {
      const result = PaletteKeyVO.tryCreate(key);
      expect(result.isOk).toBe(true);
      if (result.isFailure) continue;
      expect(result.instance.value).toBe(key);
    }
  });

  it.each([["unknown"], [""], ["BORDO"], ["  bordo  "]])('rejects "%s"', (raw) => {
    const result = PaletteKeyVO.tryCreate(raw);
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain("INVALID_PALETTE_KEY");
  });

  it("rejects non-string input", () => {
    const result = PaletteKeyVO.tryCreate(1 as unknown as string);
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain("INVALID_PALETTE_KEY");
  });

  it("catalog stays in sync with the enum", () => {
    expect(PALETTE_KEYS).toEqual(Object.values(PaletteKeyEnum));
    expect(PALETTE_KEYS).toContain(PaletteKeyEnum.BORDO);
  });

  describe("dual API", () => {
    it("create() returns the instance for valid input", () => {
      expect(PaletteKeyVO.create(PaletteKeyEnum.BORDO).value).toBe(PaletteKeyEnum.BORDO);
    });

    it("create() throws on invalid input", () => {
      expect(() => PaletteKeyVO.create("unknown")).toThrow();
    });
  });

  describe("call-site comparison", () => {
    it("compares against the enum member, not a string literal", () => {
      const palette = PaletteKeyVO.create(PaletteKeyEnum.BORDO);
      // OK — single source of truth, refactor-safe.
      expect(palette.value === PaletteKeyEnum.BORDO).toBe(true);
      // The forbidden form `palette.value === "bordo"` is intentionally not used.
    });
  });
});
