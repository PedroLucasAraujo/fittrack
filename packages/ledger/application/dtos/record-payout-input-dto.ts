export interface RecordPayoutInputDTO {
  readonly professionalProfileId: string;
  readonly payoutRequestId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly description: string;
}
