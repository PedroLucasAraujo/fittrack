import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the SelfLogCorrectionProjected domain event (ADR-0009 §7).
 *
 * Must not contain PII or health metric values — reference IDs and metadata
 * only (ADR-0037).
 *
 * Downstream consumers (Analytics, Dashboard read models) use this event to
 * supersede the original SelfLogEntry with the correction projection.
 */
export interface SelfLogCorrectionProjectedPayload {
  /** ID of the new SelfLogEntry created as the correction projection. */
  readonly selfLogEntryId: string;
  /** ID of the original SelfLogEntry superseded by this correction (= correctedEntryId). */
  readonly originalEntryId: string;
  /** ID of the client who owns the entry (cross-aggregate ref, ADR-0047). */
  readonly clientId: string;
  /** Tenant identifier — professionalProfileId (ADR-0025). */
  readonly professionalProfileId: string;
  /** YYYY-MM-DD calendar date in the user's timezone (ADR-0010). */
  readonly logicalDay: string;
  /**
   * ID of the ExecutionCorrection entity that triggered this projection.
   * Equals the new entry's source.sourceId (cross-aggregate ref, ADR-0047).
   */
  readonly correctionId: string;
}

/**
 * Emitted by `HandleExecutionCorrectionProjection` after a correction
 * SelfLogEntry is persisted (ADR-0009 §4).
 *
 * Registered in the official domain event catalog (ADR-0009 §7, ADR-0047).
 * Signals that the original source=EXECUTION SelfLogEntry identified by
 * `originalEntryId` has been superseded by a new correction projection.
 *
 * eventVersion: 1
 */
export class SelfLogCorrectionProjectedEvent extends BaseDomainEvent {
  readonly eventType = 'SelfLogCorrectionProjected' as const;
  readonly aggregateType = 'SelfLogEntry' as const;

  constructor(
    readonly aggregateId: string,
    /** professionalProfileId — tenant scope (ADR-0025). */
    readonly tenantId: string,
    readonly payload: Readonly<SelfLogCorrectionProjectedPayload>,
  ) {
    super(1);
  }
}
