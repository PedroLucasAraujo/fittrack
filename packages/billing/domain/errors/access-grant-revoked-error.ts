import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

/**
 * Raised when an operation is attempted on a REVOKED AccessGrant.
 *
 * REVOKED is a terminal state caused by chargeback, refund, or admin action
 * (ADR-0046 §2, ADR-0020 §3). Historical Execution records are unaffected.
 */
export class AccessGrantRevokedError extends DomainError {
  constructor(accessGrantId: string) {
    super(
      `AccessGrant "${accessGrantId}" is REVOKED and cannot be used for service delivery.`,
      BillingErrorCodes.ACCESS_GRANT_REVOKED as ErrorCode,
      { accessGrantId },
    );
  }
}
