import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';
import type { AssessmentTemplateStatus } from '../enums/assessment-template-status.js';

/**
 * Raised when an invalid status transition is attempted on an AssessmentTemplate
 * (ADR-0008 §1 — every invalid transition raises a named domain exception).
 */
export class InvalidAssessmentTemplateTransitionError extends DomainError {
  constructor(from: AssessmentTemplateStatus, to: AssessmentTemplateStatus) {
    super(
      `Cannot transition AssessmentTemplate from ${from} to ${to}`,
      AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE_TRANSITION as ErrorCode,
    );
  }
}
