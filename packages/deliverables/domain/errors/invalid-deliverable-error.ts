import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';

/**
 * Raised when a Deliverable's field-level validation fails
 * (title length, invalid type, etc.).
 */
export class InvalidDeliverableError extends DomainError {
  constructor(reason: string) {
    super(`Invalid deliverable: ${reason}`, DeliverableErrorCodes.INVALID_DELIVERABLE as ErrorCode);
  }
}
