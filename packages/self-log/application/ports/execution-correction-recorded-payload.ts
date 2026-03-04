/**
 * ACL contract for consuming ExecutionCorrectionRecorded event data in the SelfLog bounded context.
 *
 * Defined locally to prevent a direct module-level dependency on `@fittrack/execution`
 * (ADR-0001 §Constraints: "Bounded context boundaries must be enforced at the module
 * import level — no cross-module domain imports in MVP").
 *
 * The infrastructure event dispatcher is responsible for mapping the incoming
 * `ExecutionCorrectionRecordedEvent` from `@fittrack/execution` to this interface before
 * invoking `HandleExecutionCorrectionProjection.execute()`.
 *
 * Fields mirror `ExecutionCorrectionRecordedEvent` (ADR-0009 §7 event catalog).
 * Only fields consumed by `HandleExecutionCorrectionProjection` are included here.
 * `reason` (present in the source event) is intentionally excluded: it is not needed
 * by the projection handler and may carry user-authored text that is PII-adjacent
 * under LGPD (ADR-0037).
 */
export interface ExecutionCorrectionRecordedPayload {
  /** UUIDv4 of the ExecutionCorrection entity (cross-aggregate ref, ADR-0047). */
  readonly correctionId: string;
  /** UUIDv4 of the Execution aggregate that was corrected (cross-aggregate ref, ADR-0047). */
  readonly originalExecutionId: string;
  /** Tenant identifier — maps to BaseDomainEvent.tenantId (ADR-0025). */
  readonly professionalProfileId: string;
}
