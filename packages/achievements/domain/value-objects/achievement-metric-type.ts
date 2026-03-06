import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidMetricTypeError } from '../errors/invalid-metric-type-error.js';

/**
 * Achievement-specific metric types (distinct from Metrics module MetricType).
 * Used in AchievementCriteria to define what is measured.
 */
export const AchievementMetricType = {
  WORKOUT_COUNT: 'workout_count',
  STREAK_DAYS: 'streak_days',
  USER_AGE_DAYS: 'user_age_days',
} as const;

export type AchievementMetricTypeValue =
  (typeof AchievementMetricType)[keyof typeof AchievementMetricType];

/**
 * Value object representing the measurable quantity tracked by an achievement.
 *
 * Whitelisted to prevent arbitrary metric strings from entering the domain.
 */
export class MetricType {
  private constructor(readonly value: AchievementMetricTypeValue) {}

  static create(value: string): DomainResult<MetricType> {
    const validValues: string[] = Object.values(AchievementMetricType);
    if (!validValues.includes(value)) {
      return left(new InvalidMetricTypeError(value));
    }
    return right(new MetricType(value as AchievementMetricTypeValue));
  }

  isWorkoutMetric(): boolean {
    return this.value === AchievementMetricType.WORKOUT_COUNT;
  }

  isStreakMetric(): boolean {
    return this.value === AchievementMetricType.STREAK_DAYS;
  }

  isMilestoneMetric(): boolean {
    return this.value === AchievementMetricType.USER_AGE_DAYS;
  }

  equals(other: MetricType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
