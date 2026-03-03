export interface RecordAdjustmentOutputDTO {
  ledgerId: string;
  entryId: string;
  amountCents: number;
  currentBalanceCents: number;
  currency: string;
  isInDebt: boolean;
}
