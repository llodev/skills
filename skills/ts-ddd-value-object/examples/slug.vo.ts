/**
 * Canonical normalizing/scalar VO example — mirrors libs/shared/src/vo/slug.vo.ts.
 * Standalone: import paths point at the package consumers would use.
 *
 * Shape: kebab-case string, lowercase, ASCII-folded, max 36 chars,
 * with derived factories (`fromName`, `withRandomSuffix`) that build on `tryCreate`.
 *
 * Real location in this monorepo:
 *   src   → libs/shared/src/vo/slug.vo.ts
 *   tests → libs/shared/test/vo/slug.vo.test.ts
 *   import (consumers) → import { Slug } from "@acme/shared";
 *   import (inside libs/shared) → import { Result, ValueObject, ValueObjectConfig } from "../base";
 */
import { randomBytes } from "node:crypto";
import { Result, ValueObject, ValueObjectConfig } from "@acme/shared";

export class Slug extends ValueObject<string, ValueObjectConfig> {
  private static readonly INVALID_SLUG = "INVALID_SLUG";
  public static readonly MAX_LENGTH = 36;
  public static readonly SUFFIX_LENGTH = 8;

  private constructor(value: string, config?: ValueObjectConfig) {
    super(value, config);
  }

  // --- Factory (throws) ---
  public static create(value: string, config?: ValueObjectConfig): Slug {
    const result = Slug.tryCreate(value, config);
    result.throwIfFailed();
    return result.instance;
  }

  // --- Factory (Result) ---
  public static tryCreate(value: string, config?: ValueObjectConfig): Result<Slug> {
    try {
      if (typeof value !== "string") {
        throw new Error(Slug.INVALID_SLUG);
      }
      const normalized = Slug.normalize(value);
      const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!pattern.test(normalized) || normalized.length > Slug.MAX_LENGTH) {
        throw new Error(Slug.INVALID_SLUG);
      }
      return Result.ok(new Slug(normalized, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }

  // Public so callers can build slugs from raw names without re-implementing the rules.
  static normalize(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Derived factory: free-form name → slug, truncated to MAX_LENGTH without dangling dashes.
  static fromName(rawName: string, config?: ValueObjectConfig): Result<Slug> {
    if (typeof rawName !== "string") {
      return Result.fail(Slug.INVALID_SLUG);
    }
    const normalized = Slug.normalize(rawName);
    const truncated = normalized.slice(0, Slug.MAX_LENGTH).replace(/-+$/, "");
    return Slug.tryCreate(truncated, config);
  }

  // Derived factory: existing slug + random suffix, never exceeding MAX_LENGTH.
  static withRandomSuffix(base: Slug | string, config?: ValueObjectConfig): Slug {
    const raw = base instanceof Slug ? base.value : Slug.normalize(base);
    const budget = Slug.MAX_LENGTH - Slug.SUFFIX_LENGTH - 1;
    const trimmed = raw.slice(0, budget).replace(/-+$/, "");
    return Slug.create(`${trimmed}-${Slug.randomSuffix()}`, config);
  }

  private static randomSuffix(): string {
    return randomBytes(Slug.SUFFIX_LENGTH / 2).toString("hex");
  }
}
