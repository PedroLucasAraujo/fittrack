import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted when a PlatformEntitlement reaches its `expiresAt` date.
 * Produced by the `ExpireEntitlement` use case (scheduler-triggered).
 */
export class EntitlementExpired extends BaseDomainEvent {
  readonly eventType = 'EntitlementExpired';
  readonly aggregateType = 'PlatformEntitlement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      expiredAt: string;
    }>,
  ) {
    super(1);
  }
}
