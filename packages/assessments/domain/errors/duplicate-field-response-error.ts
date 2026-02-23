import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when the responses list contains two or more entries for the same
 * fieldId. An assessment response must record each field exactly once.
 */
export class DuplicateFieldResponseError extends DomainError {
  constructor(fieldId: string) {
    super(
      `Duplicate response for field ${fieldId}; each field must be answered at most once`,
      AssessmentErrorCodes.DUPLICATE_FIELD_RESPONSE as ErrorCode,
    );
  }
}
