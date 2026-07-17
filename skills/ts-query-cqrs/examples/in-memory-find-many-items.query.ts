/**
 * In-memory query mock — standalone example for use case tests.
 * Implements the same interface as the production adapter.
 */
import { Result, PaginatedResultDTO } from "@ddd/shared";
import { FindManyItemsQuery, FindManyItemsInputDTO, ItemListItem } from "./find-many-items.query";

export class InMemoryFindManyItemsQuery implements FindManyItemsQuery {
  public items: (ItemListItem & { categoryId?: string })[] = []; // public: tests seed before act

  async execute(input: FindManyItemsInputDTO): Promise<Result<PaginatedResultDTO<ItemListItem>>> {
    const { page = 1, pageSize = 20, categoryId, active } = input;

    let filtered = this.items;
    if (categoryId !== undefined) filtered = filtered.filter((i) => i.categoryId === categoryId);
    if (active !== undefined) filtered = filtered.filter((i) => i.active === active);

    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);

    return Result.ok({
      data: data.map(({ id, name, sku, active }) => ({ id, name, sku, active })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }
}
