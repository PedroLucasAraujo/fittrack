import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class InvalidFeedbackError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid session feedback: ${reason}`,
      SessionFeedbackErrorCodes.INVALID_FEEDBACK as unknown as ErrorCode,
    );
  }
}
