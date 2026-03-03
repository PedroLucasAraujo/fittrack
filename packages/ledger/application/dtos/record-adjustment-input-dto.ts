export interface RecordAdjustmentInputDTO {
  professionalProfileId: string;
  adjustmentId: string;
  amountCents: number;
  currency: string;
  isCredit: boolean;
  description: string;
}
