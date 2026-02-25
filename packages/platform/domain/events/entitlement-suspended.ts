import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted when a PlatformEntitlement is suspended.
 *
 * Triggered by `RiskStatusChanged(newStatus=BANNED)` (automated, SYSTEM actor)
 * or by a manual admin action.
 */
export class EntitlementSuspended extends BaseDomainEvent {
  readonly eventType = 'EntitlementSuspended';
  readonly aggregateType = 'PlatformEntitlement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      reason: string;
      /** Risk event ID or null for admin-initiated suspension. */
      evidenceRef: string | null;
    }>,
  ) {
    super(1);
  }
}
