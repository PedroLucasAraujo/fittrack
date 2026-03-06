import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidScheduledTimeError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid scheduled time: ${reason}`,
      SchedulingErrorCodes.INVALID_SCHEDULED_TIME as ErrorCode,
      { reason },
    );
  }
}
