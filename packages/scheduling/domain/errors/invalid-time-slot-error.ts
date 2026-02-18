import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidTimeSlotError extends DomainError {
  constructor(message: string) {
    super(message, SchedulingErrorCodes.INVALID_TIME_SLOT as ErrorCode);
  }
}
