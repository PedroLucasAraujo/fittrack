import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

export class ReviewAlreadyFlaggedError extends DomainError {
  constructor(reviewId: string) {
    super(
      `Review ${reviewId} is already flagged.`,
      ReviewErrorCodes.REVIEW_ALREADY_FLAGGED as unknown as ErrorCode,
      { reviewId },
    );
  }
}
