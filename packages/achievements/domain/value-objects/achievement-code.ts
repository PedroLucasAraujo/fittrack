import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAchievementCodeError } from '../errors/invalid-achievement-code-error.js';

const UPPERCASE_SNAKE_CASE_REGEX = /^[A-Z][A-Z0-9_]*$/;
const MAX_LENGTH = 50;

/**
 * Achievement code value object.
 *
 * Validates format only: UPPERCASE_SNAKE_CASE, max 50 characters.
 * Uniqueness is enforced by the repository (no two definitions share the same code).
 * The whitelist of known codes lives in the seed data, not in the domain,
 * so new achievements can be added without modifying the domain layer.
 */
export class AchievementCode {
  private constructor(readonly value: string) {}

  static create(value: string): DomainResult<AchievementCode> {
    if (!value || value.trim().length === 0) {
      return left(new InvalidAchievementCodeError('code cannot be empty'));
    }

    const trimmed = value.trim();

    if (trimmed.length > MAX_LENGTH) {
      return left(new InvalidAchievementCodeError(`code must be at most ${MAX_LENGTH} characters`));
    }

    if (!UPPERCASE_SNAKE_CASE_REGEX.test(trimmed)) {
      return left(
        new InvalidAchievementCodeError('code must be UPPERCASE_SNAKE_CASE (e.g. FIRST_WORKOUT)'),
      );
    }

    return right(new AchievementCode(trimmed));
  }

  equals(other: AchievementCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
