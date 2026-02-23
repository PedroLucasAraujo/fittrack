import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the SelfLogRecorded domain event (ADR-0009 §7).
 *
 * Must not contain PII or health metric values — reference IDs and metadata
 * only (ADR-0037). The `value`, `unit`, and `note` fields from the SelfLogEntry
 * are intentionally excluded because they contain Category A health data.
 *
 * Downstream consumers (Analytics, Dashboard read models) use this event to
 * update projections without receiving the underlying health content.
 */
export interface SelfLogRecordedPayload {
  /** ID of the SelfLogEntry aggregate. */
  readonly selfLogEntryId: string;
  /** ID of the client who logged the entry (cross-aggregate ref, ADR-0047). */
  readonly clientId: string;
  /** Tenant identifier — professionalProfileId (ADR-0025). */
  readonly professionalProfileId: string;
  /** YYYY-MM-DD calendar date in the user's timezone (ADR-0010). */
  readonly logicalDay: string;
  /** How this entry was created: 'SELF' | 'EXECUTION'. */
  readonly sourceType: string;
  /**
   * executionId when sourceType is 'EXECUTION'; null when sourceType is 'SELF'.
   * Cross-aggregate reference by ID only (ADR-0047).
   */
  readonly sourceId: string | null;
  /**
   * ID of the SelfLogEntry superseded by this one, or null if this is an
   * original (non-correction) entry.
   */
  readonly correctedEntryId: string | null;
}

/**
 * Emitted by use cases after a SelfLogEntry is persisted (ADR-0009 §4).
 *
 * Registered in the official domain event catalog (ADR-0009 §7, ADR-0047).
 * Both source=SELF and source=EXECUTION entries emit this event, allowing
 * downstream analytics to consume a unified SelfLog event stream.
 *
 * eventVersion: 1
 */
export class SelfLogRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'SelfLogRecorded' as const;
  readonly aggregateType = 'SelfLogEntry' as const;

  constructor(
    readonly aggregateId: string,
    /** professionalProfileId — tenant scope (ADR-0025). */
    readonly tenantId: string,
    readonly payload: Readonly<SelfLogRecordedPayload>,
  ) {
    super(1);
  }
}
