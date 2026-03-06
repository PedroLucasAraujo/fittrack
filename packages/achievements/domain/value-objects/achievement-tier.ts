import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAchievementDefinitionError } from '../errors/invalid-achievement-definition-error.js';

export const AchievementTierType = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
} as const;

export type AchievementTierValue = (typeof AchievementTierType)[keyof typeof AchievementTierType];

const TIER_COLORS: Record<AchievementTierValue, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
};

export class AchievementTier {
  private constructor(readonly value: AchievementTierValue) {}

  static create(value: string): DomainResult<AchievementTier> {
    const validValues: string[] = Object.values(AchievementTierType);
    if (!validValues.includes(value)) {
      return left(
        new InvalidAchievementDefinitionError(
          `"${value}" is not a valid tier. Valid: ${validValues.join(', ')}`,
        ),
      );
    }
    return right(new AchievementTier(value as AchievementTierValue));
  }

  getColor(): string {
    return TIER_COLORS[this.value];
  }

  equals(other: AchievementTier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
