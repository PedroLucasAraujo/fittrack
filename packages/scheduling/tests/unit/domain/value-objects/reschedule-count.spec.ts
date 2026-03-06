import { describe, it, expect } from 'vitest';
import { RescheduleCount } from '../../../../domain/value-objects/reschedule-count.js';
import { SchedulingErrorCodes } from '../../../../domain/errors/scheduling-error-codes.js';

describe('RescheduleCount', () => {
  describe('create()', () => {
    it('creates a count with value 0', () => {
      const result = RescheduleCount.create(0);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe(0);
      }
    });

    it('creates a count with a positive integer', () => {
      const result = RescheduleCount.create(3);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe(3);
      }
    });

    it('rejects a negative value', () => {
      const result = RescheduleCount.create(-1);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });

    it('rejects a non-integer value', () => {
      const result = RescheduleCount.create(1.5);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });
  });

  describe('zero()', () => {
    it('returns a RescheduleCount with value 0', () => {
      const count = RescheduleCount.zero();
      expect(count.value).toBe(0);
    });
  });

  describe('increment()', () => {
    it('returns a new RescheduleCount with value + 1', () => {
      const count = RescheduleCount.zero();
      const incremented = count.increment();

      expect(incremented.value).toBe(1);
      expect(count.value).toBe(0); // original unchanged
    });

    it('increments multiple times correctly', () => {
      const count = RescheduleCount.zero().increment().increment();
      expect(count.value).toBe(2);
    });
  });

  describe('exceeds()', () => {
    it('returns false when count is below max', () => {
      const count = RescheduleCount.zero();
      expect(count.exceeds(2)).toBe(false);
    });

    it('returns true when count equals max', () => {
      const count = RescheduleCount.zero().increment().increment(); // value = 2
      expect(count.exceeds(2)).toBe(true);
    });

    it('returns true when count is above max', () => {
      const count = RescheduleCount.zero().increment().increment().increment(); // value = 3
      expect(count.exceeds(2)).toBe(true);
    });

    it('returns false when max is 0 and count is 0', () => {
      const count = RescheduleCount.zero(); // value = 0
      expect(count.exceeds(0)).toBe(true); // 0 >= 0 → true
    });
  });
});
