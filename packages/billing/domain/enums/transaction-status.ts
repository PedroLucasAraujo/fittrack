/**
 * Transaction status model mapped from gateway events (ADR-0019 §5).
 *
 * Transitions:
 * - PENDING → CONFIRMED (payment.confirmed)
 * - PENDING → FAILED (payment.failed)
 * - CONFIRMED → REFUNDED (refund.created)
 * - CONFIRMED → CHARGEBACK (chargeback.created)
 * - REFUNDED → CHARGEBACK (chargeback.created on refunded transaction)
 *
 * No reverse transitions are permitted.
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CHARGEBACK = 'CHARGEBACK',
}
