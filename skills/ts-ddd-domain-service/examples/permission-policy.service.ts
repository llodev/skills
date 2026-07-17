/**
 * *Policy pattern — standalone example for a TypeScript + DDD monorepo.
 * Pure domain rule over a Celebration aggregate: decides whether it is
 * eligible to publish. No I/O, no @Injectable, no DI.
 *
 * Real location in the project would be:
 *   apps/api/src/celebrations/domain/services/celebration-publishing.policy.ts
 */
import { Result } from "@acme/shared";
import { CelebrationStatusEnum, SectionKindEnum } from "@acme/celebrations-contracts";
import type { Celebration } from "@celebrations/domain/entities/celebration.entity";

const ALREADY_PUBLISHED = "ALREADY_PUBLISHED";
const NO_SECTIONS = "NO_SECTIONS";
const MISSING_HERO_SECTION = "MISSING_HERO_SECTION";
const INVALID_TITLE = "INVALID_TITLE";

export class CelebrationPublishingPolicy {
  /**
   * Aggregates every reason that blocks publication into a single
   * `Result.fail`, mirroring `Celebration.tryCreate`'s validation style.
   * Compare closed-set fields against the enum from the contracts package —
   * never against raw string literals.
   */
  static check(celebration: Celebration): Result<void> {
    const errors: string[] = [];

    if (celebration.status === CelebrationStatusEnum.PUBLISHED) {
      errors.push(ALREADY_PUBLISHED);
    }
    if (celebration.title.trim().length === 0) {
      errors.push(INVALID_TITLE);
    }
    if (celebration.sections.length === 0) {
      errors.push(NO_SECTIONS);
    } else if (!celebration.sections.some((s) => s.content.type === SectionKindEnum.HERO)) {
      errors.push(MISSING_HERO_SECTION);
    }

    if (errors.length) return Result.fail(errors);
    return Result.ok<void>(undefined);
  }
}
