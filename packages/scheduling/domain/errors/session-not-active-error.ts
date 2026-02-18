import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class SessionNotActiveError extends DomainError {
  constructor(sessionId: string) {
    super(
      `Session is not active and cannot be used for booking.`,
      SchedulingErrorCodes.SESSION_NOT_ACTIVE as ErrorCode,
      { sessionId },
    );
  }
}
