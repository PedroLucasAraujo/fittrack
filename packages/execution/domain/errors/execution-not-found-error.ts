import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ExecutionErrorCodes } from './execution-error-codes.js';

/**
 * Raised when an Execution cannot be found for the given id
 * within the requesting tenant's scope (ADR-0025).
 *
 * Always returned as 404 Not Found — never 403 — per ADR-0024.
 */
export class ExecutionNotFoundError extends DomainError {
  constructor(executionId: string) {
    super(
      `Execution not found: ${executionId}`,
      ExecutionErrorCodes.EXECUTION_NOT_FOUND as ErrorCode,
    );
  }
}
