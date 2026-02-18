import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class RecurringScheduleNotFoundError extends DomainError {
  constructor(recurringScheduleId: string) {
    super(
      `Recurring schedule not found.`,
      SchedulingErrorCodes.RECURRING_SCHEDULE_NOT_FOUND as ErrorCode,
      { recurringScheduleId },
    );
  }
}
