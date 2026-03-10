import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { MetricType } from './metric-type.js';
import { GoalTarget } from './goal-target.js';

export interface ChallengeGoalProps {
  metricType: string;
  targetValue: number;
}

export class ChallengeGoal extends ValueObject<ChallengeGoalProps> {
  private constructor(props: ChallengeGoalProps) {
    super(props);
  }

  static create(metricType: string, targetValue: number): DomainResult<ChallengeGoal> {
    const metricTypeResult = MetricType.create(metricType);
    if (metricTypeResult.isLeft()) {
      return left(metricTypeResult.value);
    }

    const goalTargetResult = GoalTarget.create(targetValue);
    if (goalTargetResult.isLeft()) {
      return left(goalTargetResult.value);
    }

    return right(new ChallengeGoal({ metricType, targetValue }));
  }

  get metricType(): string {
    return this.props.metricType;
  }

  get targetValue(): number {
    return this.props.targetValue;
  }

  isReached(currentProgress: number): boolean {
    return currentProgress >= this.props.targetValue;
  }

  toProgressPercentage(currentProgress: number): number {
    /* c8 ignore next — defensive: GoalTarget.create() enforces targetValue >= 1; this branch is unreachable in practice */
    if (this.props.targetValue === 0) return 100;
    const raw = (currentProgress / this.props.targetValue) * 100;
    return Math.min(100, Math.round(raw));
  }
}
