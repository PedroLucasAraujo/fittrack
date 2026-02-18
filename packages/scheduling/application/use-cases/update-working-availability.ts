import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TimeSlot } from '../../domain/value-objects/time-slot.js';
import { WorkingAvailabilityNotFoundError } from '../../domain/errors/working-availability-not-found-error.js';
import type { IWorkingAvailabilityRepository } from '../../domain/repositories/working-availability-repository.js';
import type { UpdateWorkingAvailabilityInputDTO } from '../dtos/update-working-availability-input-dto.js';
import type { UpdateWorkingAvailabilityOutputDTO } from '../dtos/update-working-availability-output-dto.js';

/**
 * Replaces all time slots for an existing WorkingAvailability.
 *
 * Validates tenant isolation (professionalProfileId from JWT).
 */
export class UpdateWorkingAvailability {
  constructor(private readonly workingAvailabilityRepository: IWorkingAvailabilityRepository) {}

  async execute(
    dto: UpdateWorkingAvailabilityInputDTO,
  ): Promise<DomainResult<UpdateWorkingAvailabilityOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.workingAvailabilityId);
    if (idResult.isLeft()) return left(idResult.value);

    const availability = await this.workingAvailabilityRepository.findById(idResult.value);

    // Tenant isolation: return 404 for cross-tenant access (ADR-0025)
    if (!availability || availability.professionalProfileId !== dto.professionalProfileId) {
      return left(new WorkingAvailabilityNotFoundError(dto.workingAvailabilityId));
    }

    // Validate and create new time slots
    const slots: TimeSlot[] = [];
    for (const slotDto of dto.slots) {
      const slotResult = TimeSlot.create(slotDto.startTime, slotDto.endTime);
      if (slotResult.isLeft()) return left(slotResult.value);
      slots.push(slotResult.value);
    }

    const replaceResult = availability.replaceSlots(slots);
    if (replaceResult.isLeft()) return left(replaceResult.value);

    await this.workingAvailabilityRepository.save(availability);

    return right({
      workingAvailabilityId: availability.id,
      slots: availability.slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      updatedAtUtc: availability.updatedAtUtc.toISO(),
    });
  }
}
