/**
 * Operational status of a FinancialLedger aggregate.
 * See ADR-0021 §9 for status semantics.
 */
export const LedgerStatus = {
  /**
   * Normal operation. Revenue recording and payouts (with sufficient balance) are allowed.
   */
  ACTIVE: 'ACTIVE',

  /**
   * Administrative freeze. Revenue recording is allowed; payouts are blocked.
   * Reversible via administrative action.
   */
  FROZEN: 'FROZEN',

  /**
   * Risk monitoring state. Revenue recording is allowed; payouts are blocked.
   * Reversible via administrative action after review.
   */
  UNDER_REVIEW: 'UNDER_REVIEW',
} as const;

export type LedgerStatus = (typeof LedgerStatus)[keyof typeof LedgerStatus];
