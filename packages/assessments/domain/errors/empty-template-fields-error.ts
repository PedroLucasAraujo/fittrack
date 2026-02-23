import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when activating an AssessmentTemplate that has no fields defined.
 *
 * An empty template cannot be activated because it produces no assessable
 * content — analogous to EmptyExerciseListError for TRAINING_PRESCRIPTION
 * Deliverables (ADR-0044 §2, ADR-0008 §8).
 */
export class EmptyTemplateFieldsError extends DomainError {
  constructor(templateId: string) {
    super(
      `AssessmentTemplate ${templateId} must have at least one field before activation`,
      AssessmentErrorCodes.EMPTY_TEMPLATE_FIELDS as ErrorCode,
    );
  }
}
