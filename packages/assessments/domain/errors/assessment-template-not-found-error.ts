import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when an AssessmentTemplate cannot be found for the given ID and tenant.
 *
 * Returns ASSESSMENT.TEMPLATE_NOT_FOUND — never reveals whether the record exists
 * under a different tenant (ADR-0025 §4 — cross-tenant access returns 404).
 */
export class AssessmentTemplateNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      `AssessmentTemplate not found: ${id}`,
      AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_FOUND as ErrorCode,
    );
  }
}
