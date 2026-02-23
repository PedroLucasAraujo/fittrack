import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the ExecutionRecorded domain event (ADR-0009 §7).
 * Must not contain PII — reference IDs only (ADR-0037).
 */
export interface ExecutionRecordedPayload {
  readonly executionId: string;
  readonly clientId: string;
  readonly professionalProfileId: string;
  readonly deliverableId: string;
  /** YYYY-MM-DD calendar date in client's timezone (ADR-0010). */
  readonly logicalDay: string;
  /** Execution status at time of event emission — always 'CONFIRMED'. */
  readonly status: string;
  /**
   * UTC instant when the service was actually delivered (ISO 8601, ends with 'Z').
   * Required by downstream SelfLog projection handler to populate ADR-0010 temporal
   * fields on the SelfLogEntry aggregate (ADR-0010 §1).
   */
  readonly occurredAtUtc: string;
  /**
   * Client's IANA timezone used to compute logicalDay (ADR-0010).
   * Required by downstream SelfLog projection handler.
   */
  readonly timezoneUsed: string;
}

/**
 * Emitted by `CreateExecution` after the Execution record is persisted
 * and `sessionsConsumed` is atomically incremented (ADR-0009 §4).
 *
 * Downstream consumers (Metrics, Analytics, SelfLog) use this event to trigger
 * metric derivation (ADR-0043, ADR-0014) and SelfLog projection (ADR-0016).
 *
 * ## Schema changelog
 *
 * - v2 (current): added `occurredAtUtc` and `timezoneUsed` to payload
 *   (required by SelfLog projection handler — ADR-0010).
 * - v1 (initial): executionId, clientId, professionalProfileId, deliverableId,
 *   logicalDay, status.
 *
 * eventVersion: 2
 */
export class ExecutionRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'ExecutionRecorded' as const;
  readonly aggregateType = 'Execution' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ExecutionRecordedPayload>,
  ) {
    super(2);
  }
}
