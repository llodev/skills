/**
 * Canonical closed-set VO example — enum-backed catalog (target pattern).
 *
 * The live libs/shared/src/vo/palette-key.vo.ts is currently on the older
 * `PALETTE_KEYS = ["bordo"] as const` form. NEW closed-set VOs must follow
 * the pattern below (enum + Object.values + (typeof Enum)[keyof typeof Enum]).
 *
 * Real location in this monorepo:
 *   src   → libs/shared/src/vo/palette-key.vo.ts
 *   tests → libs/shared/test/vo/palette-key.vo.test.ts
 *   import (consumers) → import { PaletteKeyVO, PaletteKeyEnum, PALETTE_KEYS, PaletteKey } from "@acme/shared";
 *
 * Comparisons elsewhere always go through the enum:
 *   if (palette.value === PaletteKeyEnum.BORDO) { ... }    // OK
 *   if (palette.value === "bordo") { ... }                 // FORBIDDEN
 */
import { Result, ValueObject, ValueObjectConfig } from "@acme/shared";

// Single source of truth for the closed set.
export enum PaletteKeyEnum {
  BORDO = "bordo",
  ROSE = "rose",
}

// Runtime catalog — `Object.values` keeps it in lockstep with the enum.
export const PALETTE_KEYS = Object.values(PaletteKeyEnum);

// Compile-time type — derived from the enum, never hand-written.
export type PaletteKey = (typeof PaletteKeyEnum)[keyof typeof PaletteKeyEnum];

export class PaletteKeyVO extends ValueObject<PaletteKey, ValueObjectConfig> {
  private static readonly INVALID_PALETTE_KEY = "INVALID_PALETTE_KEY";

  private constructor(value: PaletteKey, config?: ValueObjectConfig) {
    super(value, config);
  }

  // --- Factory (throws) ---
  public static create(value: string, config?: ValueObjectConfig): PaletteKeyVO {
    const result = PaletteKeyVO.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  // --- Factory (Result) ---
  public static tryCreate(value: string, config?: ValueObjectConfig): Result<PaletteKeyVO> {
    if (typeof value !== "string" || !PALETTE_KEYS.includes(value as PaletteKey)) {
      return Result.fail(PaletteKeyVO.INVALID_PALETTE_KEY);
    }
    return Result.ok(new PaletteKeyVO(value as PaletteKey, config));
  }
}
