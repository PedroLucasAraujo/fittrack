import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { UpdateWorkingAvailability } from '../../../application/use-cases/update-working-availability.js';
import { InMemoryWorkingAvailabilityRepository } from '../../repositories/in-memory-working-availability-repository.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { makeWorkingAvailability } from '../../factories/make-working-availability.js';

describe('UpdateWorkingAvailability', () => {
  let repository: InMemoryWorkingAvailabilityRepository;
  let sut: UpdateWorkingAvailability;
  let professionalProfileId: string;

  beforeEach(() => {
    repository = new InMemoryWorkingAvailabilityRepository();
    sut = new UpdateWorkingAvailability(repository);
    professionalProfileId = generateId();
  });

  it('updates slots successfully', async () => {
    const availability = makeWorkingAvailability({ professionalProfileId });
    repository.items.push(availability);

    const result = await sut.execute({
      workingAvailabilityId: availability.id,
      professionalProfileId,
      slots: [{ startTime: '10:00', endTime: '14:00' }],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.slots).toHaveLength(1);
      expect(result.value.slots[0]!.startTime).toBe('10:00');
    }
  });

  it('returns error for invalid UUID', async () => {
    const result = await sut.execute({
      workingAvailabilityId: 'not-a-uuid',
      professionalProfileId,
      slots: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('returns error when not found', async () => {
    const result = await sut.execute({
      workingAvailabilityId: generateId(),
      professionalProfileId,
      slots: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.WORKING_AVAILABILITY_NOT_FOUND);
    }
  });

  it('returns 404 for cross-tenant access (ADR-0025)', async () => {
    const otherProfId = generateId();
    const availability = makeWorkingAvailability({
      professionalProfileId: otherProfId,
    });
    repository.items.push(availability);

    const result = await sut.execute({
      workingAvailabilityId: availability.id,
      professionalProfileId, // different tenant
      slots: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.WORKING_AVAILABILITY_NOT_FOUND);
    }
  });

  it('returns error for invalid time slot in update', async () => {
    const availability = makeWorkingAvailability({ professionalProfileId });
    repository.items.push(availability);

    const result = await sut.execute({
      workingAvailabilityId: availability.id,
      professionalProfileId,
      slots: [{ startTime: '14:00', endTime: '10:00' }], // start > end
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_TIME_SLOT);
    }
  });

  it('returns error for overlapping slots in update', async () => {
    const availability = makeWorkingAvailability({ professionalProfileId });
    repository.items.push(availability);

    const result = await sut.execute({
      workingAvailabilityId: availability.id,
      professionalProfileId,
      slots: [
        { startTime: '08:00', endTime: '12:00' },
        { startTime: '10:00', endTime: '14:00' },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.OVERLAPPING_TIME_SLOT);
    }
  });
});
