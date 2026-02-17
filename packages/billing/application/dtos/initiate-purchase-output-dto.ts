export interface InitiatePurchaseOutputDTO {
  transactionId: string;
  clientId: string;
  servicePlanId: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  professionalAmountCents: number;
  status: string;
  createdAtUtc: string;
}
