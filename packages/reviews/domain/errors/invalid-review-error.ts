import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

export class InvalidReviewError extends DomainError {
  constructor(reason: string) {
    super(`Invalid review: ${reason}`, ReviewErrorCodes.INVALID_REVIEW as unknown as ErrorCode);
  }
}
