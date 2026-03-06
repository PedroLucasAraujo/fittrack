import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class ReschedulePolicyViolationError extends DomainError {
  constructor(reason: string) {
    super(
      `Reschedule policy violation: ${reason}`,
      SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION as ErrorCode,
      { reason },
    );
  }
}
