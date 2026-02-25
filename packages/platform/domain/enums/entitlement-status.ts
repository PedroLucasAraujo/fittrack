/**
 * Lifecycle states for a PlatformEntitlement aggregate.
 *
 * ACTIVE    — professional has the granted capabilities and may operate normally.
 * SUSPENDED — capabilities preserved as a snapshot but no longer effective.
 *             Triggered by RiskStatusChanged(BANNED) or admin action.
 * EXPIRED   — the grant has reached its expiresAt date. Terminal for mutations.
 */
export enum EntitlementStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}
