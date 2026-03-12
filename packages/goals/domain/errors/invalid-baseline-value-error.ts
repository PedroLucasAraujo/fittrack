import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidBaselineValueError extends DomainError {
  constructor(reason: string) {
    super(`Invalid baseline value: ${reason}`, GoalsErrorCodes.INVALID_BASELINE_VALUE as ErrorCode);
  }
}
