import { describe, it, expect } from 'vitest';
import {
  MetricType,
  AchievementMetricType,
} from '../../../../domain/value-objects/achievement-metric-type.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

describe('MetricType', () => {
  describe('create()', () => {
    it('returns Right for workout_count', () => {
      const result = MetricType.create('workout_count');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('workout_count');
      }
    });

    it('returns Right for streak_days', () => {
      const result = MetricType.create('streak_days');
      expect(result.isRight()).toBe(true);
    });

    it('returns Right for user_age_days', () => {
      const result = MetricType.create('user_age_days');
      expect(result.isRight()).toBe(true);
    });

    it('returns Left for unrecognized metric', () => {
      const result = MetricType.create('unknown_metric');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_METRIC_TYPE);
      }
    });

    it('returns Left for empty string', () => {
      const result = MetricType.create('');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isWorkoutMetric()', () => {
    it('returns true for workout_count', () => {
      const result = MetricType.create(AchievementMetricType.WORKOUT_COUNT);
      if (result.isRight()) {
        expect(result.value.isWorkoutMetric()).toBe(true);
        expect(result.value.isStreakMetric()).toBe(false);
        expect(result.value.isMilestoneMetric()).toBe(false);
      }
    });
  });

  describe('isStreakMetric()', () => {
    it('returns true for streak_days', () => {
      const result = MetricType.create(AchievementMetricType.STREAK_DAYS);
      if (result.isRight()) {
        expect(result.value.isWorkoutMetric()).toBe(false);
        expect(result.value.isStreakMetric()).toBe(true);
        expect(result.value.isMilestoneMetric()).toBe(false);
      }
    });
  });

  describe('isMilestoneMetric()', () => {
    it('returns true for user_age_days', () => {
      const result = MetricType.create(AchievementMetricType.USER_AGE_DAYS);
      if (result.isRight()) {
        expect(result.value.isWorkoutMetric()).toBe(false);
        expect(result.value.isStreakMetric()).toBe(false);
        expect(result.value.isMilestoneMetric()).toBe(true);
      }
    });
  });

  describe('toString()', () => {
    it('returns the metric value string', () => {
      const result = MetricType.create('workout_count');
      if (result.isRight()) {
        expect(result.value.toString()).toBe('workout_count');
      }
    });
  });

  describe('equals()', () => {
    it('returns true for same metric', () => {
      const a = MetricType.create('workout_count');
      const b = MetricType.create('workout_count');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('returns false for different metrics', () => {
      const a = MetricType.create('workout_count');
      const b = MetricType.create('streak_days');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });
});
