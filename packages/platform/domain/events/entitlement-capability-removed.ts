import { BaseDomainEvent } from '@fittrack/core';
import type { EntitlementType } from '../enums/entitlement-type.js';

/**
 * Emitted when a single capability is removed from an existing entitlement.
 */
export class EntitlementCapabilityRemoved extends BaseDomainEvent {
  readonly eventType = 'EntitlementCapabilityRemoved';
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
