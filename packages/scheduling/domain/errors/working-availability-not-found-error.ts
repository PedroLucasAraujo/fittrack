import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class WorkingAvailabilityNotFoundError extends DomainError {
  constructor(workingAvailabilityId: string) {
    super(
      `Working availability not found.`,
      SchedulingErrorCodes.WORKING_AVAILABILITY_NOT_FOUND as ErrorCode,
      { workingAvailabilityId },
    );
  }
}
