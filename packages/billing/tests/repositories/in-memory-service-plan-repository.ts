import type { UniqueEntityId } from '@fittrack/core';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { ServicePlan } from '../../domain/aggregates/service-plan.js';

export class InMemoryServicePlanRepository implements IServicePlanRepository {
  items: ServicePlan[] = [];

  async findById(id: UniqueEntityId): Promise<ServicePlan | null> {
    return this.items.find((p) => p.id === id.value) ?? null;
  }

  async findByProfessionalProfileId(profileId: string): Promise<ServicePlan[]> {
    return this.items.filter((p) => p.professionalProfileId === profileId);
  }

  async save(entity: ServicePlan): Promise<void> {
    const index = this.items.findIndex((p) => p.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
