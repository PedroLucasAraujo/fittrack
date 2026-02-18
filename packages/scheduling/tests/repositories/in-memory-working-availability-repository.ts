import type { UniqueEntityId } from '@fittrack/core';
import type { IWorkingAvailabilityRepository } from '../../domain/repositories/working-availability-repository.js';
import type { WorkingAvailability } from '../../domain/aggregates/working-availability.js';
import type { DayOfWeek } from '../../domain/enums/day-of-week.js';

export class InMemoryWorkingAvailabilityRepository implements IWorkingAvailabilityRepository {
  items: WorkingAvailability[] = [];

  async findById(id: UniqueEntityId): Promise<WorkingAvailability | null> {
    return this.items.find((w) => w.id === id.value) ?? null;
  }

  async save(entity: WorkingAvailability): Promise<void> {
    const index = this.items.findIndex((w) => w.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }

  async findByProfessionalAndDay(
    professionalProfileId: string,
    dayOfWeek: DayOfWeek,
  ): Promise<WorkingAvailability | null> {
    return (
      this.items.find(
        (w) => w.professionalProfileId === professionalProfileId && w.dayOfWeek === dayOfWeek,
      ) ?? null
    );
  }

  async findAllByProfessionalProfileId(
    professionalProfileId: string,
  ): Promise<WorkingAvailability[]> {
    return this.items.filter((w) => w.professionalProfileId === professionalProfileId);
  }
}
