import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class InvalidSessionRatingError extends DomainError {
  constructor(value: unknown) {
    super(
      `Session rating must be an integer between 1 and 5; got ${String(value)}`,
      SessionFeedbackErrorCodes.INVALID_RATING as unknown as ErrorCode,
    );
  }
}
