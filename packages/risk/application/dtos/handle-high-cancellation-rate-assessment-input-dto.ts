/**
 * Input DTO for `HandleHighCancellationRateAssessment`.
 *
 * The infrastructure event handler is responsible for pre-computing
 * `cancellationRate` by querying the Scheduling context before calling this
 * use case (ADR-0053 §5). The Risk domain performs no cross-context queries.
 */
export interface HandleHighCancellationRateAssessmentInputDTO {
  professionalProfileId: string;
  /** Fraction of sessions cancelled in the observation window (0–1 decimal). */
  cancellationRate: number;
  /** Duration of the observation window in days. */
  windowDays: number;
  /** Optional reference for audit traceability. */
  evidenceRef?: string;
}
