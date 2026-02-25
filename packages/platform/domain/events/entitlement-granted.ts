import { BaseDomainEvent } from '@fittrack/core';
import type { EntitlementType } from '../enums/entitlement-type.js';

/**
 * Emitted when capabilities are granted (or re-granted) to a professional.
 *
 * `aggregateId` = entitlementId; `tenantId` = professionalProfileId.
 */
export class EntitlementGranted extends BaseDomainEvent {
  readonly eventType = 'EntitlementGranted';
  readonly aggregateType = 'PlatformEntitlement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      entitlements: EntitlementType[];
      expiresAt: string | null;
    }>,
  ) {
    super(1);
  }
}
