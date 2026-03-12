import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class BookingNotCompletedError extends DomainError {
  constructor(bookingId: string) {
    super(
      `Feedback can only be submitted for completed bookings. Booking ${bookingId} is not in COMPLETED status.`,
      SessionFeedbackErrorCodes.BOOKING_NOT_COMPLETED as unknown as ErrorCode,
      { bookingId },
    );
  }
}
