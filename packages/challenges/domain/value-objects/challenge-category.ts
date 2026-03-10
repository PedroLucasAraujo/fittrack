import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidCategoryError } from '../errors/invalid-category-error.js';

export type ChallengeCategoryValue = 'WORKOUT' | 'NUTRITION' | 'STREAK' | 'VOLUME';

const VALID_CATEGORIES: ChallengeCategoryValue[] = ['WORKOUT', 'NUTRITION', 'STREAK', 'VOLUME'];

export interface ChallengeCategoryProps {
  value: ChallengeCategoryValue;
}

export class ChallengeCategory extends ValueObject<ChallengeCategoryProps> {
  private constructor(props: ChallengeCategoryProps) {
    super(props);
  }

  static create(value: string): DomainResult<ChallengeCategory> {
    if (!VALID_CATEGORIES.includes(value as ChallengeCategoryValue)) {
      return left(new InvalidCategoryError());
    }
    return right(new ChallengeCategory({ value: value as ChallengeCategoryValue }));
  }

  get value(): ChallengeCategoryValue {
    return this.props.value;
  }

  isWorkout(): boolean {
    return this.props.value === 'WORKOUT';
  }

  isNutrition(): boolean {
    return this.props.value === 'NUTRITION';
  }

  isStreak(): boolean {
    return this.props.value === 'STREAK';
  }

  isVolume(): boolean {
    return this.props.value === 'VOLUME';
  }
}
