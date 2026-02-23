/**
 * Shape of Execution data required by the RecordAssessmentResponse use case.
 *
 * Provided by the Execution bounded context via an anti-corruption adapter.
 * The Assessments context never imports from `@fittrack/execution` directly —
 * it declares what it needs and the infrastructure wires the adapter (ADR-0001 §3).
 */
export interface ExecutionView {
  /** Unique identifier of the Execution record. */
  id: string;
  /**
   * Lifecycle status of the Execution (ADR-0005 §9).
   * Only 'CONFIRMED' executions may receive AssessmentResponse records.
   */
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  /** ID of the Deliverable that was prescribed (ADR-0005 §8). */
  deliverableId: string;
  /** Owning professional (tenant isolation key, ADR-0025). */
  professionalProfileId: string;
  /** Client who received the service. */
  clientId: string;
  /**
   * Calendar date of delivery in the client's timezone (ADR-0010).
   * Denormalized into AssessmentResponse for query efficiency.
   */
  logicalDay: string;
  /**
   * Client's IANA timezone at delivery time (ADR-0010).
   * Denormalized into AssessmentResponse.
   */
  timezoneUsed: string;
}

/**
 * Port through which the Assessments application layer queries Execution data.
 *
 * Implemented by an infrastructure adapter that queries the Execution
 * bounded context's persistence layer or calls its read API.
 * The domain and application layers of Assessments never depend on the
 * Execution repository directly (ADR-0001 §3 — no cross-context repository calls).
 */
export interface IExecutionPort {
  /**
   * Returns the ExecutionView for the given execution ID, scoped to the tenant.
   * Returns null when not found or when the execution belongs to a different tenant.
   */
  findById(executionId: string, professionalProfileId: string): Promise<ExecutionView | null>;
}
