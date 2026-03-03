import { DomainError } from '@fittrack/core';
import { LedgerErrorCodes } from './ledger-error-codes.js';

export class InsufficientBalanceError extends DomainError {
  constructor(ledgerId: string) {
    super(
      `Insufficient balance on FinancialLedger "${ledgerId}".`,
      LedgerErrorCodes.INSUFFICIENT_BALANCE,
      { ledgerId },
    );
  }
}
