import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAchievementDefinitionError } from '../errors/invalid-achievement-definition-error.js';

export const AchievementCategoryType = {
  WORKOUT: 'WORKOUT',
  STREAK: 'STREAK',
  MILESTONE: 'MILESTONE',
  NUTRITION: 'NUTRITION',
  ASSESSMENT: 'ASSESSMENT',
} as const;

export type AchievementCategoryValue =
  (typeof AchievementCategoryType)[keyof typeof AchievementCategoryType];

export class AchievementCategory {
  private constructor(readonly value: AchievementCategoryValue) {}

  static create(value: string): DomainResult<AchievementCategory> {
    const validValues: string[] = Object.values(AchievementCategoryType);
    if (!validValues.includes(value)) {
      return left(
        new InvalidAchievementDefinitionError(
          `"${value}" is not a valid category. Valid: ${validValues.join(', ')}`,
        ),
      );
    }
    return right(new AchievementCategory(value as AchievementCategoryValue));
  }

  equals(other: AchievementCategory): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
