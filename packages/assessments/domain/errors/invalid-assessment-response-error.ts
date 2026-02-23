import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when AssessmentResponse creation input fails domain validation
 * (e.g., empty responses list).
 */
export class InvalidAssessmentResponseError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid assessment response: ${reason}`,
      AssessmentErrorCodes.INVALID_ASSESSMENT_RESPONSE as ErrorCode,
    );
  }
}
