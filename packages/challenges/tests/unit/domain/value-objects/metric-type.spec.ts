import { describe, it, expect } from 'vitest';
import { MetricType } from '../../../../domain/value-objects/metric-type.js';

describe('MetricType', () => {
  describe('create()', () => {
    it('creates WORKOUT_COUNT metric type', () => {
      const result = MetricType.create('WORKOUT_COUNT');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('WORKOUT_COUNT');
    });

    it('creates TOTAL_VOLUME metric type', () => {
      const result = MetricType.create('TOTAL_VOLUME');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('TOTAL_VOLUME');
    });

    it('creates STREAK_DAYS metric type', () => {
      const result = MetricType.create('STREAK_DAYS');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('STREAK_DAYS');
    });

    it('creates NUTRITION_LOG_COUNT metric type', () => {
      const result = MetricType.create('NUTRITION_LOG_COUNT');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('NUTRITION_LOG_COUNT');
    });

    it('rejects invalid metric type', () => {
      const result = MetricType.create('STEPS');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      const result = MetricType.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects lowercase valid value', () => {
      const result = MetricType.create('workout_count');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('type guards', () => {
    it('isWorkoutCount() returns true for WORKOUT_COUNT', () => {
      const m = MetricType.create('WORKOUT_COUNT').value as MetricType;
      expect(m.isWorkoutCount()).toBe(true);
      expect(m.isTotalVolume()).toBe(false);
      expect(m.isStreakDays()).toBe(false);
      expect(m.isNutritionLogCount()).toBe(false);
    });

    it('isTotalVolume() returns true for TOTAL_VOLUME', () => {
      const m = MetricType.create('TOTAL_VOLUME').value as MetricType;
      expect(m.isTotalVolume()).toBe(true);
      expect(m.isWorkoutCount()).toBe(false);
    });

    it('isStreakDays() returns true for STREAK_DAYS', () => {
      const m = MetricType.create('STREAK_DAYS').value as MetricType;
      expect(m.isStreakDays()).toBe(true);
      expect(m.isWorkoutCount()).toBe(false);
    });

    it('isNutritionLogCount() returns true for NUTRITION_LOG_COUNT', () => {
      const m = MetricType.create('NUTRITION_LOG_COUNT').value as MetricType;
      expect(m.isNutritionLogCount()).toBe(true);
      expect(m.isWorkoutCount()).toBe(false);
    });
  });
});
