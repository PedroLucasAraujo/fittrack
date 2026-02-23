/**
 * Port for cross-context Deliverable status verification required by the
 * Execution bounded context (ADR-0001 §3, ADR-0029).
 *
 * The Execution context must NEVER call the Deliverable repository directly
 * (ADR-0001 §3). Cross-context reads go through the public API (ADR-0029).
 * This port abstracts that boundary.
 */
export interface IDeliverableVerificationPort {
  /**
   * Returns `true` when the Deliverable exists, belongs to the given
   * professional, and has status `ACTIVE` (content snapshot locked and
   * assignable via AccessGrant — ADR-0044 §2, ADR-0011 §3).
   *
   * Returns `false` for DRAFT, ARCHIVED, not-found, or cross-tenant IDs.
   *
   * Per ADR-0029: the infrastructure adapter calls the Deliverables public
   * API, not the internal repository, to enforce bounded-context isolation.
   */
  isActive(deliverableId: string, professionalProfileId: string): Promise<boolean>;
}
