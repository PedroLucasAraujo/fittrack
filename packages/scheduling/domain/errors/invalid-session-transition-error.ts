import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidSessionTransitionError extends DomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Invalid session transition from "${currentStatus}" to "${targetStatus}".`,
      SchedulingErrorCodes.INVALID_SESSION_TRANSITION as ErrorCode,
      { currentStatus, targetStatus },
    );
  }
}
