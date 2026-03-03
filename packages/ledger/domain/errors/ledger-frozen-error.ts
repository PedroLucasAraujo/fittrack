import { DomainError } from '@fittrack/core';
import { LedgerErrorCodes } from './ledger-error-codes.js';

export class LedgerFrozenError extends DomainError {
  constructor(ledgerId: string) {
    super(
      `Operation rejected: FinancialLedger "${ledgerId}" is FROZEN. Payouts are blocked until the freeze is lifted.`,
      LedgerErrorCodes.LEDGER_FROZEN,
      { ledgerId },
    );
  }
}
