import { DomainError } from '@fittrack/core';
import { LedgerErrorCodes } from './ledger-error-codes.js';

export class LedgerNotFoundError extends DomainError {
  constructor(professionalProfileId: string) {
    super(
      `FinancialLedger not found for professionalProfileId: "${professionalProfileId}".`,
      LedgerErrorCodes.LEDGER_NOT_FOUND,
      { professionalProfileId },
    );
  }
}
