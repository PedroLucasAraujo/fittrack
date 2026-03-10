import { describe, it, expect } from 'vitest';
import { ChallengeGoal } from '../../../../domain/value-objects/challenge-goal.js';

describe('ChallengeGoal', () => {
  describe('create()', () => {
    it('creates a valid goal with WORKOUT_COUNT and target 10', () => {
      const result = ChallengeGoal.create('WORKOUT_COUNT', 10);
      expect(result.isRight()).toBe(true);
      const goal = result.value as ChallengeGoal;
      expect(goal.metricType).toBe('WORKOUT_COUNT');
      expect(goal.targetValue).toBe(10);
    });

    it('creates a valid goal with TOTAL_VOLUME and max target 10000', () => {
      const result = ChallengeGoal.create('TOTAL_VOLUME', 10000);
      expect(result.isRight()).toBe(true);
    });

    it('creates a valid goal with STREAK_DAYS', () => {
      const result = ChallengeGoal.create('STREAK_DAYS', 30);
      expect(result.isRight()).toBe(true);
    });

    it('creates a valid goal with NUTRITION_LOG_COUNT', () => {
      const result = ChallengeGoal.create('NUTRITION_LOG_COUNT', 50);
      expect(result.isRight()).toBe(true);
    });

    it('creates a valid goal with minimum target value of 1', () => {
      const result = ChallengeGoal.create('WORKOUT_COUNT', 1);
      expect(result.isRight()).toBe(true);
    });

    it('rejects invalid metricType', () => {
      const result = ChallengeGoal.create('INVALID_METRIC', 10);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects targetValue of 0', () => {
      const result = ChallengeGoal.create('WORKOUT_COUNT', 0);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects targetValue of 10001 (above max)', () => {
      const result = ChallengeGoal.create('WORKOUT_COUNT', 10001);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects negative targetValue', () => {
      const result = ChallengeGoal.create('WORKOUT_COUNT', -1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects non-integer targetValue', () => {
      const result = ChallengeGoal.create('WORKOUT_COUNT', 5.5);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isReached()', () => {
    it('returns true when currentProgress equals targetValue', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.isReached(10)).toBe(true);
    });

    it('returns true when currentProgress exceeds targetValue', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.isReached(15)).toBe(true);
    });

    it('returns false when currentProgress is below targetValue', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.isReached(9)).toBe(false);
    });

    it('returns false when currentProgress is 0 and target is 10', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.isReached(0)).toBe(false);
    });
  });

  describe('toProgressPercentage()', () => {
    it('returns 50 for 5/10 progress', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.toProgressPercentage(5)).toBe(50);
    });

    it('returns 100 for 10/10 progress', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.toProgressPercentage(10)).toBe(100);
    });

    it('caps at 100 when progress exceeds target (15/10)', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.toProgressPercentage(15)).toBe(100);
    });

    it('returns 0 for 0 progress', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 10).value as ChallengeGoal;
      expect(goal.toProgressPercentage(0)).toBe(0);
    });

    it('returns 33 for 1/3 progress (rounded)', () => {
      const goal = ChallengeGoal.create('WORKOUT_COUNT', 3).value as ChallengeGoal;
      expect(goal.toProgressPercentage(1)).toBe(33);
    });
  });
});
