import type { UniqueEntityId } from '@fittrack/core';
import type { ISessionRepository } from '../../domain/repositories/session-repository.js';
import type { Session } from '../../domain/aggregates/session.js';

export class InMemorySessionRepository implements ISessionRepository {
  items: Session[] = [];

  async findById(id: UniqueEntityId): Promise<Session | null> {
    return this.items.find((s) => s.id === id.value) ?? null;
  }

  async save(entity: Session): Promise<void> {
    const index = this.items.findIndex((s) => s.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }

  async findByProfessionalProfileId(professionalProfileId: string): Promise<Session[]> {
    return this.items.filter((s) => s.professionalProfileId === professionalProfileId);
  }
}
