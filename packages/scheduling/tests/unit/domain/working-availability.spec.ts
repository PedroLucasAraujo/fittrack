import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { DayOfWeek } from '../../../domain/enums/day-of-week.js';
import { TimeSlot } from '../../../domain/value-objects/time-slot.js';
import { WorkingAvailability } from '../../../domain/aggregates/working-availability.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { makeWorkingAvailability } from '../../factories/make-working-availability.js';

describe('WorkingAvailability', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with valid non-overlapping slots', () => {
      const slot1 = TimeSlot.create('08:00', '12:00').value as TimeSlot;
      const slot2 = TimeSlot.create('13:00', '17:00').value as TimeSlot;

      const result = WorkingAvailability.create({
        professionalProfileId: generateId(),
        dayOfWeek: DayOfWeek.MONDAY,
        timezoneUsed: 'America/Sao_Paulo',
        slots: [slot1, slot2],
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.slots).toHaveLength(2);
        expect(result.value.dayOfWeek).toBe(DayOfWeek.MONDAY);
      }
    });

    it('rejects overlapping slots at creation', () => {
      const slot1 = TimeSlot.create('08:00', '12:00').value as TimeSlot;
      const slot2 = TimeSlot.create('11:00', '15:00').value as TimeSlot;

      const result = WorkingAvailability.create({
        professionalProfileId: generateId(),
        dayOfWeek: DayOfWeek.TUESDAY,
        timezoneUsed: 'America/Sao_Paulo',
        slots: [slot1, slot2],
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.OVERLAPPING_TIME_SLOT);
      }
    });

    it('creates with empty slots', () => {
      const result = WorkingAvailability.create({
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

    it('does not emit domain events', () => {
      const slot = TimeSlot.create('09:00', '10:00').value as TimeSlot;
      const result = WorkingAvailability.create({
        professionalProfileId: generateId(),
        dayOfWeek: DayOfWeek.WEDNESDAY,
        timezoneUsed: 'UTC',
        slots: [slot],
      });

      if (result.isRight()) {
        expect(result.value.getDomainEvents()).toHaveLength(0);
      }
    });
  });

  // ── addSlot ───────────────────────────────────────────────────────────────

  describe('addSlot()', () => {
    it('adds a non-overlapping slot', () => {
      const availability = makeWorkingAvailability({
        slots: [TimeSlot.create('08:00', '12:00').value as TimeSlot],
      });

      const newSlot = TimeSlot.create('14:00', '18:00').value as TimeSlot;
      const result = availability.addSlot(newSlot);

      expect(result.isRight()).toBe(true);
      expect(availability.slots).toHaveLength(2);
    });

    it('rejects an overlapping slot', () => {
      const availability = makeWorkingAvailability({
        slots: [TimeSlot.create('08:00', '12:00').value as TimeSlot],
      });

      const overlapping = TimeSlot.create('11:00', '14:00').value as TimeSlot;
      const result = availability.addSlot(overlapping);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.OVERLAPPING_TIME_SLOT);
      }
    });
  });

  // ── replaceSlots ──────────────────────────────────────────────────────────

  describe('replaceSlots()', () => {
    it('replaces all slots with new valid set', () => {
      const availability = makeWorkingAvailability();

      const newSlot = TimeSlot.create('14:00', '18:00').value as TimeSlot;
      const result = availability.replaceSlots([newSlot]);

      expect(result.isRight()).toBe(true);
      expect(availability.slots).toHaveLength(1);
      expect(availability.slots[0]!.startTime).toBe('14:00');
    });

    it('rejects overlapping new slots', () => {
      const availability = makeWorkingAvailability();

      const slot1 = TimeSlot.create('08:00', '12:00').value as TimeSlot;
      const slot2 = TimeSlot.create('10:00', '14:00').value as TimeSlot;

      const result = availability.replaceSlots([slot1, slot2]);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.OVERLAPPING_TIME_SLOT);
      }
    });

    it('allows replacing with empty slots', () => {
      const availability = makeWorkingAvailability();

      const result = availability.replaceSlots([]);

      expect(result.isRight()).toBe(true);
      expect(availability.slots).toHaveLength(0);
    });
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const profId = generateId();
      const availability = makeWorkingAvailability({
        professionalProfileId: profId,
        dayOfWeek: DayOfWeek.FRIDAY,
        timezoneUsed: 'Europe/London',
      });

      expect(availability.professionalProfileId).toBe(profId);
      expect(availability.dayOfWeek).toBe(DayOfWeek.FRIDAY);
      expect(availability.timezoneUsed).toBe('Europe/London');
      expect(availability.createdAtUtc).toBeDefined();
      expect(availability.updatedAtUtc).toBeDefined();
    });
  });
});
