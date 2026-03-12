import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

export class UnauthorizedReviewActionError extends DomainError {
  constructor(action: string) {
    super(
      `Unauthorized review action: ${action}`,
      ReviewErrorCodes.UNAUTHORIZED_REVIEW_ACTION as unknown as ErrorCode,
      { action },
    );
  }
}
