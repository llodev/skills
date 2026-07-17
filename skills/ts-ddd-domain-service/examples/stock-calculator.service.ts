/**
 * *Calculator pattern — standalone example.
 * Numeric computation from multiple domain objects; deterministic, no I/O.
 *
 * Real location in the project would be:
 *   apps/api/src/<bc>/domain/services/<name>.calculator.ts
 *
 * Notice: pure class, no `@Injectable`, no constructor injection, takes
 * domain primitives as arguments and returns `Result`. The enum branch
 * below (MovementKindEnum) shows the closed-set rule from SKILL.md —
 * compare against the enum member, never a raw string.
 */
import { Result } from "@acme/shared";

const NEGATIVE_BALANCE = "NEGATIVE_BALANCE";
const UNKNOWN_MOVEMENT_KIND = "UNKNOWN_MOVEMENT_KIND";

export enum MovementKindEnum {
  CREDIT = "credit",
  DEBIT = "debit",
}

export interface Movement {
  readonly kind: MovementKindEnum;
  readonly amount: number;
}

export class StockCalculator {
  /**
   * Derives the current balance from a baseline snapshot + a list of movements.
   * Deterministic: same snapshot + same movements → same result.
   */
  static calculate(snapshot: number, movements: Movement[]): Result<number> {
    let balance = snapshot;

    for (const m of movements) {
      switch (m.kind) {
        case MovementKindEnum.CREDIT:
          balance += m.amount;
          break;
        case MovementKindEnum.DEBIT:
          balance -= m.amount;
          break;
        default:
          // Exhaustive guard — adding a new MovementKindEnum member without
          // updating this switch fails loudly instead of silently dropping.
          return Result.fail(UNKNOWN_MOVEMENT_KIND);
      }
    }

    if (balance < 0) return Result.fail(NEGATIVE_BALANCE);
    return Result.ok(balance);
  }
}
