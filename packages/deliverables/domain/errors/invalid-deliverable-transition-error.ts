import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';
import type { DeliverableStatus } from '../enums/deliverable-status.js';

/**
 * Raised when a Deliverable state transition is not permitted
 * by the lifecycle state machine (ADR-0008).
 */
export class InvalidDeliverableTransitionError extends DomainError {
  constructor(from: DeliverableStatus, to: DeliverableStatus | string) {
    super(
      `Invalid Deliverable transition: ${from} → ${to}`,
      DeliverableErrorCodes.INVALID_DELIVERABLE_TRANSITION as ErrorCode,
    );
  }
}
