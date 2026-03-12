import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidGoalPriorityError } from '../errors/invalid-goal-priority-error.js';

export const GOAL_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type GoalPriorityValue = (typeof GOAL_PRIORITIES)[number];

interface GoalPriorityProps {
  value: GoalPriorityValue;
}

export class GoalPriority extends ValueObject<GoalPriorityProps> {
  private constructor(props: GoalPriorityProps) {
    super(props);
  }

  static create(priority: string): DomainResult<GoalPriority> {
    if (!GOAL_PRIORITIES.includes(priority as GoalPriorityValue)) {
      return left(new InvalidGoalPriorityError(priority));
    }
    return right(new GoalPriority({ value: priority as GoalPriorityValue }));
  }

  get value(): GoalPriorityValue {
    return this.props.value;
  }
}
