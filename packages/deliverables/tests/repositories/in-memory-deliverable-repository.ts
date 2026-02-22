import type { UniqueEntityId, PageRequest, PaginatedResult } from '@fittrack/core';
import type { IDeliverableRepository } from '../../domain/repositories/deliverable-repository.js';
import type { Deliverable } from '../../domain/aggregates/deliverable.js';

export class InMemoryDeliverableRepository implements IDeliverableRepository {
  items: Deliverable[] = [];

  async findById(id: UniqueEntityId): Promise<Deliverable | null> {
    return this.items.find((d) => d.id === id.value) ?? null;
  }

  async findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<Deliverable | null> {
    return (
      this.items.find((d) => d.id === id && d.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findManyByProfessionalProfileId(
    professionalProfileId: string,
    page: PageRequest,
  ): Promise<PaginatedResult<Deliverable>> {
    const filtered = this.items.filter((d) => d.professionalProfileId === professionalProfileId);
    const start = (page.page - 1) * page.pageSize;
    const data = filtered.slice(start, start + page.pageSize);

    return {
      data,
      total: filtered.length,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  async save(entity: Deliverable): Promise<void> {
    const index = this.items.findIndex((d) => d.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
