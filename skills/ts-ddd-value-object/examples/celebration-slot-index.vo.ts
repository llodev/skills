/**
 * BC-LOCAL VO example — lives inside a single bounded context. `celebrations`
 * is a sample BC; package names and aliases below are examples to adapt.
 *
 * Why BC-local (not shared)?
 *   The concept "slot index of a section inside a celebration page" is only
 *   meaningful to the celebrations BC. Rule of thumb:
 *     "A new primitive must be reusable across ≥ 2 BCs; otherwise it belongs
 *      in the BC's domain/ or its contracts package."
 *   Putting it in the shared kernel would pollute the cross-BC primitive layer
 *   with celebrations vocabulary.
 *
 * Suggested location (example layout, relative to the API package root):
 *   src   → src/celebrations/domain/value-objects/celebration-slot-index.vo.ts
 *   tests → test/celebrations/domain/value-objects/celebration-slot-index.vo.test.ts
 *   barrel → src/celebrations/domain/value-objects/index.ts
 *   import (within the BC, via an example path alias):
 *     import { CelebrationSlotIndex } from "@celebrations/domain/value-objects";
 *
 * Key contrasts with a shared VO:
 *   - Base classes still come from "@acme/shared" (Result, ValueObject).
 *   - No entry in the shared kernel's VO barrel — exported via the BC barrel only.
 *   - Other BCs cannot import this; cross-BC reuse would mean promoting it to
 *     the shared kernel (and stripping celebrations vocabulary first).
 */
import { Result, ValueObject, ValueObjectConfig } from "@acme/shared";

export interface CelebrationSlotIndexConfig extends ValueObjectConfig {
  maxSlots?: number;
}

export class CelebrationSlotIndex extends ValueObject<number, CelebrationSlotIndexConfig> {
  private static readonly INVALID_SLOT_INDEX = "INVALID_CELEBRATION_SLOT_INDEX";
  private static readonly OUT_OF_RANGE = "CELEBRATION_SLOT_INDEX_OUT_OF_RANGE";
  private static readonly DEFAULT_MAX_SLOTS = 32;

  private constructor(value: number, config?: CelebrationSlotIndexConfig) {
    super(value, config);
  }

  // --- Factory (throws) ---
  public static create(value: number, config?: CelebrationSlotIndexConfig): CelebrationSlotIndex {
    const result = CelebrationSlotIndex.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  // --- Factory (Result) ---
  public static tryCreate(
    value: number,
    config?: CelebrationSlotIndexConfig,
  ): Result<CelebrationSlotIndex> {
    try {
      if (typeof value !== "number" || isNaN(value) || !Number.isInteger(value)) {
        throw new Error(CelebrationSlotIndex.INVALID_SLOT_INDEX);
      }
      const max = config?.maxSlots ?? CelebrationSlotIndex.DEFAULT_MAX_SLOTS;
      if (value < 0 || value >= max) {
        throw new Error(CelebrationSlotIndex.OUT_OF_RANGE);
      }
      return Result.ok(new CelebrationSlotIndex(value, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
