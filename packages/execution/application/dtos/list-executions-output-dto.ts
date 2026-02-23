/**
 * Output returned by the ListExecutions use case on success.
 * Items are ordered by `occurredAtUtc` descending (most recent first).
 */
export interface ListExecutionItemDTO {
  executionId: string;
  clientId: string;
  deliverableId: string;
  /** ISO 8601 UTC string of actual delivery time. */
  occurredAtUtc: string;
  /** YYYY-MM-DD calendar date in client's timezone (ADR-0010). */
  logicalDay: string;
  timezoneUsed: string;
  /** Number of corrections recorded on this Execution. */
  correctionCount: number;
}

export interface ListExecutionsOutputDTO {
  items: ListExecutionItemDTO[];
  /** Total number of matching Executions across all pages. */
  total: number;
  /** Current page number (1-indexed). */
  page: number;
  /** Page size requested. */
  limit: number;
  /** `true` when there are more items beyond the current page. */
  hasNextPage: boolean;
}
