import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidReviewError } from '../errors/invalid-review-error.js';

const MIN_SESSIONS_FOR_REVIEW = 5;
const ADDITIONAL_SESSIONS_FOR_UPDATE = 20;

/**
 * The number of completed sessions between a client and a professional.
 * Used for anti-fraud verification (ADR-0068 §3).
 */
export class SessionCount {
  private constructor(readonly value: number) {}

  /**
   * Creates a SessionCount.
   * Returns Left<InvalidReviewError> if count is negative.
   */
  static create(count: number): DomainResult<SessionCount> {
    if (!Number.isInteger(count) || count < 0) {
      return left(
        new InvalidReviewError(`session count must be a non-negative integer; got ${count}`),
      );
    }
    return right(new SessionCount(count));
  }

  /**
   * True when the client has enough sessions to submit their first review
   * (at least 5 completed sessions with the professional).
   */
  isEligibleForReview(): boolean {
    return this.value >= MIN_SESSIONS_FOR_REVIEW;
  }

  /**
   * True when the client has enough additional sessions since their last review
   * to submit a new one (at least 20 additional sessions).
   */
  isEligibleForUpdate(sessionCountAtLastReview: number): boolean {
    return this.value - sessionCountAtLastReview >= ADDITIONAL_SESSIONS_FOR_UPDATE;
  }

  equals(other: SessionCount): boolean {
    return this.value === other.value;
  }
}
