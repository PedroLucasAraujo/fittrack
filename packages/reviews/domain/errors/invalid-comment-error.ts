import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

export class InvalidCommentError extends DomainError {
  constructor(reason: string) {
    super(`Invalid comment: ${reason}`, ReviewErrorCodes.INVALID_COMMENT as unknown as ErrorCode);
  }
}
