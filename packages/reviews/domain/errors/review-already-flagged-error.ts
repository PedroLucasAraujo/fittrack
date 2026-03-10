import { DomainError } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';
import type { ReviewErrorCode } from './review-error-codes.js';

export class ReviewAlreadyFlaggedError extends DomainError {
  constructor(reviewId: string) {
    super(
      `Review ${reviewId} is already flagged.`,
      ReviewErrorCodes.REVIEW_ALREADY_FLAGGED as ReviewErrorCode,
      { reviewId },
    );
  }
}
