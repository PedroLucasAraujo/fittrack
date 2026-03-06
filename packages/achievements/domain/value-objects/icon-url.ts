import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAchievementDefinitionError } from '../errors/invalid-achievement-definition-error.js';

const MAX_LENGTH = 2048;

export class IconUrl {
  private constructor(readonly value: string) {}

  static create(value: string): DomainResult<IconUrl> {
    if (!value || value.trim().length === 0) {
      return left(new InvalidAchievementDefinitionError('iconUrl cannot be empty'));
    }
    const trimmed = value.trim();
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidAchievementDefinitionError(`iconUrl must be at most ${MAX_LENGTH} characters`),
      );
    }
    return right(new IconUrl(trimmed));
  }

  equals(other: IconUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
