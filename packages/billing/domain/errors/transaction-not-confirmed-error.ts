import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class TransactionNotConfirmedError extends DomainError {
  constructor(transactionId: string, currentStatus: string) {
    super(
      `Transaction "${transactionId}" is not CONFIRMED (current: "${currentStatus}").`,
      BillingErrorCodes.TRANSACTION_NOT_CONFIRMED as ErrorCode,
      { transactionId, currentStatus },
    );
  }
}
