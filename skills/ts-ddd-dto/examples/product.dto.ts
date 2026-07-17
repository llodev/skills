/**
 * DTO triplet example for a hypothetical `products` bounded context.
 * Mirrors the monorepo's contracts-package layout:
 *
 *   libs/contracts/products/src/
 *     interfaces/product-status.ts       ← string-backed enum + helpers
 *     interfaces/product-content.ts      ← discriminated union over enum
 *     schemas/enum.schemas.ts            ← z.nativeEnum(...)
 *     schemas/product-content.schema.ts  ← z.literal(EnumName.X) per branch
 *     dtos/create-product.dto.ts         ← z.infer DTO
 *     dtos/product-response.dto.ts       ← z.infer DTO
 *
 * Everything below is collapsed into a single file purely for illustration.
 * In the real codebase, each section lives in its own file under the paths
 * above and is re-exported by the per-folder `index.ts` barrel.
 */

import { z } from "zod";

// ─── interfaces/product-status.ts ─────────────────────────────────────────────
// Closed set ⇒ string-backed enum + derived tuple/type/predicate.

export enum ProductStatusEnum {
  DRAFT = "draft",
  ACTIVE = "active",
  ARCHIVED = "archived",
}

export const PRODUCT_STATUSES = Object.values(ProductStatusEnum);

export type ProductStatus = (typeof ProductStatusEnum)[keyof typeof ProductStatusEnum];

export function isProductStatus(v: unknown): v is ProductStatus {
  return typeof v === "string" && PRODUCT_STATUSES.includes(v as ProductStatus);
}

// ─── interfaces/product-content.ts ────────────────────────────────────────────
// Discriminated union ⇒ each branch references an enum member, never a literal.

export enum ProductKindEnum {
  PHYSICAL = "physical",
  DIGITAL = "digital",
  SUBSCRIPTION = "subscription",
}

export interface PhysicalProductContent {
  type: ProductKindEnum.PHYSICAL;
  weightGrams: number;
  shipsFrom: string;
}

export interface DigitalProductContent {
  type: ProductKindEnum.DIGITAL;
  downloadUrl: string;
  sizeBytes: number;
}

export interface SubscriptionProductContent {
  type: ProductKindEnum.SUBSCRIPTION;
  intervalDays: number;
  trialDays?: number;
}

export type ProductContent =
  PhysicalProductContent | DigitalProductContent | SubscriptionProductContent;

// ─── schemas/enum.schemas.ts ──────────────────────────────────────────────────
// Full-set validators use `z.nativeEnum`; tied to the enum, never to literals.

export const productStatusSchema = z.nativeEnum(ProductStatusEnum);
export type ProductStatusDTO = z.infer<typeof productStatusSchema>;

export const productKindSchema = z.nativeEnum(ProductKindEnum);
export type ProductKindDTO = z.infer<typeof productKindSchema>;

// ─── schemas/product-content.schema.ts ────────────────────────────────────────
// Discriminator branches use `z.literal(EnumName.MEMBER)`.

export const productContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ProductKindEnum.PHYSICAL),
    weightGrams: z.number().int().positive(),
    shipsFrom: z.string().min(1),
  }),
  z.object({
    type: z.literal(ProductKindEnum.DIGITAL),
    downloadUrl: z.string().url(),
    sizeBytes: z.number().int().positive(),
  }),
  z.object({
    type: z.literal(ProductKindEnum.SUBSCRIPTION),
    intervalDays: z.number().int().positive(),
    trialDays: z.number().int().nonnegative().optional(),
  }),
]);

export type ProductContentDTO = z.infer<typeof productContentSchema>;

// ─── dtos/create-product.dto.ts ───────────────────────────────────────────────
// Command input. Schema first; DTO type via `z.infer`.

export const createProductDtoSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  status: productStatusSchema, // full-set field ⇒ z.nativeEnum
  content: productContentSchema, // discriminated union ⇒ z.literal branches
});

export type CreateProductDTO = z.infer<typeof createProductDtoSchema>;

// ─── dtos/product-response.dto.ts ─────────────────────────────────────────────
// Response payload. Separate from the create DTO — no field leakage.

export const productResponseDtoSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  status: productStatusSchema,
  content: productContentSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProductResponseDTO = z.infer<typeof productResponseDtoSchema>;
