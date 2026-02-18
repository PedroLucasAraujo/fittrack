import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class DoubleBookingError extends DomainError {
  constructor(sessionId: string, logicalDay: string) {
    super(
      `A booking already exists for this session on the given day.`,
      SchedulingErrorCodes.DOUBLE_BOOKING as ErrorCode,
      { sessionId, logicalDay },
    );
  }
}
