/**
 * Output returned by the GetExecution use case on success.
 * Includes the full correction history for audit traceability (ADR-0027).
 */
export interface GetExecutionOutputDTO {
  executionId: string;
  professionalProfileId: string;
  clientId: string;
  accessGrantId: string;
  deliverableId: string;
  /** ISO 8601 UTC string of actual delivery time. */
  occurredAtUtc: string;
  /** YYYY-MM-DD calendar date in client's timezone (ADR-0010). */
  logicalDay: string;
  timezoneUsed: string;
  /** ISO 8601 UTC string of when the record was created. */
  createdAtUtc: string;
  /** Lifecycle status (ADR-0005 §8-9). */
  status: string;
  /** Full correction history (ADR-0005 §4). Ordered by correctedAtUtc ascending. */
  corrections: Array<{
    correctionId: string;
    reason: string;
    correctedBy: string;
    correctedAtUtc: string;
  }>;
}
