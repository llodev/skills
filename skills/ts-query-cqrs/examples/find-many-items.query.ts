/**
 * Core query contract — standalone example.
 * Lives in core; no ORM imports.
 */
import { Result, PaginatedResultDTO } from "@ddd/shared";

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
