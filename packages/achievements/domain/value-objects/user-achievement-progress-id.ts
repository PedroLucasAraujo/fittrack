import { generateId } from '@fittrack/core';

/**
 * Strongly-typed identity for UserAchievementProgress aggregate.
 */
export class UserAchievementProgressId {
  private constructor(readonly value: string) {}

  static generate(): UserAchievementProgressId {
    return new UserAchievementProgressId(generateId());
  }

  static fromString(value: string): UserAchievementProgressId {
    return new UserAchievementProgressId(value);
  }

  equals(other: UserAchievementProgressId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
