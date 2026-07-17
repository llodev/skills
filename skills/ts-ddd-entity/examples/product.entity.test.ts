/**
 * Canonical entity test template — mirrors apps/api/test/<bc>/domain/entities style.
 *
 * Covers:
 *  - valid create (auto-generated id + explicit id)
 *  - each invalid field returns the expected `errors[]` code
 *  - enum-driven status: fixtures use `ProductStatusEnum.*`, never string literals
 *  - `equals` semantics
 *  - domain methods: `publish` (state transition + duplicate rejection), `archive`
 *  - `cloneWith` re-validation
 *  - immutability of the source instance on a failed mutation
 */
import { Product, ProductStatusEnum, type ProductProps } from "./product.entity";

const VALID_CATEGORY = "b0b1c2d3-e4f5-6789-abcd-ef0123456789";

function validProps(overrides: Partial<ProductProps> = {}): ProductProps {
  return {
    name: "Widget Pro",
    sku: "WG-001",
    categoryId: VALID_CATEGORY,
    status: ProductStatusEnum.DRAFT,
    ...overrides,
  };
}

describe("Product.tryCreate", () => {
  it("creates a valid product with auto-generated id", () => {
    const r = Product.tryCreate(validProps());
    expect(r.isOk).toBe(true);
    expect(r.instance.id).toBeDefined();
    expect(r.instance.status).toBe(ProductStatusEnum.DRAFT);
  });

  it("creates with an explicit id", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef0123456789";
    const r = Product.tryCreate({ ...validProps(), id });
    expect(r.isOk).toBe(true);
    expect(r.instance.id).toBe(id);
  });

  it.each([
    [{ name: "" }, "INVALID_NAME"],
    [{ name: "   " }, "INVALID_NAME"],
    [{ sku: "" }, "INVALID_SKU"],
    [{ categoryId: "" }, undefined], // any Id.required failure code
    [{ status: "bogus" as never }, "INVALID_PRODUCT_STATUS"],
  ])("rejects invalid metadata: %o", (override, expectedCode) => {
    const r = Product.tryCreate(validProps(override));
    expect(r.isFailure).toBe(true);
    if (expectedCode) expect(r.errors).toContain(expectedCode);
  });
});

describe("Product.create (throws)", () => {
  it("throws on invalid props", () => {
    expect(() => Product.create(validProps({ name: "" }))).toThrow();
  });
});

describe("Product.equals", () => {
  it("is equal by id regardless of other fields", () => {
    const sharedId = "a1b2c3d4-e5f6-7890-abcd-ef0123456789";
    const a = Product.create({ ...validProps(), id: sharedId, name: "A" });
    const b = Product.create({ ...validProps(), id: sharedId, name: "B" });
    expect(a.equals(b)).toBe(true);
  });

  it("is not equal when ids differ", () => {
    const a = Product.create(validProps());
    const b = Product.create(validProps());
    expect(a.notEquals(b)).toBe(true);
  });
});

describe("Product.publish", () => {
  it("transitions draft → published", () => {
    const p = Product.create(validProps());
    const r = p.publish();
    expect(r.isOk).toBe(true);
    expect(r.instance.status).toBe(ProductStatusEnum.PUBLISHED);
  });

  it("rejects re-publishing", () => {
    const p = Product.create(validProps({ status: ProductStatusEnum.PUBLISHED }));
    const r = p.publish();
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("ALREADY_PUBLISHED");
  });

  it("does not mutate the source instance on success (cloneWith)", () => {
    const p = Product.create(validProps());
    p.publish();
    expect(p.status).toBe(ProductStatusEnum.DRAFT);
  });
});

describe("Product.archive", () => {
  it("returns an archived clone", () => {
    const p = Product.create(validProps());
    const r = p.archive();
    expect(r.isOk).toBe(true);
    expect(r.instance.status).toBe(ProductStatusEnum.ARCHIVED);
  });
});

describe("Product.cloneWith", () => {
  it("re-validates on override — fails on invalid value", () => {
    const p = Product.create(validProps());
    const r = p.cloneWith({ name: "" });
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("INVALID_NAME");
  });

  it("re-validates on override — fails on invalid status", () => {
    const p = Product.create(validProps());
    const r = p.cloneWith({ status: "bogus" as never });
    expect(r.isFailure).toBe(true);
    expect(r.errors).toContain("INVALID_PRODUCT_STATUS");
  });
});
