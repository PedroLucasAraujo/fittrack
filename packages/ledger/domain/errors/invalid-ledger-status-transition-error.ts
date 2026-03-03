import { DomainError } from '@fittrack/core';
import { LedgerStatus } from '../enums/ledger-status.js';
import { LedgerErrorCodes } from './ledger-error-codes.js';

export class InvalidLedgerStatusTransitionError extends DomainError {
  constructor(currentStatus: LedgerStatus, targetStatus: LedgerStatus) {
    super(
      `Invalid FinancialLedger status transition: "${currentStatus}" → "${targetStatus}".`,
      LedgerErrorCodes.INVALID_LEDGER_STATUS_TRANSITION,
      { currentStatus, targetStatus },
    );
  }
}
