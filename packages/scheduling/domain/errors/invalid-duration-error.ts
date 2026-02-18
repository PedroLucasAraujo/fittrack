import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidDurationError extends DomainError {
  constructor(minutes: number) {
    super(
      `Duration must be a positive integer between 1 and 480 minutes. Received: ${minutes}.`,
      SchedulingErrorCodes.INVALID_DURATION as ErrorCode,
      { minutes },
    );
  }
}
