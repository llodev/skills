/**
 * Canonical entity example — self-contained, mirrors this monorepo's pattern.
 *
 * Demonstrates:
 *  - `Entity` base from `@acme/shared`
 *  - dual API `tryCreate` (Result) + `create` (throws)
 *  - closed-set field driven by a string-backed TS enum (`ProductStatusEnum`)
 *  - manual `errors[]` accumulator combined with VO validation (`Id.required`)
 *  - enum-member comparison inside a domain method (NEVER a string literal)
 *  - `cloneWith` for immutable state transitions
 *
 * In the real codebase the enum + type guard live in the contracts package:
 *   libs/contracts/<bc>/src/interfaces/product-status.ts
 * They are inlined here only to keep the example standalone.
 */
import { Entity, type EntityProps, Id, Result } from "@acme/shared";

// --- Enum (would live in @acme/<bc>-contracts) ---
export enum ProductStatusEnum {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}
export const PRODUCT_STATUSES = Object.values(ProductStatusEnum);
export type ProductStatus = (typeof ProductStatusEnum)[keyof typeof ProductStatusEnum];
export function isProductStatus(v: unknown): v is ProductStatus {
  return typeof v === "string" && PRODUCT_STATUSES.includes(v as ProductStatus);
}

// --- Props ---
export interface ProductProps extends EntityProps {
  name: string;
  sku: string;
  categoryId: string;
  status: string; // raw input; normalized to ProductStatus inside the entity
}

export class Product extends Entity<Product, ProductProps> {
  private _status: ProductStatus;

  private constructor(props: ProductProps, status: ProductStatus) {
    super(props);
    this._status = status;
  }

  // --- Getters ---
  get name(): string {
    return this.props.name;
  }
  get sku(): string {
    return this.props.sku;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get status(): ProductStatus {
    return this._status;
  }

  // --- Factory (throws) ---
  static create(props: ProductProps): Product {
    const r = Product.tryCreate(props);
    r.throwIfFailed();
    return r.instance;
  }

  // --- Factory (Result) ---
  static tryCreate(props: ProductProps): Result<Product> {
    const categoryIdResult = Id.required(props.categoryId, { attribute: "categoryId" });

    const errors: string[] = [];
    const name = typeof props.name === "string" ? props.name.trim() : "";
    const sku = typeof props.sku === "string" ? props.sku.trim() : "";

    if (!name) errors.push("INVALID_NAME");
    if (!sku) errors.push("INVALID_SKU");
    if (categoryIdResult.isFailure) errors.push(...(categoryIdResult.errors ?? []));
    if (!isProductStatus(props.status)) errors.push("INVALID_PRODUCT_STATUS");

    if (errors.length) return Result.fail(Array.from(new Set(errors)));

    return Result.ok(
      new Product(
        {
          ...props,
          name,
          sku,
          categoryId: categoryIdResult.instance.value,
          status: props.status,
        },
        props.status as ProductStatus,
      ),
    );
  }

  // --- Domain methods ---

  /**
   * Compare against the enum member — NEVER `=== "published"`.
   * `cloneWith` re-runs `tryCreate`, so invariants are re-validated on every mutation.
   */
  publish(): Result<Product> {
    if (this._status === ProductStatusEnum.PUBLISHED) {
      return Result.fail("ALREADY_PUBLISHED");
    }
    return this.cloneWith({ status: ProductStatusEnum.PUBLISHED });
  }

  archive(): Result<Product> {
    return this.cloneWith({ status: ProductStatusEnum.ARCHIVED });
  }

  moveToCategory(newCategoryId: string): Result<Product> {
    return this.cloneWith({ categoryId: newCategoryId });
  }
}
