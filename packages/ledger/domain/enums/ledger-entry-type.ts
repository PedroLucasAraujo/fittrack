/**
 * Classifies the direction and purpose of a LedgerEntry.
 * See ADR-0021 §2 for the full type catalog.
 */
export const LedgerEntryType = {
  /**
   * Professional's net revenue per confirmed session (after platform fee).
   * Credit: increases currentBalanceCents.
   * Trigger: ExecutionRecorded.
   */
  REVENUE: 'REVENUE',

  /**
   * Platform's fee deducted per confirmed session.
   * Debit: decreases currentBalanceCents.
   * Trigger: ExecutionRecorded (same transaction as paired REVENUE entry).
   */
  PLATFORM_FEE: 'PLATFORM_FEE',

  /**
   * Reversal of prior REVENUE or PLATFORM_FEE entries due to chargeback or refund.
   * Debit for REVENUE reversals; credit for PLATFORM_FEE reversals.
   * Trigger: ChargebackRegistered or PaymentRefunded.
   */
  REFUND: 'REFUND',

  /**
   * Transfer of available balance to the professional's bank account.
   * Debit: decreases currentBalanceCents.
   * Blocked when ledger is FROZEN or UNDER_REVIEW, or balance is insufficient.
   */
  PAYOUT: 'PAYOUT',

  /**
   * Administrative correction entry. Amount may be positive (credit) or negative (debit).
   * Requires explicit administrative authorization.
   */
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];
