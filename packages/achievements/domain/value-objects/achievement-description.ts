import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAchievementDefinitionError } from '../errors/invalid-achievement-definition-error.js';

const MAX_LENGTH = 500;

export class AchievementDescription {
  private constructor(readonly value: string) {}

  static create(value: string): DomainResult<AchievementDescription> {
    if (!value || value.trim().length === 0) {
      return left(new InvalidAchievementDefinitionError('description cannot be empty'));
    }
    const trimmed = value.trim();
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidAchievementDefinitionError(
          `description must be at most ${MAX_LENGTH} characters`,
        ),
      );
    }
    return right(new AchievementDescription(trimmed));
  }

  equals(other: AchievementDescription): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
