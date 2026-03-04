/**
 * Input DTO for `HandlePaymentFailedRiskAssessment`.
 *
 * The infrastructure event handler is responsible for pre-computing
 * `paymentFailureCount` by querying the Billing context before calling this
 * use case (ADR-0053 §5). The Risk domain performs no cross-context queries.
 */
export interface HandlePaymentFailedRiskAssessmentInputDTO {
  professionalProfileId: string;
  /** Total number of payment failures in the observation window. */
  paymentFailureCount: number;
  /** Duration of the observation window in days. */
  windowDays: number;
  /** Optional payment transaction reference for audit traceability. */
  evidenceRef?: string;
}
