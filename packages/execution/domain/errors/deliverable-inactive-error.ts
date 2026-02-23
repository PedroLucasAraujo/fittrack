import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ExecutionErrorCodes } from './execution-error-codes.js';

/**
 * Raised when an Execution is requested against a Deliverable that is not
 * in ACTIVE status (e.g., DRAFT or ARCHIVED).
 *
 * Only ACTIVE Deliverables may be executed. ACTIVE status means the content
 * snapshot is locked and assignable via AccessGrant (ADR-0044 §2, ADR-0011 §3).
 */
export class DeliverableInactiveError extends DomainError {
  constructor(deliverableId: string) {
    super(
      `Deliverable is not ACTIVE and cannot be executed: ${deliverableId}`,
      ExecutionErrorCodes.DELIVERABLE_INACTIVE as ErrorCode,
    );
  }
}
