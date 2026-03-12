import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

export class ReviewNotFoundError extends DomainError {
  constructor(reviewId: string) {
    super(
      `Review not found: ${reviewId}`,
      ReviewErrorCodes.REVIEW_NOT_FOUND as unknown as ErrorCode,
      {
        reviewId,
      },
    );
  }
}
