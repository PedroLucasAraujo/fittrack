import type { PageRequest, PaginatedResult } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { ICatalogItemRepository } from '../../domain/repositories/catalog-item-repository.js';
import type { CatalogItem } from '../../domain/aggregates/catalog-item.js';
import type { CatalogItemStatus } from '../../domain/enums/catalog-item-status.js';
import type { CatalogItemType } from '../../domain/enums/catalog-item-type.js';

/**
 * In-memory implementation of ICatalogItemRepository for unit tests.
 *
 * Implements the ownership and visibility rules from the repository interface:
 * - `findByIdForProfessional`: returns global OR tenant-owned items.
 * - `findByIdAndProfessionalProfileId`: returns tenant-owned items only.
 * - `findManyVisibleToProfessional`: returns global + tenant-owned items.
 * - `findManyByProfessionalProfileId`: returns tenant-owned items only.
 */
export class InMemoryCatalogItemRepository implements ICatalogItemRepository {
  public items: CatalogItem[] = [];

  async findById(id: UniqueEntityId): Promise<CatalogItem | null> {
    return this.items.find((item) => item.id === id.value) ?? null;
  }

  async save(item: CatalogItem): Promise<void> {
    const index = this.items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      this.items[index] = item;
    } else {
      this.items.push(item);
    }
  }

  async findByIdForProfessional(
    id: string,
    professionalProfileId: string,
  ): Promise<CatalogItem | null> {
    return (
      this.items.find(
        (item) =>
          item.id === id &&
          (item.professionalProfileId === null ||
            item.professionalProfileId === professionalProfileId),
      ) ?? null
    );
  }

  async findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<CatalogItem | null> {
    return (
      this.items.find(
        (item) => item.id === id && item.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }

  async findManyVisibleToProfessional(
    professionalProfileId: string,
    page: PageRequest,
    filters?: { status?: CatalogItemStatus; type?: CatalogItemType },
  ): Promise<PaginatedResult<CatalogItem>> {
    let filtered = this.items.filter(
      (item) =>
        item.professionalProfileId === null || item.professionalProfileId === professionalProfileId,
    );

    if (filters?.status !== undefined) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }
    if (filters?.type !== undefined) {
      filtered = filtered.filter((item) => item.type === filters.type);
    }

    const total = filtered.length;
    const offset = (page.page - 1) * page.limit;
    const data = filtered.slice(offset, offset + page.limit);

    return {
      items: data,
      total,
      page: page.page,
      limit: page.limit,
      hasNextPage: page.page * page.limit < total,
    };
  }

  async findManyByProfessionalProfileId(
    professionalProfileId: string,
    page: PageRequest,
    filters?: { status?: CatalogItemStatus; type?: CatalogItemType },
  ): Promise<PaginatedResult<CatalogItem>> {
    let filtered = this.items.filter(
      (item) => item.professionalProfileId === professionalProfileId,
    );

    if (filters?.status !== undefined) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }
    if (filters?.type !== undefined) {
      filtered = filtered.filter((item) => item.type === filters.type);
    }

    const total = filtered.length;
    const offset = (page.page - 1) * page.limit;
    const data = filtered.slice(offset, offset + page.limit);

    return {
      items: data,
      total,
      page: page.page,
      limit: page.limit,
      hasNextPage: page.page * page.limit < total,
    };
  }
}
