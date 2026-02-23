/**
 * Output returned by the CreateExecution use case on success.
 */
export interface CreateExecutionOutputDTO {
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
}
