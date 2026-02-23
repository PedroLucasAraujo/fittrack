import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';

/**
 * Raised when the application layer attempts to record an AssessmentResponse
 * against an Execution whose Deliverable is not of type PHYSIOLOGICAL_ASSESSMENT.
 *
 * Only executions of PHYSIOLOGICAL_ASSESSMENT Deliverables produce
 * AssessmentResponse records (ADR-0044 §1).
 */
export class DeliverableNotPhysiologicalAssessmentError extends DomainError {
  constructor(deliverableId: string) {
    super(
      `Deliverable ${deliverableId} is not of type PHYSIOLOGICAL_ASSESSMENT`,
      AssessmentErrorCodes.DELIVERABLE_NOT_PHYSIOLOGICAL_ASSESSMENT as ErrorCode,
    );
  }
}
