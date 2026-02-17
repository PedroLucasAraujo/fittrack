import type { UniqueEntityId } from '@fittrack/core';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { ProfessionalProfile } from '../../domain/aggregates/professional-profile.js';

/**
 * In-memory implementation of IProfessionalProfileRepository for unit testing.
 *
 * Stores profiles in an array and supports upsert semantics on `save()`.
 */
export class InMemoryProfessionalProfileRepository implements IProfessionalProfileRepository {
  items: ProfessionalProfile[] = [];

  async findById(id: UniqueEntityId): Promise<ProfessionalProfile | null> {
    return this.items.find((p) => p.id === id.value) ?? null;
  }

  async findByUserId(userId: string): Promise<ProfessionalProfile | null> {
    return this.items.find((p) => p.userId === userId) ?? null;
  }

  async save(entity: ProfessionalProfile): Promise<void> {
    const index = this.items.findIndex((p) => p.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
