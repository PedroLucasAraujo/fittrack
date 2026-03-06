import { describe, it, expect } from 'vitest';
import { CurrentValue } from '../../../../domain/value-objects/current-value.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

describe('CurrentValue', () => {
  describe('create()', () => {
    it('returns Right for valid non-negative integer', () => {
      const result = CurrentValue.create(0);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe(0);
      }
    });

    it('returns Right for positive integer', () => {
      const result = CurrentValue.create(42);
      expect(result.isRight()).toBe(true);
    });

    it('returns Left for negative value', () => {
      const result = CurrentValue.create(-1);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_PROGRESS_VALUE);
      }
    });

    it('returns Left for non-integer', () => {
      const result = CurrentValue.create(1.5);
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for NaN', () => {
      const result = CurrentValue.create(NaN);
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for Infinity', () => {
      const result = CurrentValue.create(Infinity);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('zero()', () => {
    it('returns a CurrentValue of 0', () => {
      const v = CurrentValue.zero();
      expect(v.value).toBe(0);
    });
  });

  describe('increment()', () => {
    it('returns a new CurrentValue incremented by 1', () => {
      const v = CurrentValue.zero();
      const incremented = v.increment();
      expect(incremented.value).toBe(1);
    });

    it('does not mutate the original', () => {
      const original = CurrentValue.zero();
      const _ = original.increment();
      expect(original.value).toBe(0);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = CurrentValue.create(5);
      const b = CurrentValue.create(5);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('returns false for different values', () => {
      const a = CurrentValue.create(5);
      const b = CurrentValue.create(6);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });
});
