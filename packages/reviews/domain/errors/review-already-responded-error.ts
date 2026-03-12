import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

/**
 * Raised when a professional calls respond() on a review that already has a
 * response. Use updateResponse() to overwrite an existing response.
 */
export class ReviewAlreadyRespondedError extends DomainError {
  constructor(reviewId: string) {
    super(
      `Review ${reviewId} already has a professional response. Use updateResponse() to overwrite.`,
      ReviewErrorCodes.REVIEW_ALREADY_RESPONDED as unknown as ErrorCode,
      { reviewId },
    );
  }
}
