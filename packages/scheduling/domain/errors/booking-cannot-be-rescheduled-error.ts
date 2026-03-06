import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class BookingCannotBeRescheduledError extends DomainError {
  constructor(currentStatus: string) {
    super(
      `Booking in status "${currentStatus}" cannot be rescheduled. Only open bookings (PENDING or CONFIRMED) are eligible.`,
      SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED as ErrorCode,
      { currentStatus },
    );
  }
}
