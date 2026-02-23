import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ExecutionErrorCodes } from './execution-error-codes.js';

/**
 * Raised when an Execution's field-level validation fails
 * (invalid UUID, invalid UTC timestamp, invalid timezone, etc.).
 */
export class InvalidExecutionError extends DomainError {
  constructor(reason: string) {
    super(`Invalid execution: ${reason}`, ExecutionErrorCodes.INVALID_EXECUTION as ErrorCode);
  }
}
