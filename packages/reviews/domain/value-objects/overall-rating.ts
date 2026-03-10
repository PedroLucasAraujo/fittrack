import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidRatingError } from '../errors/invalid-rating-error.js';

/**
 * The overall rating for a review — arithmetic mean of the 5 individual ratings.
 * Rounded to 1 decimal place. Always in range [1.0, 5.0].
 */
export class OverallRating {
  private constructor(readonly value: number) {}

  /**
   * Calculates the overall rating as the arithmetic mean of 5 criterion values.
   * Rounds to 1 decimal place.
   */
  static fromValues(
    professionalism: number,
    communication: number,
    technicalKnowledge: number,
    punctuality: number,
    results: number,
  ): OverallRating {
    const avg = (professionalism + communication + technicalKnowledge + punctuality + results) / 5;
    return new OverallRating(Math.round(avg * 10) / 10);
  }

  /** Creates from a raw number — primarily for reconstitution from persistence. */
  static create(value: number): DomainResult<OverallRating> {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 1.0 || value > 5.0) {
      return left(new InvalidRatingError(value));
    }
    return right(new OverallRating(Math.round(value * 10) / 10));
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: OverallRating): boolean {
    return this.value === other.value;
  }
}
