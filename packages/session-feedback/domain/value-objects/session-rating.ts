import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidSessionRatingError } from '../errors/invalid-session-rating-error.js';

/**
 * SessionRating value object — an integer from 1 to 5.
 *
 * ## Classification
 * - Negative: 1 or 2 (used for risk detection threshold)
 * - Neutral:  3
 * - Positive: 4 or 5
 *
 * Negative feedbacks (rating ≤ 2) trigger risk detection when ≥5 accumulate
 * within a rolling 30-day window (ADR-0057).
 */
export class SessionRating {
  private constructor(readonly value: 1 | 2 | 3 | 4 | 5) {}

  static create(value: number): DomainResult<SessionRating> {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return left(new InvalidSessionRatingError(value));
    }
    return right(new SessionRating(value as 1 | 2 | 3 | 4 | 5));
  }

  /** True when the rating signals a negative experience (1 or 2 stars). */
  isNegative(): boolean {
    return this.value <= 2;
  }

  /** True when the rating is neutral (3 stars). */
  isNeutral(): boolean {
    return this.value === 3;
  }

  /** True when the rating signals a positive experience (4 or 5 stars). */
  isPositive(): boolean {
    return this.value >= 4;
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: SessionRating): boolean {
    return this.value === other.value;
  }
}
