import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the SelfLogAnonymized domain event (ADR-0009 §7).
 *
 * Must not contain PII or health metric values — reference IDs and metadata
 * only (ADR-0037). Health fields (value, unit, note) are already nulled by
 * `anonymize()` before this event is emitted.
 *
 * Downstream consumers (LGPD audit log, Analytics) use this event to
 * remove cached health projections tied to the anonymized entry.
 */
export interface SelfLogAnonymizedPayload {
  /** ID of the anonymized SelfLogEntry aggregate. */
  readonly selfLogEntryId: string;
  /** ID of the client whose data was anonymized (cross-aggregate ref, ADR-0047). */
  readonly clientId: string;
  /** Tenant identifier — professionalProfileId (ADR-0025). */
  readonly professionalProfileId: string;
}

/**
 * Emitted by `AnonymizeSelfLogEntry` after a SelfLogEntry is anonymized and
 * persisted (ADR-0009 §4). Carries no health data (ADR-0037).
 *
 * eventVersion: 1
 */
export class SelfLogAnonymizedEvent extends BaseDomainEvent {
  readonly eventType = 'SelfLogAnonymized' as const;
  readonly aggregateType = 'SelfLogEntry' as const;

  constructor(
    readonly aggregateId: string,
    /** professionalProfileId — tenant scope (ADR-0025). */
    readonly tenantId: string,
    readonly payload: Readonly<SelfLogAnonymizedPayload>,
  ) {
    super(1);
  }
}
