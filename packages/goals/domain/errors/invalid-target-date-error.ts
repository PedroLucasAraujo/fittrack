import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidTargetDateError extends DomainError {
  constructor(reason: string) {
    super(`Invalid target date: ${reason}`, GoalsErrorCodes.INVALID_TARGET_DATE as ErrorCode);
  }
}
