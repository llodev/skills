/**
 * Core query contract — standalone example.
 * Lives in core; no ORM imports.
 * `@acme/shared` is an example package name; use your shared kernel package.
 */
import { Result, PaginatedResultDTO } from "@acme/shared";

export interface ItemListItem {
  id: string;
  name: string;
  sku: string;
  active: boolean;
}

export interface FindManyItemsInputDTO {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  active?: boolean;
}

export interface FindManyItemsQuery {
  execute(input: FindManyItemsInputDTO): Promise<Result<PaginatedResultDTO<ItemListItem>>>;
}
