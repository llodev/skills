/**
 * Repository PORT — e.g. `src/products/domain/repositories/` (example layout;
 * `@acme/*` package names are examples to adapt).
 *
 * Shows the recommended port style:
 *  - methods named after domain intent (`save`, `findById`, `listByStatus`),
 *    not generic `create`/`update`,
 *  - every method returns `Promise<Result<T>>`,
 *  - "absent" is `Result<Entity | null>`; "absent when caller required presence"
 *    is `Result.fail("PRODUCT_NOT_FOUND")` inside the use case,
 *  - DI token symbol exported next to the interface so the Nest module can wire
 *    `{ provide: PRODUCT_REPOSITORY, useClass: FirestoreProductRepository }`,
 *  - the port imports only `@acme/shared`, the contracts package and
 *    domain entities — never `firebase-admin` or `@nestjs/*`.
 */
import type { Result } from "@acme/shared";
import type { ProductStatus } from "@acme/products-contracts";
import type { Product } from "../entities";

export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");

export interface ProductRepository {
  findById(id: string): Promise<Result<Product | null>>;
  findBySku(sku: string): Promise<Result<Product | null>>;
  listByStatus(status: ProductStatus): Promise<Result<Product[]>>;
  save(product: Product): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}
