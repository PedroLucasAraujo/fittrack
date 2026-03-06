import { generateId } from '@fittrack/core';

/**
 * Strongly-typed identity for AchievementDefinition aggregate.
 * Wraps a UUIDv4 string — no external validation beyond generation.
 */
export class AchievementDefinitionId {
  private constructor(readonly value: string) {}

  static generate(): AchievementDefinitionId {
    return new AchievementDefinitionId(generateId());
  }

  static fromString(value: string): AchievementDefinitionId {
    return new AchievementDefinitionId(value);
  }

  equals(other: AchievementDefinitionId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
