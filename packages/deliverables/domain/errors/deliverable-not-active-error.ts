import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';

/**
 * Raised when an operation requires an ACTIVE Deliverable
 * (e.g., assignment via AccessGrant) but the Deliverable is
 * in DRAFT or ARCHIVED status.
 */
export class DeliverableNotActiveError extends DomainError {
  constructor(deliverableId: string) {
    super(
      `Deliverable is not ACTIVE: ${deliverableId}`,
      DeliverableErrorCodes.DELIVERABLE_NOT_ACTIVE as ErrorCode,
    );
  }
}
