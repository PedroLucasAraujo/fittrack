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
}

/**
 * Emitted by `CreateExecution` after the Execution record is persisted
 * and `sessionsConsumed` is atomically incremented (ADR-0009 §4).
 *
 * Downstream consumers (Metrics, Analytics) use this event to trigger
 * metric derivation (ADR-0043, ADR-0014).
 *
 * eventVersion: 1
 */
export class ExecutionRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'ExecutionRecorded' as const;
  readonly aggregateType = 'Execution' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ExecutionRecordedPayload>,
  ) {
    super(1);
  }
}
