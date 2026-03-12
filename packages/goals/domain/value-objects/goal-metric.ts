import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidGoalMetricError } from '../errors/invalid-goal-metric-error.js';

export const GOAL_METRICS = [
  'WEIGHT',
  'BODY_FAT',
  'STRENGTH',
  'ENDURANCE',
  'STREAK_DAYS',
  'WEEKLY_VOLUME',
  'DAILY_PROTEIN',
  'DAILY_WATER',
] as const;

export type GoalMetricValue = (typeof GOAL_METRICS)[number];

/** Default units per metric type. */
const DEFAULT_UNITS: Record<GoalMetricValue, string> = {
  WEIGHT: 'kg',
  BODY_FAT: '%',
  STRENGTH: 'kg',
  ENDURANCE: 'min',
  STREAK_DAYS: 'days',
  WEEKLY_VOLUME: 'kg',
  DAILY_PROTEIN: 'g',
  DAILY_WATER: 'L',
};

interface GoalMetricProps {
  value: GoalMetricValue;
}

export class GoalMetric extends ValueObject<GoalMetricProps> {
  private constructor(props: GoalMetricProps) {
    super(props);
  }

  static create(metric: string): DomainResult<GoalMetric> {
    if (!GOAL_METRICS.includes(metric as GoalMetricValue)) {
      return left(new InvalidGoalMetricError(metric));
    }
    return right(new GoalMetric({ value: metric as GoalMetricValue }));
  }

  getDefaultUnit(): string {
    return DEFAULT_UNITS[this.props.value];
  }

  /**
   * Whether this metric is typically tracked in a decreasing direction.
   * For example, BODY_FAT goals are usually "lose fat" (decrease).
   * Note: direction is ultimately determined by comparing baseline vs target,
   * not by metric type alone. This helper is used for risk assessment.
   */
  isTypicallyDecreasing(): boolean {
    return this.props.value === 'WEIGHT' || this.props.value === 'BODY_FAT';
  }

  get value(): GoalMetricValue {
    return this.props.value;
  }
}
