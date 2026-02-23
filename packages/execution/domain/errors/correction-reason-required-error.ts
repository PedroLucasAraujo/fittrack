import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ExecutionErrorCodes } from './execution-error-codes.js';

/**
 * Raised when Execution.recordCorrection() is called with an empty
 * or whitespace-only reason string.
 *
 * A correction reason is mandatory for audit traceability (ADR-0027).
 */
export class CorrectionReasonRequiredError extends DomainError {
  constructor() {
    super(
      'Correction reason must be a non-empty string.',
      ExecutionErrorCodes.CORRECTION_REASON_REQUIRED as ErrorCode,
    );
  }
}
