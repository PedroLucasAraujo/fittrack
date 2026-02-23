/**
 * Input for the CreateExecution use case.
 *
 * `professionalProfileId` must come from the authenticated JWT token claim —
 * never from the request body (ADR-0025 §4).
 *
 * `occurredAtUtc` is the real-world delivery time supplied by the caller,
 * not the system recording time (Q4 decision — caller-supplied delivery instant).
 *
 * `timezoneUsed` is the client's IANA timezone, supplied by the caller from
 * the client's profile (Q2 decision — caller-supplied timezoneUsed).
 * Used once to compute `logicalDay`; stored for audit traceability (ADR-0010).
 */
export interface CreateExecutionInputDTO {
  /** UUID of the professional; sourced from JWT (ADR-0025). */
  professionalProfileId: string;

  /** UUID of the client who received the service delivery. */
  clientId: string;

  /** UUID of the AccessGrant authorizing this delivery (ADR-0046). */
  accessGrantId: string;

  /** UUID of the ACTIVE Deliverable being delivered (ADR-0044 §2). */
  deliverableId: string;

  /**
   * ISO 8601 UTC string (must end with `Z`) representing when the service
   * was actually delivered (ADR-0010). Caller-supplied delivery instant.
   */
  occurredAtUtc: string;

  /**
   * Client's IANA timezone identifier (e.g., `"America/Sao_Paulo"`, `"UTC"`).
   * Used to compute `logicalDay` at creation time (ADR-0010 §2).
   */
  timezoneUsed: string;
}
