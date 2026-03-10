import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidRatingError } from '../errors/invalid-rating-error.js';

/**
 * A single rating criterion score from 1 to 5 (integer only).
 * Used as one of five dimensions in the Ratings composite VO.
 */
export class Rating {
  private constructor(readonly value: number) {}

  /**
   * Creates a Rating from a number.
   * Returns Left<InvalidRatingError> if value is not an integer in [1, 5].
   */
  static create(value: number): DomainResult<Rating> {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
      return left(new InvalidRatingError(value));
    }
    return right(new Rating(value));
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: Rating): boolean {
    return this.value === other.value;
  }
}
