/**
 * Reference controller mirroring CelebrationsController from
 * apps/api/src/celebrations/presentation/controllers/celebrations.controller.ts.
 *
 * Patterns shown:
 *   - Thin handlers: validate → call use case → mapResultToHttp(mapper).
 *   - @UseGuards(ApiKeyGuard) per-method on mutations only.
 *   - @Body(new ZodValidationPipe(schema)) with DTO types from the contracts package.
 *   - Module-scoped pipe for path params (idPipe).
 *   - Status conventions: 200 (read/update), 201 (@HttpCode CREATED on POST),
 *     204 (@HttpCode NO_CONTENT on void mutations), 200 (@HttpCode OK on POST actions).
 *
 * Imports below use the path aliases configured in apps/api/tsconfig.json
 * (@shared/*, @products/*) and the BC contracts package
 * (@acme/products-contracts). This file is a documentation example,
 * not a buildable target — it does not exist in the repo.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  createProductDtoSchema,
  updateProductDtoSchema,
  productIdSchema,
  type CreateProductDTO,
  type ProductResponseDTO,
  type UpdateProductDTO,
} from "@acme/products-contracts";
import { ZodValidationPipe } from "@shared/http/zod-validation.pipe";
import { mapResultToHttp } from "@shared/http/result-to-http";
import { ApiKeyGuard } from "../guards/api-key.guard";
import { ProductResponseMapper } from "../mappers/product-response.mapper";
import {
  CreateProduct,
  DeleteProduct,
  GetProductById,
  ListProducts,
  PublishProduct,
  UpdateProduct,
} from "../../application/usecases";

// Module-scoped pipe: instantiate once, reuse on every request.
const idPipe = new ZodValidationPipe(productIdSchema);

@Controller("products")
export class ProductsController {
  constructor(
    private readonly mapper: ProductResponseMapper,
    private readonly list: ListProducts,
    private readonly getById: GetProductById,
    private readonly create: CreateProduct,
    private readonly update: UpdateProduct,
    private readonly publish: PublishProduct,
    private readonly remove: DeleteProduct,
  ) {}

  // READ — public, 200
  @Get()
  async listAll(): Promise<ProductResponseDTO[]> {
    const result = await this.list.execute();
    return await mapResultToHttp(result, async (products) =>
      Promise.all(products.map((p) => this.mapper.toDTO(p))),
    );
  }

  // READ one — public, 200; 404 comes from PRODUCT_NOT_FOUND via the error-codes catalog
  @Get(":id")
  async getOne(@Param("id", idPipe) id: string): Promise<ProductResponseDTO> {
    const result = await this.getById.execute({ id });
    return await mapResultToHttp(result, (p) => this.mapper.toDTO(p));
  }

  // WRITE — guarded, 201
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiKeyGuard)
  async createOne(
    @Body(new ZodValidationPipe(createProductDtoSchema))
    body: CreateProductDTO,
  ): Promise<ProductResponseDTO> {
    const result = await this.create.execute(body);
    return await mapResultToHttp(result, (p) => this.mapper.toDTO(p));
  }

  // WRITE — guarded, 200 (returns updated resource)
  @Put(":id")
  @UseGuards(ApiKeyGuard)
  async updateOne(
    @Param("id", idPipe) id: string,
    @Body(new ZodValidationPipe(updateProductDtoSchema))
    body: UpdateProductDTO,
  ): Promise<ProductResponseDTO> {
    const result = await this.update.execute({ id, ...body });
    return await mapResultToHttp(result, (p) => this.mapper.toDTO(p));
  }

  // ACTION — guarded, 200 (state transition that returns the updated aggregate)
  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  async publishOne(@Param("id", idPipe) id: string): Promise<ProductResponseDTO> {
    const result = await this.publish.execute({ id });
    return await mapResultToHttp(result, (p) => this.mapper.toDTO(p));
  }

  // WRITE — guarded, 204 (void mutation)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard)
  async removeOne(@Param("id", idPipe) id: string): Promise<void> {
    const result = await this.remove.execute({ id });
    return mapResultToHttp(result, () => undefined);
  }
}
