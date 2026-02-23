import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when a field mutation (addField, removeField) is attempted on an
 * AssessmentTemplate that is not in DRAFT status.
 *
 * Field mutations are only permitted in DRAFT (ADR-0011 §3 snapshot semantics —
 * content is locked once the template transitions to ACTIVE).
 */
export class AssessmentTemplateNotDraftError extends DomainError {
  constructor(templateId: string) {
    super(
      `AssessmentTemplate ${templateId} is not in DRAFT status; field mutations are not permitted`,
      AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_DRAFT as ErrorCode,
    );
  }
}
