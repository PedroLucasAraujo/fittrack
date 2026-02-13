/**
 * Canonical domain event contract — ADR-0009.
 *
 * Every domain event emitted by an aggregate root must conform to this
 * interface. Events are:
 *   - Immutable after publication (never retracted or modified).
 *   - Versioned for safe schema evolution.
 *   - Named in PascalCase past-tense (e.g., "ExecutionRecorded").
 *   - Published only after the producing transaction commits (ADR-0009 §3).
 *
 * Payload fields must not contain PII. Use reference IDs only (ADR-0037).
 */
export interface DomainEvent {
  /**
   * Globally unique event identifier (UUIDv4).
   * Used as the idempotency key by downstream consumers (ADR-0007).
   */
  readonly eventId: string;

  /**
   * PascalCase past-tense noun describing what happened.
   * Examples: "ExecutionRecorded", "BookingConfirmed", "PurchaseCompleted".
   * Imperative names ("RecordExecution") are prohibited.
   */
  readonly eventType: string;

  /**
   * Schema version integer, starting at 1.
   * Incremented on every breaking payload change (field removal or rename).
   * Non-breaking additions (nullable fields) may share the same version.
   */
  readonly eventVersion: number;

  /**
   * ISO 8601 UTC timestamp of the instant the event occurred.
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ — always ends with "Z" (ADR-0010).
   */
  readonly occurredAtUtc: string;

  /** UUIDv4 of the aggregate root that produced this event. */
  readonly aggregateId: string;

  /**
   * Type name of the emitting aggregate root (e.g., "Execution", "Booking").
   * Used by consumers to route events without string-matching on `eventType`.
   */
  readonly aggregateType: string;

  /**
   * Tenant scope: professionalProfileId for tenant-scoped events (ADR-0025).
   * Use the sentinel value "PLATFORM" for platform-wide events that are not
   * scoped to a single professional.
   */
  readonly tenantId: string;

  /**
   * Event-specific data.
   * Must not contain PII (ADR-0037). Use reference IDs only.
   * Unknown fields must be tolerated by consumers (forward-compatibility).
   */
  readonly payload: Readonly<Record<string, unknown>>;
}
