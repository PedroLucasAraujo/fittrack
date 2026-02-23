import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the ExecutionCorrectionRecorded domain event (ADR-0009 §7).
 * Must not contain PII — reference IDs only (ADR-0037).
 */
export interface ExecutionCorrectionRecordedPayload {
  readonly correctionId: string;
  readonly originalExecutionId: string;
  /** Human-readable explanation stored for downstream recomputation triggers. */
  readonly reason: string;
}

/**
 * Emitted by `RecordExecutionCorrection` after the correction is persisted
 * (ADR-0005 §4, ADR-0009 §4).
 *
 * Downstream consumers (Metrics context) use this event to trigger
 * metric recomputation for the affected Execution (ADR-0043).
 *
 * eventVersion: 1
 */
export class ExecutionCorrectionRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'ExecutionCorrectionRecorded' as const;
  readonly aggregateType = 'Execution' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ExecutionCorrectionRecordedPayload>,
  ) {
    super(1);
  }
}
