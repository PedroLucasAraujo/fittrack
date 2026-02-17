import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class InvalidPlatformFeeError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(
      reason,
      BillingErrorCodes.INVALID_PLATFORM_FEE as ErrorCode,
      context,
    );
  }
}
