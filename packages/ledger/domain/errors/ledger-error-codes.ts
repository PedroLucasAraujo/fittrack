/**
 * Stable error code constants for the Ledger bounded context.
 * Format: LEDGER.<UPPER_SNAKE_CASE>
 * See ADR-0051 for domain error handling policy.
 */
export const LedgerErrorCodes = {
  LEDGER_NOT_FOUND: 'LEDGER.LEDGER_NOT_FOUND',
  LEDGER_FROZEN: 'LEDGER.LEDGER_FROZEN',
  LEDGER_UNDER_REVIEW: 'LEDGER.LEDGER_UNDER_REVIEW',
  INSUFFICIENT_BALANCE: 'LEDGER.INSUFFICIENT_BALANCE',
  INVALID_LEDGER_STATUS_TRANSITION: 'LEDGER.INVALID_LEDGER_STATUS_TRANSITION',
  INVALID_CURRENCY: 'LEDGER.INVALID_CURRENCY',
  INVALID_ENTRY_AMOUNT: 'LEDGER.INVALID_ENTRY_AMOUNT',
} as const;

export type LedgerErrorCode = (typeof LedgerErrorCodes)[keyof typeof LedgerErrorCodes];
