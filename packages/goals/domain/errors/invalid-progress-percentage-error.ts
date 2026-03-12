import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidProgressPercentageError extends DomainError {
  constructor(received: number) {
    super(
      `Invalid progress percentage: ${received}. Must be between 0 and 100.`,
      GoalsErrorCodes.INVALID_PROGRESS_PERCENTAGE as ErrorCode,
    );
  }
}
