import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class ScheduleConflictError extends DomainError {
  constructor(reason: string) {
    super(`Schedule conflict: ${reason}`, SchedulingErrorCodes.SCHEDULE_CONFLICT as ErrorCode, {
      reason,
    });
  }
}
