import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

/**
 * Raised when a client attempts to submit a second review for the same
 * professional without having 20 additional sessions since the last review
 * (ADR-0068 §3).
 */
export class DuplicateReviewError extends DomainError {
  constructor(reason: string) {
    super(`Duplicate review: ${reason}`, ReviewErrorCodes.DUPLICATE_REVIEW as unknown as ErrorCode);
  }
}
