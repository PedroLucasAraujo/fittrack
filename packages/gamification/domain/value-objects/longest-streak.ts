import { ValueObject } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import { InvalidStreakCountError } from '../errors/invalid-streak-count-error.js';

const MAX_STREAK_VALUE = 10_000;

interface LongestStreakProps {
  value: number;
}

/**
 * The user's historical personal record for consecutive active days.
 * Always greater than or equal to the current streak. Never decreases.
 */
export class LongestStreak extends ValueObject<LongestStreakProps> {
  private constructor(props: LongestStreakProps) {
    super(props);
  }

  static create(value: number): DomainResult<LongestStreak> {
    if (!Number.isInteger(value) || value < 0 || value > MAX_STREAK_VALUE) {
      return left(
        new InvalidStreakCountError(
          `longestStreak must be a non-negative integer up to ${MAX_STREAK_VALUE}. Received: ${value}.`,
        ),
      );
    }
    return right(new LongestStreak({ value }));
  }

  static zero(): LongestStreak {
    return new LongestStreak({ value: 0 });
  }

  get value(): number {
    return this.props.value;
  }
}
