import { DomainError } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';
import type { ReviewErrorCode } from './review-error-codes.js';

export class InvalidCommentError extends DomainError {
  constructor(reason: string) {
    super(`Invalid comment: ${reason}`, ReviewErrorCodes.INVALID_COMMENT as ReviewErrorCode);
  }
}
