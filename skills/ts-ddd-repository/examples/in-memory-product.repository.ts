/**
 * InMemory adapter — lives in `apps/api/src/products/infra/memory/`.
 *
 * Mirrors the real InMemoryCelebrationRepository style:
 *  - backing store is a `Map<id, ProductProps>` (snapshots, not live entities),
 *  - retrieval re-runs `Product.tryCreate(structuredClone(snap))` so a future
 *    invariant change surfaces in tests instead of silently passing,
 *  - error codes (`PRODUCT_NOT_FOUND`) match exactly what the Firestore adapter
 *    returns — use-case tests assert on those strings,
 *  - no `try/catch`: only fail in ways the production adapter would also fail
 *    (entity reconstruction failure, missing parent doc),
 *  - no NestJS decorators — instantiated directly in tests via
 *    `const repo = new InMemoryProductRepository();`.
 */
import { Result } from "@acme/shared";
import type { ProductStatus } from "@acme/products-contracts";
import { Product, type ProductProps } from "@products/domain/entities";
import type { ProductRepository } from "@products/domain/repositories";

export class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, ProductProps>();

  async findById(id: string): Promise<Result<Product | null>> {
    const snap = this.store.get(id);
    if (!snap) return Result.ok<Product | null>(null);
    const r = Product.tryCreate(structuredClone(snap));
    if (r.isFailure) return r.withFail;
    return Result.ok<Product | null>(r.instance);
  }

  async findBySku(sku: string): Promise<Result<Product | null>> {
    for (const snap of this.store.values()) {
      if (snap.sku !== sku) continue;
      const r = Product.tryCreate(structuredClone(snap));
      if (r.isFailure) return r.withFail;
      return Result.ok<Product | null>(r.instance);
    }
    return Result.ok<Product | null>(null);
  }

  async listByStatus(status: ProductStatus): Promise<Result<Product[]>> {
    const out: Product[] = [];
    for (const snap of this.store.values()) {
      if (snap.status !== status) continue;
      const r = Product.tryCreate(structuredClone(snap));
      if (r.isFailure) return r.withFail;
      out.push(r.instance);
    }
    return Result.ok(out);
  }

  async save(product: Product): Promise<Result<void>> {
    this.store.set(product.id, product.toSnapshot());
    return Result.ok<void>(undefined);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return Result.fail("PRODUCT_NOT_FOUND");
    this.store.delete(id);
    return Result.ok<void>(undefined);
  }
}
