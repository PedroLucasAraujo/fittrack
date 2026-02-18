/**
 * Resolved AccessGrant data passed from the caller into CreateBooking.
 *
 * The Scheduling context has no direct dependency on the Billing context
 * (ADR-0029: bounded context isolation). The Application layer of the outer
 * context (e.g., HTTP handler or orchestrating service) resolves the
 * AccessGrant and passes the result here.
 *
 * This mirrors the existing `isBanned: boolean` pattern for RiskStatus
 * enforcement (ADR-0022).
 *
 * ## 5-point validity check (ADR-0046 §3)
 *
 * The caller must verify:
 *  1. An AccessGrant exists for (clientId, professionalProfileId, servicePlanId)
 *  2. Its status is ACTIVE  (not SUSPENDED / EXPIRED / REVOKED)
 *  3. clientId matches the booking's clientId
 *  4. professionalProfileId matches the session's owner
 *  5. Sessions remaining (or allotment is unlimited)
 *
 * If any check fails the caller sets `valid: false` and `reason` accordingly.
 */
export interface AccessGrantValidationDTO {
  /** True only if all 5 ADR-0046 §3 checks pass. */
  valid: boolean;
  /**
   * The reason the grant is invalid. Must be set when `valid` is false.
   * Omitted (undefined) when `valid` is true.
   */
  reason?: 'NONE_FOUND' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'NO_SESSIONS';
  /** The resolved AccessGrant ID (present when found, even if invalid). */
  accessGrantId?: string;
}
