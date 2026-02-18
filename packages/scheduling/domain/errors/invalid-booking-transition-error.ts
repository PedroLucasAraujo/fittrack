import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidBookingTransitionError extends DomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Invalid booking transition from "${currentStatus}" to "${targetStatus}".`,
      SchedulingErrorCodes.INVALID_BOOKING_TRANSITION as ErrorCode,
      { currentStatus, targetStatus },
    );
  }
}
