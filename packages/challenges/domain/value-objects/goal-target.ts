import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidGoalTargetError } from '../errors/invalid-goal-target-error.js';

const MIN_TARGET = 1;
const MAX_TARGET = 10_000;

export interface GoalTargetProps {
  value: number;
}

export class GoalTarget extends ValueObject<GoalTargetProps> {
  private constructor(props: GoalTargetProps) {
    super(props);
  }

  static create(value: number): DomainResult<GoalTarget> {
    if (!Number.isInteger(value) || value < MIN_TARGET || value > MAX_TARGET) {
      return left(new InvalidGoalTargetError());
    }
    return right(new GoalTarget({ value }));
  }

  get value(): number {
    return this.props.value;
  }
}
