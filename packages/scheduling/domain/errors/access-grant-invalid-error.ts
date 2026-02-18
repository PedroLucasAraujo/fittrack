import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

/**
 * Raised when a Booking is attempted without a valid AccessGrant (ADR-0046 §3).
 *
 * The `reason` field communicates which of the 5 validity checks failed
 * (NONE_FOUND | EXPIRED | SUSPENDED | REVOKED | NO_SESSIONS).
 */
export class AccessGrantInvalidError extends DomainError {
  constructor(reason: 'NONE_FOUND' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'NO_SESSIONS') {
    super(
      `AccessGrant check failed: ${reason}. Booking creation requires a valid ACTIVE AccessGrant (ADR-0046 §3).`,
      SchedulingErrorCodes.ACCESS_GRANT_INVALID as ErrorCode,
      { reason },
    );
  }
}
