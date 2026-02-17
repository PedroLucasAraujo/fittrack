import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class AccessGrantNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(
      `AccessGrant for "${identifier}" was not found.`,
      BillingErrorCodes.ACCESS_GRANT_NOT_FOUND as ErrorCode,
      { identifier },
    );
  }
}
