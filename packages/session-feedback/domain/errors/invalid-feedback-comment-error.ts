import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class InvalidFeedbackCommentError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid feedback comment: ${reason}`,
      SessionFeedbackErrorCodes.INVALID_COMMENT as unknown as ErrorCode,
    );
  }
}
