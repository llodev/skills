/**
 * BC-LOCAL VO test template — covers:
 *   - happy path at boundary values (0 and max-1)
 *   - invalid integer cases (negative, out-of-range, non-integer, NaN, non-number)
 *   - config override via maxSlots
 *   - dual API: tryCreate returns Result, create throws on invalid input
 *
 * Test location in this monorepo:
 *   apps/api/test/celebrations/domain/value-objects/celebration-slot-index.vo.test.ts
 *   run via: pnpm --filter api test
 *
 * Note: paired with the BC-local source at
 *   apps/api/src/celebrations/domain/value-objects/celebration-slot-index.vo.ts
 * — there is no libs/shared mirror.
 */
import { CelebrationSlotIndex } from "./celebration-slot-index.vo";

describe("CelebrationSlotIndex", () => {
  it("accepts the lower bound (0)", () => {
    const result = CelebrationSlotIndex.tryCreate(0);
    expect(result.isOk).toBe(true);
    if (result.isFailure) return;
    expect(result.instance.value).toBe(0);
  });

  it("accepts the upper bound (default max - 1 = 31)", () => {
    const result = CelebrationSlotIndex.tryCreate(31);
    expect(result.isOk).toBe(true);
  });

  it.each([[-1], [32], [1.5], [NaN]])("rejects %s", (raw) => {
    const result = CelebrationSlotIndex.tryCreate(raw);
    expect(result.isFailure).toBe(true);
  });

  it("rejects non-number input", () => {
    const result = CelebrationSlotIndex.tryCreate("3" as unknown as number);
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain("INVALID_CELEBRATION_SLOT_INDEX");
  });

  it("respects custom maxSlots config", () => {
    const ok = CelebrationSlotIndex.tryCreate(7, { maxSlots: 8 });
    const fail = CelebrationSlotIndex.tryCreate(8, { maxSlots: 8 });
    expect(ok.isOk).toBe(true);
    expect(fail.isFailure).toBe(true);
    expect(fail.errors).toContain("CELEBRATION_SLOT_INDEX_OUT_OF_RANGE");
  });

  describe("dual API", () => {
    it("create() returns the instance for valid input", () => {
      expect(CelebrationSlotIndex.create(5).value).toBe(5);
    });

    it("create() throws on invalid input", () => {
      expect(() => CelebrationSlotIndex.create(-1)).toThrow();
    });
  });
});
