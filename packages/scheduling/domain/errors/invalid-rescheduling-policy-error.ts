import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidReschedulingPolicyError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid rescheduling policy: ${reason}`,
      SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY as ErrorCode,
      { reason },
    );
  }
}
