import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAchievementDefinitionError } from '../errors/invalid-achievement-definition-error.js';

const MAX_LENGTH = 100;

export class AchievementName {
  private constructor(readonly value: string) {}

  static create(value: string): DomainResult<AchievementName> {
    if (!value || value.trim().length === 0) {
      return left(new InvalidAchievementDefinitionError('name cannot be empty'));
    }
    const trimmed = value.trim();
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidAchievementDefinitionError(`name must be at most ${MAX_LENGTH} characters`),
      );
    }
    return right(new AchievementName(trimmed));
  }

  equals(other: AchievementName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
