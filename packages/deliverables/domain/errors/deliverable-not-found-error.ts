import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';

/**
 * Raised when a Deliverable cannot be found for the given id
 * within the requesting tenant's scope (ADR-0025).
 *
 * Always returned as 404 Not Found — never 403 — per ADR-0024.
 */
export class DeliverableNotFoundError extends DomainError {
  constructor(deliverableId: string) {
    super(
      `Deliverable not found: ${deliverableId}`,
      DeliverableErrorCodes.DELIVERABLE_NOT_FOUND as ErrorCode,
    );
  }
}
