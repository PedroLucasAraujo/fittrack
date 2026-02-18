import type { IRepository } from '@fittrack/core';
import type { WorkingAvailability } from '../aggregates/working-availability.js';
import type { DayOfWeek } from '../enums/day-of-week.js';

/**
 * Repository interface for the WorkingAvailability aggregate root (ADR-0004).
 *
 * All queries include `professionalProfileId` for tenant isolation (ADR-0025).
 */
export interface IWorkingAvailabilityRepository extends IRepository<WorkingAvailability> {
  findByProfessionalAndDay(
    professionalProfileId: string,
    dayOfWeek: DayOfWeek,
  ): Promise<WorkingAvailability | null>;

  findAllByProfessionalProfileId(professionalProfileId: string): Promise<WorkingAvailability[]>;
}
