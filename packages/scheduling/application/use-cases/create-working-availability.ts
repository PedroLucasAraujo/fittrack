import { left, right } from '@fittrack/core';
import type { DomainResult, DomainError } from '@fittrack/core';
import { DayOfWeek } from '../../domain/enums/day-of-week.js';
import { TimeSlot } from '../../domain/value-objects/time-slot.js';
import { WorkingAvailability } from '../../domain/aggregates/working-availability.js';
import { ProfessionalBannedError } from '../../domain/errors/professional-banned-error.js';
import type { IWorkingAvailabilityRepository } from '../../domain/repositories/working-availability-repository.js';
import type { CreateWorkingAvailabilityInputDTO } from '../dtos/create-working-availability-input-dto.js';
import type { CreateWorkingAvailabilityOutputDTO } from '../dtos/create-working-availability-output-dto.js';
import { SchedulingErrorCodes } from '../../domain/errors/scheduling-error-codes.js';
import { DomainInvariantError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';

/**
 * Creates a WorkingAvailability for a professional on a specific day of the week.
 *
 * ## Enforced invariants
 *
 * 1. Banned state (ADR-0022 / ADR-0041 §2): BANNED blocks all new domain entities.
 * 2. Per ADR-0010 §7: availability windows use the professional's timezone.
 */
export class CreateWorkingAvailability {
  constructor(private readonly workingAvailabilityRepository: IWorkingAvailabilityRepository) {}

  async execute(
    dto: CreateWorkingAvailabilityInputDTO,
    isBanned: boolean,
  ): Promise<DomainResult<CreateWorkingAvailabilityOutputDTO>> {
    // 1. Banned state enforcement (ADR-0022 / ADR-0041 §2)
    if (isBanned) {
      return left(new ProfessionalBannedError(dto.professionalProfileId));
    }

    // Validate dayOfWeek
    const dayOfWeek = dto.dayOfWeek as DayOfWeek;
    if (!Object.values(DayOfWeek).includes(dayOfWeek)) {
      return left(
        new DomainInvariantError(
          `Invalid day of week: ${dto.dayOfWeek}. Expected 1 (Monday) to 7 (Sunday).`,
          SchedulingErrorCodes.INVALID_TIME_SLOT as ErrorCode,
          { dayOfWeek: dto.dayOfWeek },
        ),
      );
    }

    // Validate and create time slots
    const slots: TimeSlot[] = [];
    for (const slotDto of dto.slots) {
      const slotResult = TimeSlot.create(slotDto.startTime, slotDto.endTime);
      if (slotResult.isLeft()) return left(slotResult.value);
      slots.push(slotResult.value);
    }

    const availabilityResult = WorkingAvailability.create({
      professionalProfileId: dto.professionalProfileId,
      dayOfWeek,
      timezoneUsed: dto.timezoneUsed,
      slots,
    });
    if (availabilityResult.isLeft()) return left(availabilityResult.value as DomainError);

    const availability = availabilityResult.value;
    await this.workingAvailabilityRepository.save(availability);

    return right({
      workingAvailabilityId: availability.id,
      professionalProfileId: availability.professionalProfileId,
      dayOfWeek: availability.dayOfWeek,
      timezoneUsed: availability.timezoneUsed,
      slots: availability.slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      createdAtUtc: availability.createdAtUtc.toISO(),
    });
  }
}
