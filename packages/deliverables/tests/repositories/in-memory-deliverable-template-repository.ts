import type { UniqueEntityId } from '@fittrack/core';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { DeliverableTemplate } from '../../domain/aggregates/deliverable-template.js';
import type { DeliverableType } from '../../domain/enums/deliverable-type.js';
import { TemplateStatus } from '../../domain/enums/template-status.js';

export class InMemoryDeliverableTemplateRepository implements IDeliverableTemplateRepository {
  items: DeliverableTemplate[] = [];

  async findById(id: UniqueEntityId): Promise<DeliverableTemplate | null> {
    return this.items.find((t) => t.id === id.value) ?? null;
  }

  async findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<DeliverableTemplate | null> {
    return (
      this.items.find((t) => t.id === id && t.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findByProfessional(professionalProfileId: string): Promise<DeliverableTemplate[]> {
    return this.items.filter((t) => t.professionalProfileId === professionalProfileId);
  }

  async findActiveByProfessional(professionalProfileId: string): Promise<DeliverableTemplate[]> {
    return this.items.filter(
      (t) =>
        t.professionalProfileId === professionalProfileId && t.status === TemplateStatus.ACTIVE,
    );
  }

  async findByType(
    professionalProfileId: string,
    type: DeliverableType,
  ): Promise<DeliverableTemplate[]> {
    return this.items.filter(
      (t) => t.professionalProfileId === professionalProfileId && t.type === type,
    );
  }

  async existsByProfessionalAndName(professionalProfileId: string, name: string): Promise<boolean> {
    return this.items.some(
      (t) => t.professionalProfileId === professionalProfileId && t.name.value === name,
    );
  }

  async save(entity: DeliverableTemplate): Promise<void> {
    const index = this.items.findIndex((t) => t.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
