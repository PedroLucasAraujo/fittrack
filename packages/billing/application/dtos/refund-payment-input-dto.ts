export interface RefundPaymentInputDTO {
  transactionId: string;
  /** Tenant isolation guard (ADR-0025): must match the transaction's professionalProfileId. */
  professionalProfileId: string;
}
