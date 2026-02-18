import type { UniqueEntityId } from '@fittrack/core';
import type { IRecurringScheduleRepository } from '../../domain/repositories/recurring-schedule-repository.js';
import type { RecurringSchedule } from '../../domain/aggregates/recurring-schedule.js';

export class InMemoryRecurringScheduleRepository implements IRecurringScheduleRepository {
  items: RecurringSchedule[] = [];

  async findById(id: UniqueEntityId): Promise<RecurringSchedule | null> {
    return this.items.find((r) => r.id === id.value) ?? null;
  }

  async save(entity: RecurringSchedule): Promise<void> {
    const index = this.items.findIndex((r) => r.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }

  async findByIdAndProfessionalProfileId(
    id: UniqueEntityId,
    professionalProfileId: string,
  ): Promise<RecurringSchedule | null> {
    return (
      this.items.find(
        (r) => r.id === id.value && r.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }
}
