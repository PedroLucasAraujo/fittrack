import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidTargetValueError extends DomainError {
  constructor(reason: string) {
    super(`Invalid target value: ${reason}`, GoalsErrorCodes.INVALID_TARGET_VALUE as ErrorCode);
  }
}
