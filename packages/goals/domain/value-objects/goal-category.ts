import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidGoalCategoryError } from '../errors/invalid-goal-category-error.js';

export const GOAL_CATEGORIES = [
  'WEIGHT_LOSS',
  'MUSCLE_GAIN',
  'PERFORMANCE',
  'HEALTH',
  'HABIT',
  'CONSISTENCY',
  'NUTRITION',
] as const;

export type GoalCategoryValue = (typeof GOAL_CATEGORIES)[number];

interface GoalCategoryProps {
  value: GoalCategoryValue;
}

export class GoalCategory extends ValueObject<GoalCategoryProps> {
  private constructor(props: GoalCategoryProps) {
    super(props);
  }

  static create(category: string): DomainResult<GoalCategory> {
    if (!GOAL_CATEGORIES.includes(category as GoalCategoryValue)) {
      return left(new InvalidGoalCategoryError(category));
    }
    return right(new GoalCategory({ value: category as GoalCategoryValue }));
  }

  isWeightRelated(): boolean {
    return this.props.value === 'WEIGHT_LOSS' || this.props.value === 'MUSCLE_GAIN';
  }

  isPerformanceRelated(): boolean {
    return this.props.value === 'PERFORMANCE';
  }

  get value(): GoalCategoryValue {
    return this.props.value;
  }
}
