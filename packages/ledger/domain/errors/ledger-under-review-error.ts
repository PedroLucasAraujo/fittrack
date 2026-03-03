import { DomainError } from '@fittrack/core';
import { LedgerErrorCodes } from './ledger-error-codes.js';

export class LedgerUnderReviewError extends DomainError {
  constructor(ledgerId: string) {
    super(
      `Operation rejected: FinancialLedger "${ledgerId}" is UNDER_REVIEW. Payouts are blocked until the review is cleared.`,
      LedgerErrorCodes.LEDGER_UNDER_REVIEW,
      { ledgerId },
    );
  }
}
