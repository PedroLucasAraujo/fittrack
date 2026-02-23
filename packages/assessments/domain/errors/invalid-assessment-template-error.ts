import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when an AssessmentTemplate's field-level validation fails
 * (title length, invalid field configuration, etc.).
 */
export class InvalidAssessmentTemplateError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid assessment template: ${reason}`,
      AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE as ErrorCode,
    );
  }
}
