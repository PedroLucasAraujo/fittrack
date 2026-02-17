export interface ConfirmPaymentOutputDTO {
  transactionId: string;
  transactionStatus: string;
  accessGrantId: string;
  accessGrantStatus: string;
  validFrom: string;
  validUntil: string | null;
}
