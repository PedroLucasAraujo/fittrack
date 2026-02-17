import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class InvalidTransactionTransitionError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(
      `Cannot transition Transaction from "${currentStatus}" to "${attemptedStatus}".`,
      BillingErrorCodes.INVALID_TRANSACTION_TRANSITION as ErrorCode,
      { currentStatus, attemptedStatus },
    );
  }
}
