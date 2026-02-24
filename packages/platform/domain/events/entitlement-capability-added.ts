import { BaseDomainEvent } from '@fittrack/core';
import type { EntitlementType } from '../enums/entitlement-type.js';

/**
 * Emitted when a single capability is added to an existing entitlement.
 */
export class EntitlementCapabilityAdded extends BaseDomainEvent {
  readonly eventType = 'EntitlementCapabilityAdded';
  readonly aggregateType = 'PlatformEntitlement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      capability: EntitlementType;
      reason: string;
    }>,
  ) {
    super(1);
  }
}
