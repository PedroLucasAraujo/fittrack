import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidMetricTypeError } from '../errors/invalid-metric-type-error.js';

export type MetricTypeValue =
  | 'WORKOUT_COUNT'
  | 'TOTAL_VOLUME'
  | 'STREAK_DAYS'
  | 'NUTRITION_LOG_COUNT';

const VALID_METRIC_TYPES: MetricTypeValue[] = [
  'WORKOUT_COUNT',
  'TOTAL_VOLUME',
  'STREAK_DAYS',
  'NUTRITION_LOG_COUNT',
];

export interface MetricTypeProps {
  value: MetricTypeValue;
}

export class MetricType extends ValueObject<MetricTypeProps> {
  private constructor(props: MetricTypeProps) {
    super(props);
  }

  static create(value: string): DomainResult<MetricType> {
    if (!VALID_METRIC_TYPES.includes(value as MetricTypeValue)) {
      return left(new InvalidMetricTypeError());
    }
    return right(new MetricType({ value: value as MetricTypeValue }));
  }

  get value(): MetricTypeValue {
    return this.props.value;
  }

  isWorkoutCount(): boolean {
    return this.props.value === 'WORKOUT_COUNT';
  }

  isTotalVolume(): boolean {
    return this.props.value === 'TOTAL_VOLUME';
  }

  isStreakDays(): boolean {
    return this.props.value === 'STREAK_DAYS';
  }

  isNutritionLogCount(): boolean {
    return this.props.value === 'NUTRITION_LOG_COUNT';
  }
}
