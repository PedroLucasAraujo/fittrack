import type { UniqueEntityId, PageRequest, PaginatedResult } from '@fittrack/core';
import type { IExecutionRepository } from '../../domain/repositories/execution-repository.js';
import type { Execution } from '../../domain/aggregates/execution.js';

export class InMemoryExecutionRepository implements IExecutionRepository {
  items: Execution[] = [];

  async findById(id: UniqueEntityId): Promise<Execution | null> {
    return this.items.find((e) => e.id === id.value) ?? null;
  }

  async findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<Execution | null> {
    return (
      this.items.find((e) => e.id === id && e.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findManyByProfessionalProfileId(
    professionalProfileId: string,
    page: PageRequest,
  ): Promise<PaginatedResult<Execution>> {
    const filtered = this.items.filter((e) => e.professionalProfileId === professionalProfileId);
    const start = (page.page - 1) * page.limit;
    const items = filtered.slice(start, start + page.limit);

    return {
      items,
      total: filtered.length,
      page: page.page,
      limit: page.limit,
      hasNextPage: page.page * page.limit < filtered.length,
    };
  }

  async save(entity: Execution): Promise<void> {
    const index = this.items.findIndex((e) => e.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
