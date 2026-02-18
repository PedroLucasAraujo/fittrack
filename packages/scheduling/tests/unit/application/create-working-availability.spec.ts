import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateWorkingAvailability } from '../../../application/use-cases/create-working-availability.js';
import { InMemoryWorkingAvailabilityRepository } from '../../repositories/in-memory-working-availability-repository.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { DayOfWeek } from '../../../domain/enums/day-of-week.js';

describe('CreateWorkingAvailability', () => {
  let repository: InMemoryWorkingAvailabilityRepository;
  let sut: CreateWorkingAvailability;

  beforeEach(() => {
    repository = new InMemoryWorkingAvailabilityRepository();
    sut = new CreateWorkingAvailability(repository);
  });

  it('creates working availability with valid slots', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      dayOfWeek: DayOfWeek.MONDAY,
      timezoneUsed: 'America/Sao_Paulo',
      slots: [
        { startTime: '08:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '18:00' },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.slots).toHaveLength(2);
      expect(result.value.dayOfWeek).toBe(DayOfWeek.MONDAY);
    }
    expect(repository.items).toHaveLength(1);
  });

  it('returns error for invalid day of week', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      dayOfWeek: 99, // invalid
      timezoneUsed: 'America/Sao_Paulo',
      slots: [{ startTime: '08:00', endTime: '12:00' }],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid time slot format', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      dayOfWeek: DayOfWeek.TUESDAY,
      timezoneUsed: 'America/Sao_Paulo',
      slots: [{ startTime: '8:00', endTime: '12:00' }], // invalid format
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_TIME_SLOT);
    }
  });

  it('returns error for overlapping slots', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      dayOfWeek: DayOfWeek.WEDNESDAY,
      timezoneUsed: 'America/Sao_Paulo',
      slots: [
        { startTime: '08:00', endTime: '12:00' },
        { startTime: '11:00', endTime: '15:00' },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.OVERLAPPING_TIME_SLOT);
    }
  });

  it('creates with empty slots', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      dayOfWeek: DayOfWeek.SUNDAY,
      timezoneUsed: 'America/Sao_Paulo',
      slots: [],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.slots).toHaveLength(0);
    }
  });
});
