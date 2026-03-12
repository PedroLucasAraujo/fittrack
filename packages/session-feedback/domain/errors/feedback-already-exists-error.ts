import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class FeedbackAlreadyExistsError extends DomainError {
  constructor(bookingId: string) {
    super(
      `A feedback already exists for booking ${bookingId}. Only one feedback is allowed per booking.`,
      SessionFeedbackErrorCodes.FEEDBACK_ALREADY_EXISTS as unknown as ErrorCode,
      { bookingId },
    );
  }
}
