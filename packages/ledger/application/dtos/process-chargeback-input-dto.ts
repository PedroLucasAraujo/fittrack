/**
 * Input DTO for ProcessChargeback use case.
 * Triggered by ChargebackRegistered event from Billing context.
 * Records REFUND entries for both the REVENUE and PLATFORM_FEE components.
 */
export interface ProcessChargebackInputDTO {
  readonly professionalProfileId: string;
  readonly chargebackId: string;
  readonly transactionId: string;
  /** ID of the REVENUE LedgerEntry being reversed. */
  readonly revenueEntryId: string;
  /** ID of the PLATFORM_FEE LedgerEntry being reversed. */
  readonly platformFeeEntryId: string;
  /** Professional amount to reverse (cents). */
  readonly professionalAmountCents: number;
  /** Platform fee amount to reverse (cents). */
  readonly platformFeeAmountCents: number;
  readonly currency: string;
  readonly reason: string;
}
