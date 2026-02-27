/**
 * ACL contract for consuming ExecutionRecorded event data in the SelfLog bounded context.
 *
 * Defined locally to prevent a direct module-level dependency on `@fittrack/execution`
 * (ADR-0001 §Constraints: "Bounded context boundaries must be enforced at the module
 * import level — no cross-module domain imports in MVP").
 *
 * The infrastructure event dispatcher is responsible for mapping the incoming
 * `ExecutionRecordedEvent` from `@fittrack/execution` to this interface before
 * invoking `ProjectExecutionToSelfLog.execute()`.
 *
 * Fields mirror `ExecutionRecordedEvent.payload` (ADR-0009 §7 event catalog).
 * Only fields consumed by `ProjectExecutionToSelfLog` are required here.
 */
export interface ExecutionRecordedPayload {
  /** UUIDv4 of the Execution aggregate (cross-aggregate ref, ADR-0047). */
  readonly executionId: string;
  /** UUIDv4 of the client who performed the execution. */
  readonly clientId: string;
  /** Tenant identifier (ADR-0025). */
  readonly professionalProfileId: string;
  /**
   * UUIDv4 of the Deliverable consumed in this execution.
   * Null for unstructured execution records.
   */
  readonly deliverableId: string | null;
  /** YYYY-MM-DD calendar date of the execution in the client's timezone (ADR-0010). */
  readonly logicalDay: string;
  /** Execution status at the time the event was emitted (e.g. 'CONFIRMED'). */
  readonly status: string;
  /** ISO 8601 UTC timestamp of when the execution occurred (ADR-0010). */
  readonly occurredAtUtc: string;
  /** IANA timezone used to compute logicalDay (ADR-0010). */
  readonly timezoneUsed: string;
}
