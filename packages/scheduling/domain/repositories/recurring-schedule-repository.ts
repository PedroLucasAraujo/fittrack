import type { IRepository } from '@fittrack/core';
import type { UniqueEntityId } from '@fittrack/core';
import type { RecurringSchedule } from '../aggregates/recurring-schedule.js';

/**
 * Repository interface for the RecurringSchedule aggregate root (ADR-0004).
 *
 * All queries include `professionalProfileId` for tenant isolation (ADR-0025).
 */
export interface IRecurringScheduleRepository extends IRepository<RecurringSchedule> {
  findByIdAndProfessionalProfileId(
    id: UniqueEntityId,
    professionalProfileId: string,
  ): Promise<RecurringSchedule | null>;
}
