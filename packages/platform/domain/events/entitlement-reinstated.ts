import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted when a suspended PlatformEntitlement is reinstated.
 * Capabilities are restored from the preserved snapshot.
 */
export class EntitlementReinstated extends BaseDomainEvent {
  readonly eventType = 'EntitlementReinstated';
  readonly aggregateType = 'PlatformEntitlement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      reason: string;
    }>,
  ) {
    super(1);
  }
}
