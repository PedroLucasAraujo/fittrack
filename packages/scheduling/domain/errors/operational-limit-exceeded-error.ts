import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class OperationalLimitExceededError extends DomainError {
  constructor(limitName: string, currentCount: number, maxAllowed: number) {
    super(
      `Operational limit exceeded: ${limitName}. Current: ${currentCount}, max: ${maxAllowed}.`,
      SchedulingErrorCodes.OPERATIONAL_LIMIT_EXCEEDED as ErrorCode,
      { limitName, currentCount, maxAllowed },
    );
  }
}
