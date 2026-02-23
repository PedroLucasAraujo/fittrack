import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when a use case requires an ACTIVE AssessmentTemplate but finds
 * one in a different status (DRAFT or ARCHIVED).
 *
 * Only ACTIVE templates may be referenced in Deliverable snapshots
 * (ADR-0044 §2 — service delivery requires an active prescription source).
 */
export class AssessmentTemplateNotActiveError extends DomainError {
  constructor(templateId: string) {
    super(
      `AssessmentTemplate ${templateId} is not ACTIVE and cannot be used for prescription`,
      AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_ACTIVE as ErrorCode,
    );
  }
}
