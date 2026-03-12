import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class FeedbackWindowClosedError extends DomainError {
  constructor(bookingId: string) {
    super(
      `Feedback window has closed for booking ${bookingId}. Feedback must be submitted within 48 hours of session completion.`,
      SessionFeedbackErrorCodes.FEEDBACK_WINDOW_CLOSED as unknown as ErrorCode,
      { bookingId },
    );
  }
}
