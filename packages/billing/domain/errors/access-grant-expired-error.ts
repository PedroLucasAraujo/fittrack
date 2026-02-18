import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

/**
 * Raised when an operation is attempted on an EXPIRED AccessGrant.
 *
 * EXPIRED is a terminal state — no transition out (ADR-0046 §2).
 */
export class AccessGrantExpiredError extends DomainError {
  constructor(accessGrantId: string) {
    super(
      `AccessGrant "${accessGrantId}" is EXPIRED and cannot be used for service delivery.`,
      BillingErrorCodes.ACCESS_GRANT_EXPIRED as ErrorCode,
      { accessGrantId },
    );
  }
}
