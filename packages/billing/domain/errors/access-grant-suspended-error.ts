import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

/**
 * Raised when an operation is attempted on a SUSPENDED AccessGrant.
 *
 * SUSPENDED is a temporary state caused by professional WATCHLIST/BANNED
 * risk status or a billing grace period (ADR-0046 §2, ADR-0022 §3–4).
 */
export class AccessGrantSuspendedError extends DomainError {
  constructor(accessGrantId: string) {
    super(
      `AccessGrant "${accessGrantId}" is SUSPENDED and cannot be used for service delivery.`,
      BillingErrorCodes.ACCESS_GRANT_SUSPENDED as ErrorCode,
      { accessGrantId },
    );
  }
}
