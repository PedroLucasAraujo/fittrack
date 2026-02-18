import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class BookingNotFoundError extends DomainError {
  constructor(bookingId: string) {
    super(`Booking not found.`, SchedulingErrorCodes.BOOKING_NOT_FOUND as ErrorCode, { bookingId });
  }
}
