import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class InvalidAccessGrantTransitionError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(
      `Cannot transition AccessGrant from "${currentStatus}" to "${attemptedStatus}".`,
      BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION as ErrorCode,
      { currentStatus, attemptedStatus },
    );
  }
}
