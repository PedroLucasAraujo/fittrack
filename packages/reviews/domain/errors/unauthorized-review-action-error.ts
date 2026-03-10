import { DomainError } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';
import type { ReviewErrorCode } from './review-error-codes.js';

export class UnauthorizedReviewActionError extends DomainError {
  constructor(action: string) {
    super(
      `Unauthorized review action: ${action}`,
      ReviewErrorCodes.UNAUTHORIZED_REVIEW_ACTION as ReviewErrorCode,
      { action },
    );
  }
}
