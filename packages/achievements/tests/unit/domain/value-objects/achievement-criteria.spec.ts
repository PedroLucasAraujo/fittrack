import { describe, it, expect } from 'vitest';
import { AchievementCriteria } from '../../../../domain/value-objects/achievement-criteria.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

function makeValidCriteria(
  overrides: Partial<Parameters<typeof AchievementCriteria.create>[0]> = {},
) {
  return AchievementCriteria.create({
    metric: 'workout_count',
    operator: '>=',
    targetValue: 10,
    ...overrides,
  });
}

describe('AchievementCriteria', () => {
  describe('create()', () => {
    it('returns Right for valid criteria', () => {
      const result = makeValidCriteria();
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.metric.value).toBe('workout_count');
        expect(result.value.operator.value).toBe('>=');
        expect(result.value.targetValue.value).toBe(10);
        expect(result.value.timeWindow).toBe('all_time');
      }
    });

    it('defaults timeWindow to all_time', () => {
      const result = AchievementCriteria.create({
        metric: 'streak_days',
        operator: '>=',
        targetValue: 7,
      });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.timeWindow).toBe('all_time');
      }
    });

    it('accepts explicit timeWindow', () => {
      const result = AchievementCriteria.create({
        metric: 'workout_count',
        operator: '>=',
        targetValue: 30,
        timeWindow: 'monthly',
      });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.timeWindow).toBe('monthly');
      }
    });

    it('returns Left for invalid metric', () => {
      const result = makeValidCriteria({ metric: 'invalid_metric' });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_METRIC_TYPE);
      }
    });

    it('returns Left for invalid operator', () => {
      const result = makeValidCriteria({ operator: '<' });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_CRITERIA);
      }
    });

    it('returns Left for targetValue <= 0', () => {
      const result = makeValidCriteria({ targetValue: 0 });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_CRITERIA);
      }
    });

    it('returns Left for negative targetValue', () => {
      const result = makeValidCriteria({ targetValue: -5 });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for invalid timeWindow', () => {
      const result = makeValidCriteria({ timeWindow: 'weekly' });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_CRITERIA);
        expect(result.value.message).toMatch(/timeWindow/);
      }
    });
  });

  describe('evaluate()', () => {
    it('returns true when currentValue >= targetValue (>= operator)', () => {
      const result = makeValidCriteria({ operator: '>=', targetValue: 10 });
      if (result.isRight()) {
        expect(result.value.evaluate(10)).toBe(true);
        expect(result.value.evaluate(15)).toBe(true);
      }
    });

    it('returns false when currentValue < targetValue (>= operator)', () => {
      const result = makeValidCriteria({ operator: '>=', targetValue: 10 });
      if (result.isRight()) {
        expect(result.value.evaluate(9)).toBe(false);
        expect(result.value.evaluate(0)).toBe(false);
      }
    });

    it('evaluates > operator correctly', () => {
      const result = makeValidCriteria({ operator: '>', targetValue: 10 });
      if (result.isRight()) {
        expect(result.value.evaluate(10)).toBe(false);
        expect(result.value.evaluate(11)).toBe(true);
      }
    });

    it('evaluates == operator correctly', () => {
      const result = makeValidCriteria({ operator: '==', targetValue: 10 });
      if (result.isRight()) {
        expect(result.value.evaluate(10)).toBe(true);
        expect(result.value.evaluate(11)).toBe(false);
        expect(result.value.evaluate(9)).toBe(false);
      }
    });
  });

  describe('equals()', () => {
    it('returns true for identical criteria', () => {
      const a = makeValidCriteria();
      const b = makeValidCriteria();
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('returns false for different metric', () => {
      const a = makeValidCriteria({ metric: 'workout_count' });
      const b = makeValidCriteria({ metric: 'streak_days' });
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });

    it('returns false for different targetValue', () => {
      const a = makeValidCriteria({ targetValue: 10 });
      const b = makeValidCriteria({ targetValue: 100 });
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });
});
