import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when the application layer attempts to record an AssessmentResponse
 * for an Execution that is not in CONFIRMED status.
 *
 * Assessment responses may only be recorded against CONFIRMED Executions —
 * a PENDING Execution has not yet been validated as delivered, and a
 * CANCELLED Execution was never completed (ADR-0005 §9).
 */
export class ExecutionNotConfirmedError extends DomainError {
  constructor(executionId: string) {
    super(
      `Execution ${executionId} must be CONFIRMED before recording an AssessmentResponse`,
      AssessmentErrorCodes.EXECUTION_NOT_CONFIRMED as ErrorCode,
    );
  }
}
