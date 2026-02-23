import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when an operation references a template field ID that does not exist
 * within the AssessmentTemplate's current field list.
 */
export class TemplateFieldNotFoundError extends DomainError {
  constructor(fieldId: string) {
    super(
      `AssessmentTemplateField not found: ${fieldId}`,
      AssessmentErrorCodes.TEMPLATE_FIELD_NOT_FOUND as ErrorCode,
    );
  }
}
