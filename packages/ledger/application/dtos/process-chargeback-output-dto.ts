export interface ProcessChargebackOutputDTO {
  readonly ledgerId: string;
  readonly revenueRefundEntryId: string;
  readonly feeRefundEntryId: string;
  readonly currentBalanceCents: number;
  readonly currency: string;
  readonly isInDebt: boolean;
}
