import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { MetricType } from './achievement-metric-type.js';
import { CriteriaOperator } from './criteria-operator.js';
import { TargetValue } from './target-value.js';
import { InvalidCriteriaError } from '../errors/invalid-criteria-error.js';

export type TimeWindowValue = 'all_time' | 'monthly' | 'yearly';

const VALID_TIME_WINDOWS: TimeWindowValue[] = ['all_time', 'monthly', 'yearly'];

/**
 * Immutable value object encoding the complete unlock condition for an achievement.
 *
 * Snapshot: criteria are set at definition creation and never changed (ADR-0011 analogy).
 * evaluate() is the canonical test for whether a user's currentValue satisfies the criteria.
 */
export class AchievementCriteria {
  private constructor(
    readonly metric: MetricType,
    readonly operator: CriteriaOperator,
    readonly targetValue: TargetValue,
    readonly timeWindow: TimeWindowValue,
  ) {}

  static create(props: {
    metric: string;
    operator: string;
    targetValue: number;
    timeWindow?: string;
  }): DomainResult<AchievementCriteria> {
    const metricResult = MetricType.create(props.metric);
    if (metricResult.isLeft()) return left(metricResult.value);

    const operatorResult = CriteriaOperator.create(props.operator);
    if (operatorResult.isLeft()) {
      return left(new InvalidCriteriaError(`invalid operator: ${operatorResult.value.message}`));
    }

    const targetResult = TargetValue.create(props.targetValue);
    if (targetResult.isLeft()) return left(targetResult.value);

    const timeWindow = props.timeWindow ?? 'all_time';
    if (!VALID_TIME_WINDOWS.includes(timeWindow as TimeWindowValue)) {
      return left(
        new InvalidCriteriaError(
          `invalid timeWindow "${timeWindow}". Valid: ${VALID_TIME_WINDOWS.join(', ')}`,
        ),
      );
    }

    return right(
      new AchievementCriteria(
        metricResult.value,
        operatorResult.value,
        targetResult.value,
        timeWindow as TimeWindowValue,
      ),
    );
  }

  evaluate(currentValue: number): boolean {
    return this.operator.evaluate(currentValue, this.targetValue.value);
  }

  equals(other: AchievementCriteria): boolean {
    return (
      this.metric.equals(other.metric) &&
      this.operator.equals(other.operator) &&
      this.targetValue.equals(other.targetValue) &&
      this.timeWindow === other.timeWindow
    );
  }
}
