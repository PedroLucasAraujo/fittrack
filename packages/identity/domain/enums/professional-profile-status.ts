/**
 * Operational lifecycle status of a ProfessionalProfile (ADR-0008 §5).
 *
 * ## State machine
 *
 * ```
 * PENDING_APPROVAL ──→ ACTIVE ──→ SUSPENDED ──→ ACTIVE   (reactivation)
 *        │                │  │          │  │
 *        │                │  │          │  └──→ CLOSED    (terminal)
 *        │                │  │          └──→ BANNED       (terminal)
 *        │                │  └──→ CLOSED                   (terminal)
 *        │                ├──→ BANNED                      (terminal)
 *        │                └──→ DEACTIVATED                 (terminal)
 *        └──→ BANNED                                       (terminal)
 * ```
 *
 * Terminal states (BANNED, DEACTIVATED, CLOSED) have no outgoing transitions.
 * Closure does NOT revoke existing AccessGrants (ADR-0013 Extension).
 */
export enum ProfessionalProfileStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DEACTIVATED = 'DEACTIVATED',
  CLOSED = 'CLOSED',
}
