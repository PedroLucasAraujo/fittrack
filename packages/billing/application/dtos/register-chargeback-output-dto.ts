export interface RegisterChargebackOutputDTO {
  transactionId: string;
  transactionStatus: string;
  accessGrantId: string;
  accessGrantStatus: string;
  revokedAtUtc: string;
}
