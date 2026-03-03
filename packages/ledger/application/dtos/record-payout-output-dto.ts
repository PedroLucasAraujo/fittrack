export interface RecordPayoutOutputDTO {
  readonly ledgerId: string;
  readonly entryId: string;
  readonly amountCents: number;
  readonly currentBalanceCents: number;
  readonly currency: string;
}
