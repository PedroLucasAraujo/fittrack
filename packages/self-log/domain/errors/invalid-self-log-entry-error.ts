import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SelfLogErrorCodes } from './self-log-error-codes.js';

/**
 * Raised when a SelfLogEntry invariant is violated during creation or mutation.
 *
 * Examples:
 * - source=EXECUTION provided without a sourceId (executionId)
 * - source=SELF provided with a non-null sourceId
 * - Metric value is negative or non-finite
 * - Unit string exceeds maximum length
 *
 * All SelfLog validation failures use this single error class, differentiated
 * by the `reason` message. This matches the pattern used in other bounded
 * contexts (e.g., InvalidExecutionError).
 */
export class InvalidSelfLogEntryError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(reason, SelfLogErrorCodes.INVALID_ENTRY as ErrorCode, context);
  }
}
