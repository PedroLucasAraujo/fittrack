import { DomainError } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';
import type { ReviewErrorCode } from './review-error-codes.js';

export class InvalidReviewError extends DomainError {
  constructor(reason: string) {
    super(`Invalid review: ${reason}`, ReviewErrorCodes.INVALID_REVIEW as ReviewErrorCode);
  }
}
