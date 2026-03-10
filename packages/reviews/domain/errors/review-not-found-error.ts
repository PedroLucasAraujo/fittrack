import { DomainError } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';
import type { ReviewErrorCode } from './review-error-codes.js';

export class ReviewNotFoundError extends DomainError {
  constructor(reviewId: string) {
    super(`Review not found: ${reviewId}`, ReviewErrorCodes.REVIEW_NOT_FOUND as ReviewErrorCode, {
      reviewId,
    });
  }
}
