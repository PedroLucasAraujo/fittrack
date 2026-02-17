import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class TransactionNotFoundError extends DomainError {
  constructor(transactionId: string) {
    super(
      `Transaction "${transactionId}" was not found.`,
      BillingErrorCodes.TRANSACTION_NOT_FOUND as ErrorCode,
      { transactionId },
    );
  }
}
