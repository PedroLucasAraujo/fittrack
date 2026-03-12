import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class NotBookingClientError extends DomainError {
  constructor(bookingId: string) {
    super(
      `Only the client who attended the session can submit feedback for booking ${bookingId}.`,
      SessionFeedbackErrorCodes.NOT_BOOKING_CLIENT as unknown as ErrorCode,
      { bookingId },
    );
  }
}
