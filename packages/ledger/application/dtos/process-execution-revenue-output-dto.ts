export interface ProcessExecutionRevenueOutputDTO {
  readonly ledgerId: string;
  readonly revenueEntryId: string;
  readonly platformFeeEntryId: string;
  readonly professionalAmountCents: number;
  readonly platformFeeAmountCents: number;
  readonly currentBalanceCents: number;
  readonly currency: string;
  readonly isInDebt: boolean;
}
