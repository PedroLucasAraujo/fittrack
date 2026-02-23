/**
 * Input for the RecordExecutionCorrection use case.
 *
 * `professionalProfileId` is used for tenant-scoped lookup (ADR-0025).
 * `correctedBy` is the UUID of the actor recording the correction — typically
 * the same as `professionalProfileId` but may differ for admin corrections.
 */
export interface RecordExecutionCorrectionInputDTO {
  /** UUID of the Execution to correct. */
  executionId: string;

  /** UUID of the professional; sourced from JWT (ADR-0025). */
  professionalProfileId: string;

  /** Non-empty human-readable explanation for the correction (ADR-0027). */
  reason: string;

  /** UUID of the actor recording the correction. */
  correctedBy: string;
}
