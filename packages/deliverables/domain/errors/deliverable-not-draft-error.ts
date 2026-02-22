import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';

/**
 * Raised when a content-mutation operation (addExercise, removeExercise)
 * is attempted on a Deliverable that is not in DRAFT status.
 *
 * Content is locked once the Deliverable is ACTIVE (snapshot semantics,
 * ADR-0011 §3).
 */
export class DeliverableNotDraftError extends DomainError {
  constructor(deliverableId: string) {
    super(
      `Deliverable content is locked (not DRAFT): ${deliverableId}`,
      DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT as ErrorCode,
    );
  }
}
