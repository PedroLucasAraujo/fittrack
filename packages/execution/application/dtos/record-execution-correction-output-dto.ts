/**
 * Output returned by the RecordExecutionCorrection use case on success.
 */
export interface RecordExecutionCorrectionOutputDTO {
  correctionId: string;
  executionId: string;
  reason: string;
  correctedBy: string;
  /** ISO 8601 UTC string of when the correction was recorded. */
  correctedAtUtc: string;
}
